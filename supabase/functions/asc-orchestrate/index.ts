/**
 * ASC Slice 3/4 — orchestration boundary.
 *
 * Single endpoint. Strict scope:
 *   role === "interviewer"  → step in {1, 2, 3, 4}
 *   role === "gap-finder"   → step in {3, 4} (advisory only)
 *
 * Everything else (logic architect, script writer, explainer, readiness,
 * fork, publish) is intentionally rejected with 400 so future roles cannot
 * be silently invoked through this boundary before they are designed.
 *
 * No DB writes. Tool-calling forces schema-constrained output; the tool
 * arguments are re-validated client-side before any reducer dispatch.
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

const INTERVIEWER_STEPS = new Set([1, 2, 3, 4]);
const GAP_FINDER_STEPS = new Set([3, 4]);

const ALL_TARGET_FIELDS = [
  // Step 1
  "business.description",
  "business.industryPresetId",
  "business.hours",
  "business.callerPersonas",
  "business.promisesToAvoid",
  // Step 2
  "purpose.primaryOutcome",
  "purpose.secondaryOutcome",
  "purpose.blockingOutcomes",
  "purpose.sharedAcrossClients",
  // Step 3
  "callerReasons.add",
  // Step 4
  "callerReason.requiredCapture",
  "callerReason.opener",
  "callerReason.escalation",
  "callerReason.variants.afterHours",
  "callerReason.variants.voicemail",
  "callerReason.branching.add",
] as const;

const STEP_FIELDS: Record<1 | 2 | 3 | 4, string[]> = {
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
  3: ["callerReasons.add"],
  4: [
    "callerReason.requiredCapture",
    "callerReason.opener",
    "callerReason.escalation",
    "callerReason.variants.afterHours",
    "callerReason.variants.voicemail",
    "callerReason.branching.add",
  ],
};

const GAP_KINDS = [
  "missing_handling",
  "escalation_no_destination",
  "implied_capture_missing",
  "after_hours_no_variant",
  "duplicate_reasons",
] as const;

const INTERVIEWER_SYSTEM_PROMPT = `You are the ASC Interviewer.

ROLE
- You ask one focused next question at a time about the user's phone-handling campaign.
- Scope: Steps 1–4 only.
    Step 1 — Business context
    Step 2 — Campaign purpose
    Step 3 — Caller types (propose generic, business-grounded caller reasons via callerReasons.add)
    Step 4 — Per-reason handling (required info, opener, escalation, after-hours/voicemail variants, simple branch hints)
- You do NOT write the script, design the flow graph, propose dispositions/notifications, or anything past Step 4.

GROUNDING
- Use only: current step, prior user answers (in the request), workspace skin id if present.
- Never invent business facts, third-party brands, prices, hours, jurisdictions, or legal/compliance phrasing.
- Never make hard promises for the business ("we guarantee", "always", "instant"). When unsure, ask.

ADAPTIVE QUESTIONING
- Ask exactly one nextQuestion per turn, or set nextQuestion=null when the step is fully captured.
- Never re-ask a target in confirmedFields (Steps 1/2). Per-reason targets are repeatable but still ask one at a time.
- Inferred values go in proposedFields as confirmable chips; never silently commit.

PER-REASON RULES (Step 4)
- Per-reason targets (callerReason.*) MUST include reasonId referencing an existing reason in the snapshot.
- callerReason.branching.add carries only { trigger, outcome } simple hints — no nested branches, no IDs, no graph structure.
- callerReason.escalation values are objects { when, toRole }.

STEP 3 RULES
- Propose generic, business-grounded reasons via callerReasons.add (value is the label string).
- Do not propose a label whose normalized form duplicates an existing reason.

RESPONSE
- Always call the interviewer_response tool. Free-form replies are invalid.
- step must equal the request's step. targetField must be in the allowed enum.`;

const GAP_FINDER_SYSTEM_PROMPT = `You are the ASC Gap-finder.

ROLE
- Advisory only. You return soft recommendations about gaps in Steps 3–4. You do NOT write, mutate, or propose values for any field.
- Scope: Steps 3 and 4 only.

ALLOWED KINDS
- missing_handling, escalation_no_destination, implied_capture_missing, after_hours_no_variant, duplicate_reasons

RULES
- Each message under 240 characters. Reference real caller reason ids in reasonIds when applicable. Never invent ids.
- Do not propose values, third-party brand names, prices, jurisdictions, or named individuals.
- Nothing you return is blocking. Empty items[] is valid.

RESPONSE
- Always call the gap_finder_response tool. Free-form replies are invalid.`;

const INTERVIEWER_TOOL = {
  type: "function" as const,
  function: {
    name: "interviewer_response",
    description:
      "Return the next Interviewer turn for the ASC wizard. Always call this; never reply in free text.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        step: { type: "integer", enum: [1, 2, 3, 4] },
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
            reasonId: { type: "string" },
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
              reasonId: { type: "string" },
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

const GAP_FINDER_TOOL = {
  type: "function" as const,
  function: {
    name: "gap_finder_response",
    description:
      "Return advisory gap-finder items for the ASC wizard. Always call this; never reply in free text.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        step: { type: "integer", enum: [3, 4] },
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              kind: { type: "string", enum: GAP_KINDS },
              message: { type: "string", maxLength: 240 },
              reasonIds: { type: "array", items: { type: "string" } },
            },
            required: ["id", "kind", "message"],
          },
        },
      },
      required: ["step", "items"],
    },
  },
};

interface BaseRequest {
  role: "interviewer" | "gap-finder";
  step: 1 | 2 | 3 | 4;
  workspaceId: string;
  skinId?: string;
  draftInputSnapshot: Record<string, unknown>;
  confirmedFields?: string[];
  lastUserMessage?: string;
}

function validateRequest(raw: unknown): BaseRequest | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Body must be an object" };
  const r = raw as Record<string, unknown>;
  const role = r.role;
  if (role !== "interviewer" && role !== "gap-finder") {
    return {
      error: `Only role="interviewer" or "gap-finder" is supported (got ${JSON.stringify(role)})`,
    };
  }
  if (typeof r.step !== "number") {
    return { error: `step is required` };
  }
  if (role === "interviewer" && !INTERVIEWER_STEPS.has(r.step)) {
    return { error: `interviewer step must be 1..4 (got ${r.step})` };
  }
  if (role === "gap-finder" && !GAP_FINDER_STEPS.has(r.step)) {
    return { error: `gap-finder step must be 3 or 4 (got ${r.step})` };
  }
  if (typeof r.workspaceId !== "string" || r.workspaceId.length === 0) {
    return { error: "workspaceId is required" };
  }
  if (!r.draftInputSnapshot || typeof r.draftInputSnapshot !== "object") {
    return { error: "draftInputSnapshot is required" };
  }
  return {
    role,
    step: r.step as 1 | 2 | 3 | 4,
    workspaceId: r.workspaceId,
    skinId: typeof r.skinId === "string" ? r.skinId : undefined,
    draftInputSnapshot: r.draftInputSnapshot as Record<string, unknown>,
    confirmedFields: Array.isArray(r.confirmedFields)
      ? (r.confirmedFields.filter((s) => typeof s === "string") as string[])
      : [],
    lastUserMessage:
      typeof r.lastUserMessage === "string" ? r.lastUserMessage : undefined,
  };
}

function buildInterviewerUserMessage(req: BaseRequest): string {
  const allowed = STEP_FIELDS[req.step].join(", ");
  const snapshot = JSON.stringify(req.draftInputSnapshot, null, 2);
  const confirmed = req.confirmedFields?.length
    ? req.confirmedFields.join(", ")
    : "(none)";
  return [
    `Step: ${req.step}`,
    `Allowed target fields for this step: ${allowed}`,
    `Already-confirmed fields (do not re-ask): ${confirmed}`,
    `Workspace skin id: ${req.skinId ?? "(none)"}`,
    `Last user-typed message (may be empty): ${req.lastUserMessage ?? "(none)"}`,
    "",
    "Current draft input snapshot (JSON):",
    snapshot,
    "",
    "Reply by calling the interviewer_response tool exactly once.",
  ].join("\n");
}

function buildGapFinderUserMessage(req: BaseRequest): string {
  const snapshot = JSON.stringify(req.draftInputSnapshot, null, 2);
  return [
    `Step: ${req.step}`,
    `Workspace skin id: ${req.skinId ?? "(none)"}`,
    "",
    "Current draft input snapshot (JSON):",
    snapshot,
    "",
    "Return advisory recommendations only. Reply by calling the gap_finder_response tool exactly once.",
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

  const isInterviewer = validated.role === "interviewer";
  const systemPrompt = isInterviewer
    ? INTERVIEWER_SYSTEM_PROMPT
    : GAP_FINDER_SYSTEM_PROMPT;
  const userMessage = isInterviewer
    ? buildInterviewerUserMessage(validated)
    : buildGapFinderUserMessage(validated);
  const tool = isInterviewer ? INTERVIEWER_TOOL : GAP_FINDER_TOOL;
  const toolName = isInterviewer ? "interviewer_response" : "gap_finder_response";

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
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          tools: [tool],
          tool_choice: {
            type: "function",
            function: { name: toolName },
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
