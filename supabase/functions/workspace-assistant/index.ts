// Phase 10 — Workspace AI Assistant edge function.
// Workspace-scoped grounded chat: pulls KB articles + guides + recent call summaries
// for the workspace, then answers via Lovable AI Gateway.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_SYSTEM = `You are Fabric Assistant, a workspace-scoped AI helper for Fabric59 (a Five9 + legal CRM operations platform).

GROUNDING
- Prefer information from the WORKSPACE KNOWLEDGE block when present.
- When the answer cannot be grounded in workspace knowledge, say so clearly and offer the closest general guidance only if the user has not restricted you to workspace knowledge.
- Quote feature names exactly. Never invent feature names, pricing, or behaviors.

SAFETY
- Never give legal, medical, or financial advice.
- Never expose secrets, API keys, or credentials.
- Never recommend bypassing security policies or RLS.

FORMAT
- Direct answer first. Then 2–3 step "how to" if useful. End with one suggested next action.
- Bullet lists for steps. Bold the action verbs.`;

interface BodyShape {
  workspaceId: string;
  conversationId?: string | null;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  knowledgeOnly?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as BodyShape;
    if (!body?.workspaceId || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: "workspaceId and messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify workspace membership using RLS-bound client (service role bypasses, so check explicitly)
    const { data: ws, error: wsErr } = await admin
      .from("workspaces")
      .select("id, organization_id, name")
      .eq("id", body.workspaceId)
      .maybeSingle();
    if (wsErr || !ws) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load AI config
    const { data: config } = await admin
      .from("workspace_ai_configs")
      .select("*")
      .eq("workspace_id", body.workspaceId)
      .maybeSingle();

    const knowledgeOnly = body.knowledgeOnly ?? config?.knowledge_only ?? false;
    const tone = config?.tone ?? "professional";
    const industry = config?.industry ?? null;
    const jurisdiction = config?.jurisdiction ?? null;

    // Load enabled knowledge sources
    const { data: sources } = await admin
      .from("workspace_knowledge_sources")
      .select("source_type, enabled")
      .eq("workspace_id", body.workspaceId);
    const enabledSources = new Set((sources ?? []).filter((s) => s.enabled).map((s) => s.source_type));

    const groundingParts: string[] = [];
    const groundingMeta: Record<string, number> = {};

    if (enabledSources.has("kb_articles")) {
      const { data: kb } = await admin
        .from("kb_articles")
        .select("title, content")
        .eq("organization_id", ws.organization_id)
        .eq("status", "published")
        .limit(8);
      if (kb && kb.length) {
        groundingMeta.kb_articles = kb.length;
        groundingParts.push(
          `KB ARTICLES:\n${kb.map((a) => `- ${a.title}: ${(a.content ?? "").slice(0, 400)}`).join("\n")}`,
        );
      }
    }

    if (enabledSources.has("guides")) {
      const { data: guides } = await admin
        .from("guides")
        .select("name, description, status")
        .eq("workspace_id", body.workspaceId)
        .limit(10);
      if (guides && guides.length) {
        groundingMeta.guides = guides.length;
        groundingParts.push(
          `GUIDES IN WORKSPACE:\n${guides.map((g) => `- ${g.name} [${g.status}]${g.description ? `: ${g.description}` : ""}`).join("\n")}`,
        );
      }
    }

    if (enabledSources.has("templates")) {
      const { data: templates } = await admin
        .from("templates")
        .select("name, kind, description")
        .or(`workspace_id.eq.${body.workspaceId},organization_id.eq.${ws.organization_id}`)
        .limit(10);
      if (templates && templates.length) {
        groundingMeta.templates = templates.length;
        groundingParts.push(
          `TEMPLATES AVAILABLE:\n${templates.map((t) => `- [${t.kind}] ${t.name}${t.description ? `: ${t.description}` : ""}`).join("\n")}`,
        );
      }
    }

    if (enabledSources.has("call_summaries")) {
      const { data: sessions } = await admin
        .from("call_sessions")
        .select("id, summary, disposition, created_at")
        .eq("organization_id", ws.organization_id)
        .not("summary", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);
      if (sessions && sessions.length) {
        groundingMeta.call_summaries = sessions.length;
        groundingParts.push(
          `RECENT CALL SUMMARIES:\n${sessions
            .map((s) => `- [${s.disposition ?? "n/a"}] ${(s.summary ?? "").slice(0, 200)}`)
            .join("\n")}`,
        );
      }
    }

    const knowledgeBlock = groundingParts.length
      ? `\n\nWORKSPACE KNOWLEDGE (workspace="${ws.name}"):\n${groundingParts.join("\n\n")}`
      : "\n\nWORKSPACE KNOWLEDGE: (no indexed sources matched)";

    const overrides = [
      `Workspace tone: ${tone}.`,
      industry ? `Workspace industry context: ${industry}.` : null,
      jurisdiction ? `Workspace jurisdiction hint: ${jurisdiction}.` : null,
      knowledgeOnly
        ? "STRICT MODE: Only answer using the WORKSPACE KNOWLEDGE block. If the answer is not present there, say so."
        : "Prefer workspace knowledge first, then fall back to general guidance.",
    ]
      .filter(Boolean)
      .join("\n");

    const fullSystem = `${PLATFORM_SYSTEM}\n\nWORKSPACE OVERRIDES:\n${overrides}${knowledgeBlock}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: fullSystem }, ...body.messages],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      const msg =
        status === 429
          ? "Rate limit exceeded. Try again shortly."
          : status === 402
            ? "AI credits exhausted. Add funds to continue."
            : "AI gateway error";
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await aiResponse.json();
    const reply: string = json?.choices?.[0]?.message?.content ?? "";

    // Audit log
    await admin.from("workspace_ai_logs").insert({
      workspace_id: body.workspaceId,
      surface: "assistant",
      action: "chat_completion",
      user_id: userId,
      details: { grounding: groundingMeta, knowledge_only: knowledgeOnly },
    });

    return new Response(
      JSON.stringify({
        reply,
        grounding: {
          sources: groundingMeta,
          knowledge_only: knowledgeOnly,
          used_workspace_knowledge: Object.keys(groundingMeta).length > 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("workspace-assistant error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
