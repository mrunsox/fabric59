import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { node_id, node_type, context } = await req.json();

    // Use Lovable AI via the supported model endpoint
    const aiUrl = Deno.env.get("AI_GATEWAY_URL") || `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-proxy`;
    
    const prompt = `You are an AI assistant for a contact center agent. The agent is currently on a call and navigating a script.

Current script node:
- Node ID: ${node_id || "unknown"}
- Node Type: ${node_type || "unknown"}
- Context: ${JSON.stringify(context || {})}

Based on this context, suggest 3 brief next actions the agent should consider. Each suggestion should have:
- label: A short action label (3-5 words)
- description: One sentence explaining why
- confidence: A number 0-1 indicating relevance

Return ONLY valid JSON array of suggestions.`;

    // Fallback suggestions if AI call fails
    const fallbackSuggestions = [
      { label: "Ask qualifying question", description: "Gather more details about the caller's needs before proceeding", confidence: 0.85 },
      { label: "Transfer to specialist", description: "Route to the appropriate department based on caller context", confidence: 0.72 },
      { label: "Schedule follow-up", description: "Book a callback for further discussion on this matter", confidence: 0.65 },
    ];

    let suggestions = fallbackSuggestions;

    try {
      // Attempt to use the AI model
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            suggestions = parsed.slice(0, 3);
          }
        }
      }
    } catch {
      // Use fallback suggestions
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
