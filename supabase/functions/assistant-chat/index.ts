import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Fabric Assistant, the in-app helper for Fabric59, a Five9 integration platform.

GROUNDING RULES
- Only answer questions that can be answered from the Knowledge Base context provided in the user message.
- If the answer is not in the context, say: "I do not have information on that yet. Try the Knowledge Base or contact support."
- Never invent feature names, pricing, or behaviors that are not in the context.
- Quote the exact feature name when referring to a Fabric59 feature.

TONE
- Friendly, concise, and direct. Three short paragraphs maximum.
- Use plain language. Avoid jargon unless the user is clearly technical.
- Bullet lists for steps. Bold the action verbs.

SAFETY
- Never provide legal advice, medical advice, or financial advice.
- Never expose secrets, API keys, passwords, or sensitive credentials.
- Never recommend bypassing security policies, RLS rules, or auth flows.
- If asked to do something destructive, ask the user to confirm first.

FORMAT
- Start with the direct answer in the first sentence.
- Then give a 2 or 3 step "how to" if relevant.
- End with a single follow-up suggestion the user could try next.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { messages, knowledgeContext, assistantName, mode } = await req.json();
    const isGuidance = mode === "guidance";

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextBlock = knowledgeContext
      ? (isGuidance
          ? `\n\nCURRENT CONTEXT:\n${knowledgeContext}\n\nUse the context above to give task-aware, page-specific guidance. Recommend the next concrete action and explain blockers in plain English.`
          : `\n\nKNOWLEDGE BASE CONTEXT:\n${knowledgeContext}`)
      : "";
    const namedSystem = assistantName
      ? SYSTEM_PROMPT.replace("Fabric Assistant", assistantName)
      : SYSTEM_PROMPT;
    const fullSystem = `${namedSystem}${contextBlock}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: fullSystem }, ...messages],
        stream: !isGuidance,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds to continue." }), {
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

    if (isGuidance) {
      const json = await aiResponse.json();
      const reply = json?.choices?.[0]?.message?.content ?? "";
      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("assistant-chat error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
