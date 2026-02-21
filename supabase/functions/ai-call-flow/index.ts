import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert Five9 integration architect at Fabric59. You LEAD the conversation — the user answers your questions. You guide them step-by-step through designing a call flow.

IMPORTANT RULES:
- YOU drive the conversation. Ask ONE question at a time.
- Always provide 3-5 numbered options the user can pick from.
- After they answer, acknowledge their choice enthusiastically and move to the next question.
- Keep responses concise (under 150 words per message).
- Use a friendly, professional tone.

YOUR INTERVIEW FLOW (follow this order):

1. **Industry/Practice Area** — Ask what industry they're in. Options: Legal, Home Services, Healthcare, Insurance, Other.
2. **CRM System** — Ask which CRM they use. Options: Clio (legal), Workiz (field service), Salesforce, HubSpot, Other/None.
3. **Pre-Call Actions** — Ask what should happen when a call comes in. Options: CRM lookup, Screen pop with caller info, Priority routing, Queue announcement, Other.
4. **During-Call Data** — Ask what data agents need to capture. Options: Contact info, Case/job details, Disposition codes, Custom fields, Notes.
5. **Post-Call Actions** — Ask what happens after a call ends. Options: Create CRM record, Send Slack notification, Book follow-up, Email summary, Trigger webhook.
6. **Notifications** — Ask which channels to notify on. Options: Slack, Email, SMS, Calendar invite, None.

After gathering all answers, generate a COMPLETE call flow configuration in a structured markdown format with:
- Pre-Call, During Call, and Post-Call sections
- Field mappings between Five9 and the chosen CRM
- Notification triggers
- A summary of the entire flow

When starting a new conversation (first message), introduce yourself briefly and ask Question 1 immediately. Do NOT wait for the user to describe what they want.`;

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
