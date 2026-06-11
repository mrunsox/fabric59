import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SAFETY_PREAMBLE = `IMPORTANT RULES:
- Never provide legal advice or case strategy.
- Never recommend bypassing security policies or RLS rules.
- Never expose sensitive fields (SSN, passwords, tokens).
- Respect provider capability limits — do not suggest unsupported actions.
- Be factual and operational. Output structured data when possible.
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, ...payload } = await req.json();

    switch (action) {
      case "executePrompt": {
        const { prompt_key, context, organization_id } = payload;

        // Load template
        let q = supabaseAdmin
          .from("legal_connect_prompt_templates")
          .select("*")
          .eq("prompt_key", prompt_key)
          .eq("enabled", true);

        // Try org-specific first, then global
        const { data: templates } = await q;
        const template = templates?.find((t: any) => t.organization_id === organization_id)
          ?? templates?.find((t: any) => t.organization_id === null);

        if (!template) {
          return new Response(JSON.stringify({ error: `Prompt template not found: ${prompt_key}` }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const systemPrompt = `${SAFETY_PREAMBLE}\n\n${(template as any).system_prompt}`;
        const userMessage = typeof context === "string" ? context : JSON.stringify(context, null, 2);

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
          }),
        });

        if (!aiResponse.ok) {
          if (aiResponse.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (aiResponse.status === 402) {
            return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const errText = await aiResponse.text();
          console.error("AI gateway error:", aiResponse.status, errText);
          return new Response(JSON.stringify({ error: "AI gateway error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const aiResult = await aiResponse.json();
        const content = aiResult.choices?.[0]?.message?.content ?? "";

        // Log AI session if org specified
        if (organization_id && payload.client_id) {
          await supabaseAdmin.from("legal_connect_ai_sessions").insert({
            organization_id,
            client_id: payload.client_id,
            session_type: prompt_key,
            input_context: context,
            output_markdown: content,
          });
        }

        return new Response(JSON.stringify({ data: { content, template_title: (template as any).title, prompt_key } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "listTemplates": {
        const { organization_id, role, category } = payload;
        let q = supabaseAdmin
          .from("legal_connect_prompt_templates")
          .select("id, prompt_key, role, category, title, description, enabled, version, created_at")
          .eq("enabled", true);

        if (role) q = q.eq("role", role);
        if (category) q = q.eq("category", category);

        const { data, error } = await q.order("category").order("title");
        if (error) throw error;

        // Filter to global + org-specific
        const filtered = (data ?? []).filter((t: any) =>
          t.organization_id === null || t.organization_id === organization_id
        );

        return new Response(JSON.stringify({ data: filtered }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "previewPrompt": {
        const { prompt_key, context, organization_id } = payload;

        const { data: templates } = await supabaseAdmin
          .from("legal_connect_prompt_templates")
          .select("*")
          .eq("prompt_key", prompt_key)
          .eq("enabled", true);

        const template = templates?.find((t: any) => t.organization_id === organization_id)
          ?? templates?.find((t: any) => t.organization_id === null);

        if (!template) {
          return new Response(JSON.stringify({ error: `Template not found: ${prompt_key}` }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          data: {
            system_prompt: `${SAFETY_PREAMBLE}\n\n${(template as any).system_prompt}`,
            user_message: typeof context === "string" ? context : JSON.stringify(context, null, 2),
            template: {
              title: (template as any).title,
              category: (template as any).category,
              role: (template as any).role,
              input_schema: (template as any).input_schema,
              output_schema: (template as any).output_schema,
            },
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "explainExample": {
        const { example_id } = payload;

        const { data: example, error: exErr } = await supabaseAdmin
          .from("legal_connect_examples")
          .select("*")
          .eq("id", example_id)
          .single();
        if (exErr) throw exErr;

        const userMessage = `Explain this integration example in plain language for an admin who needs to understand how it works:

Title: ${(example as any).title}
Description: ${(example as any).description}
Provider: ${(example as any).provider}
Category: ${(example as any).category}

Raw Payload: ${JSON.stringify((example as any).raw_payload)}
Normalized Event: ${JSON.stringify((example as any).normalized_event)}
Policy Decision: ${JSON.stringify((example as any).policy_decision)}
Sync Jobs: ${JSON.stringify((example as any).sync_jobs_emitted)}
Review Triggers: ${JSON.stringify((example as any).review_triggers)}
${(example as any).capability_check ? `Capability Check: ${JSON.stringify((example as any).capability_check)}` : ""}
${(example as any).five9_input ? `Five9 Input: ${JSON.stringify((example as any).five9_input)}` : ""}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: `${SAFETY_PREAMBLE}\nYou are a Fabric59 Legal Connect integration expert. Explain integration examples clearly for admins. Use bullet points and clear language. Never provide legal advice.` },
              { role: "user", content: userMessage },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const status = aiResponse.status;
          if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const aiResult = await aiResponse.json();
        const content = aiResult.choices?.[0]?.message?.content ?? "";

        return new Response(JSON.stringify({ data: { explanation: content, example_title: (example as any).title } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("AI function error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
