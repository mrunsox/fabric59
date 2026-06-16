/**
 * ASC Slice 3 — orchestration boundary (Interviewer role only).
 *
 * Single endpoint. Strict scope:
 *   role === "interviewer"
 *   step === 1 || step === 2
 *
 * Everything else (gap-finder, logic architect, script writer, explainer,
 * readiness, fork, publish) is intentionally rejected with 400 so future
 * roles cannot be silently invoked through this boundary before they are
 * designed.
 *
 * No DB writes. No reuse of assistant-chat. The Lovable AI Gateway is
 * called directly with tool-calling so the response is schema-constrained;
 * the tool arguments are re-validated client-side before any reducer
 * dispatch.
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

const ALLOWED_STEPS = new Set([1, 2]);

const ALL_TARGET_FIELDS = [
  "business.description",
  "business.industryPresetId",
  "business.hours",
  "business.callerPersonas",
  "business.promisesToAvoid",
  "purpose.primaryOutcome",
  "purpose.secondaryOutcome",
  "purpose.blockingOutcomes",
  "purpose.sharedAcrossClients",
] as const;

const STEP_FIELDS: Record<1 | 2, string[]> = {
  1: [
    "business.description",
    "business.industryPresetId",
    "business.hours",
    "business.callerPersonas",
    "business.promisesToAvoid",
  ],
  2: [
    "purpose.primaryOutcome",
    "purpose.secondaryOutcome",
    "purpose.blockingOutcomes",
    "purpose.sharedAcrossClients",
  ],
};

const SYSTEM_PROMPT = `You are the ASC Interviewer.

ROLE
- You ask one focused next question at a time to help the user describe their phone-handling campaign.
- You are scoped strictly to Steps 1 and 2 of the wizard:
    Step 1 — Business context (description, industry, hours, caller personas, promises to avoid)
    Step 2 — Campaign purpose (primary outcome, secondary outcome, blocking outcomes, shared-across-clients)
- You do NOT write the script, design call flow, propose dispositions, draft notifications, or anything past Step 2.

GROUNDING RULES
- Use only: the current step, the user's prior answers, and the workspace skin id if given.
- Do NOT invent business facts, third-party brand names, prices, hours, jurisdictions, or compliance/legal phrasing.
- Do NOT make hard promises on the business's behalf ("we guarantee", "always", "instant").
- If unsure, ask a question rather than infer.

ADAPTIVE QUESTIONING
- Ask exactly one nextQuestion per turn, or set nextQuestion to null when the step's required information is fully captured.
- Do NOT re-ask a target field that appears in confirmedFields. Pick a different unanswered field, or set nextQuestion to null.
- If you can infer a likely value with reasonable confidence, emit it under proposedFields as a confirmable chip; never silently commit it.
- Keep prompts under 240 characters. Be concrete and plain.

RESPONSE FORMAT
- You MUST respond using the interviewer_response tool. Free-form text replies are invalid.
- step must equal the request's step.
- nextQuestion.targetField must be one of the allowed enum values for the current step.
- proposedFields[*].targetField must be from the allowed enum.
- confirmedFieldsAcknowledged should echo back the fields you treated as already-answered.`;

const RESPONSE_TOOL = {
  type: "function" as const,
  function: {
    name: "interviewer_response",
    description:
      "Return the next Interviewer turn for the ASC wizard. Always call this; never reply in free text.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        step: { type: "integer", enum: [1, 2] },
        nextQuestion: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            prompt: { type: "string", maxLength: 480 },
            targetField: { type: "string", enum: ALL_TARGET_FIELDS },
            inputKind: {
              type: "string",
              enum: ["text", "select", "chips", "boolean"],
            },
            options: { type: "array", items: { type: "string" } },
          },
          required: ["id", "prompt", "targetField", "inputKind"],
        },
        proposedFields: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              targetField: { type: "string", enum: ALL_TARGET_FIELDS },
              value: {},
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              rationale: { type: "string" },
            },
            required: ["targetField", "value", "confidence", "rationale"],
          },
        },
        confirmedFieldsAcknowledged: {
          type: "array",
          items: { type: "string", enum: ALL_TARGET_FIELDS },
        },
      },
      required: [
        "step",
        "nextQuestion",
        "proposedFields",
        "confirmedFieldsAcknowledged",
      ],
    },
  },
};

interface OrchestrateRequest {
  role: "interviewer";
  step: 1 | 2;
  workspaceId: string;
  skinId?: string;
  draftInputSnapshot: {
    business?: Record<string, unknown>;
    purpose?: Record<string, unknown>;
  };
  confirmedFields?: string[];
  lastUserMessage?: string;
}

function validateRequest(raw: unknown): OrchestrateRequest | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Body must be an object" };
  const r = raw as Record<string, unknown>;
  if (r.role !== "interviewer") {
    return {
      error: `Only role="interviewer" is supported in this slice (got ${JSON.stringify(r.role)})`,
    };
  }
  if (typeof r.step !== "number" || !ALLOWED_STEPS.has(r.step)) {
    return { error: `step must be 1 or 2 (got ${JSON.stringify(r.step)})` };
  }
  if (typeof r.workspaceId !== "string" || r.workspaceId.length === 0) {
    return { error: "workspaceId is required" };
  }
  if (
    !r.draftInputSnapshot ||
    typeof r.draftInputSnapshot !== "object"
  ) {
    return { error: "draftInputSnapshot is required" };
  }
  return {
    role: "interviewer",
    step: r.step as 1 | 2,
    workspaceId: r.workspaceId,
    skinId: typeof r.skinId === "string" ? r.skinId : undefined,
    draftInputSnapshot: r.draftInputSnapshot as OrchestrateRequest["draftInputSnapshot"],
    confirmedFields: Array.isArray(r.confirmedFields)
      ? (r.confirmedFields.filter((s) => typeof s === "string") as string[])
      : [],
    lastUserMessage:
      typeof r.lastUserMessage === "string" ? r.lastUserMessage : undefined,
  };
}

function buildUserMessage(req: OrchestrateRequest): string {
  const allowed = STEP_FIELDS[req.step].join(", ");
  const snapshot = JSON.stringify(req.draftInputSnapshot, null, 2);
  const confirmed = req.confirmedFields?.length
    ? req.confirmedFields.join(", ")
    : "(none)";
  const skin = req.skinId ?? "(none)";
  const last = req.lastUserMessage ?? "(none)";
  return [
    `Step: ${req.step}`,
    `Allowed target fields for this step: ${allowed}`,
    `Already-confirmed fields (do not re-ask): ${confirmed}`,
    `Workspace skin id: ${skin}`,
    `Last user-typed message (may be empty): ${last}`,
    "",
    "Current draft input snapshot (JSON):",
    snapshot,
    "",
    "Reply by calling the interviewer_response tool exactly once.",
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return jsonResponse(
      { ok: false, code: "upstream_error", message: "AI gateway not configured" },
      500,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, code: "bad_request", message: "Invalid JSON body" }, 400);
  }

  const validated = validateRequest(body);
  if ("error" in validated) {
    return jsonResponse({ ok: false, code: "bad_request", message: validated.error }, 400);
  }

  try {
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserMessage(validated) },
          ],
          tools: [RESPONSE_TOOL],
          tool_choice: {
            type: "function",
            function: { name: "interviewer_response" },
          },
        }),
      },
    );

    if (aiResponse.status === 429) {
      await aiResponse.text();
      return jsonResponse(
        { ok: false, code: "rate_limited", message: "Rate limit exceeded. Retry shortly." },
        429,
      );
    }
    if (aiResponse.status === 402) {
      await aiResponse.text();
      return jsonResponse(
        { ok: false, code: "credits_exhausted", message: "AI credits exhausted." },
        402,
      );
    }
    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => "");
      console.error("asc-orchestrate upstream error:", aiResponse.status, errText);
      return jsonResponse(
        { ok: false, code: "upstream_error", message: "AI gateway error" },
        502,
      );
    }

    const json = await aiResponse.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    const rawArgs = toolCall?.function?.arguments;
    if (typeof rawArgs !== "string") {
      return jsonResponse(
        { ok: false, code: "schema_invalid", message: "Model did not call the response tool." },
        502,
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawArgs);
    } catch {
      return jsonResponse(
        { ok: false, code: "schema_invalid", message: "Tool arguments were not valid JSON." },
        502,
      );
    }

    // Server-side surface validation. Strict re-validation happens on the
    // client, but obviously broken shapes short-circuit here.
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as { step?: unknown }).step !== validated.step
    ) {
      return jsonResponse(
        { ok: false, code: "schema_invalid", message: "Response step mismatch." },
        502,
      );
    }

    return jsonResponse({ ok: true, response: parsed }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("asc-orchestrate error:", message);
    return jsonResponse({ ok: false, code: "upstream_error", message }, 500);
  }
});
