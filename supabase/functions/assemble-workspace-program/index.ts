// Phase 11 — Workspace Guide AI Assembler.
//
// Takes a chunk of source text (pasted, or later: parsed from an uploaded
// document) describing a client business and returns a structured draft of
// the full call-handling program: guide sections, dispositions, call flow,
// ANI/DNIS routing, variables, post-call automations.
//
// The draft is returned to the client for review; nothing is written to
// guide_versions / campaigns automatically.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireUser } from "../_shared/auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SYSTEM_PROMPT = `You are the Fabric59 Workspace Program Assembler.

A user has dropped in source material describing a client business and how their incoming phone calls should be handled. Draft a complete call-handling program for that business as a single JSON object matching the schema. Never include prose outside the JSON.

Parts:
1. guideSections[] — kinds: greeting, business_overview, service_descriptions, specialties, hours, callback_policy, escalation_contacts, special_handling, faqs, exceptions, internal_notes, custom. Each: { kind, label, description?, visibility: "agent"|"internal", required: boolean, fields: [{ label, value }] }.
2. dispositions[] — { code (lower_snake_case), label, urgency: "normal"|"high"|"low", postCallAction: "email"|"crm_push"|"callback"|"none", notes? }. Always include at least a primary success disposition plus "Wrong Number", "Marketing", "Caller hung up".
3. callFlow — { nodes: [{ id, kind: "greeting"|"branch"|"capture"|"info"|"disposition"|"end", title, body?, captureKey?, branchOptions?: [{ label, gotoId }] }], edges: [{ fromId, toId, label? }] }. Under 15 nodes. Start greeting, end disposition→end.
4. routing — { ani: [{ pattern, action: "block"|"vip"|"route", note? }], dnis: [{ number, label, routeTo }] }. Empty arrays if nothing suggested.
5. variables[] — { key, label, type: "text"|"phone"|"email"|"long_text"|"select", required }.
6. postCallSuggestions[] — { dispositionCode, channel: "email"|"slack"|"crm", template, recipientHint }.

Rules: don't invent phone numbers, emails, or names not present in source — use placeholders like {{client_email}}. Professional, warm, brief tone. Total items reasonable (under ~40 combined). Quality over volume.`;

interface RequestBody {
  workspaceId: string;
  sourceText: string;
  sourceFilename?: string;
}

function badRequest(msg: string) {
  return jsonResponse({ error: msg }, 400);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body?.workspaceId || typeof body.workspaceId !== "string") {
    return badRequest("workspaceId is required");
  }
  if (!body?.sourceText || typeof body.sourceText !== "string") {
    return badRequest("sourceText is required");
  }
  if (body.sourceText.length > 60_000) {
    return badRequest("sourceText too large (60k char max)");
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "Server is missing LOVABLE_API_KEY" }, 500);
  }

  const userPrompt = `Source material${body.sourceFilename ? ` (filename: ${body.sourceFilename})` : ""}:\n\n${body.sourceText}`;

  let aiResponse: Response;
  try {
    aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });
  } catch (err) {
    console.error("[assemble-workspace-program] gateway fetch failed", err);
    return jsonResponse({ error: "AI gateway unreachable" }, 502);
  }

  if (aiResponse.status === 429) {
    return jsonResponse(
      { error: "Rate limited — please try again in a moment." },
      429,
    );
  }
  if (aiResponse.status === 402) {
    return jsonResponse(
      { error: "Workspace credits exhausted. Add credits in Settings → Plans & credits." },
      402,
    );
  }
  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    console.error("[assemble-workspace-program] gateway error", aiResponse.status, errText);
    return jsonResponse({ error: "AI generation failed" }, 502);
  }

  const aiJson = await aiResponse.json();
  const content = aiJson?.choices?.[0]?.message?.content;
  if (!content) {
    return jsonResponse({ error: "AI returned empty content" }, 502);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    console.error("[assemble-workspace-program] JSON parse failed", err, content);
    return jsonResponse({ error: "AI returned invalid JSON" }, 502);
  }

  return jsonResponse({
    workspaceId: body.workspaceId,
    sourceFilename: body.sourceFilename ?? null,
    draft: parsed,
    generatedAt: new Date().toISOString(),
  });
});
