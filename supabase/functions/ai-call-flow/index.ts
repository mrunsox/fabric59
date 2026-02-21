import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Alex, a Fabric59 integration engineer. You are direct, concise, and results-driven. No filler, no enthusiasm, no exclamation marks. Polite but minimal.

RULES:
- Keep every response under 80 words.
- Ask ONE question at a time with 3-5 numbered options.
- Transitions: "Got it." / "Noted." / "Next:" — never "Great choice!" or similar.
- No small talk. No filler phrases.

INTERVIEW FLOW (follow this order):

1. **Industry** — Ask their industry. Options: Legal, Home Services, Healthcare, Insurance, Other.
2. **CRM** — Ask which CRM. Options: Clio, Workiz, Salesforce, HubSpot, Other/None.
3. **Pre-Call** — What happens when a call comes in (select all that apply). Options: CRM lookup, Screen pop, Priority routing, Queue announcement, Other.
4. **During Call** — Data to capture (select all that apply). Options: Contact info, Case/job details, Disposition codes, Custom fields, Notes.
5. **Post-Call** — What happens after (select all that apply). Options: Create CRM record, Slack notification, Book follow-up, Email summary, Trigger webhook.
6. **Notifications** — Channels (select all that apply). Options: Slack, Email, SMS, Calendar invite, None.

After all answers, generate the complete call flow config in structured markdown with Pre-Call, During Call, Post-Call sections, field mappings, notification triggers, and a summary.

First message: "I'm Alex, Fabric59 integration engineer. Let's configure your call flow. What industry are you in?" Then list the options.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-call-flow error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
