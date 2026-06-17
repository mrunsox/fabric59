/**
 * ASC Slice 3/4/5 — orchestration boundary.
 *
 * Single endpoint. Strict scope:
 *   role === "interviewer"     → step in {1, 2, 3, 4}
 *   role === "gap-finder"      → step in {3, 4} (advisory only)
 *   role === "logic-architect" → step in {5, 6, 7} (proposals only)
 *
 * Everything else (script writer, explainer, readiness, fork, publish) is
 * rejected with 400. No DB writes. Tool-calling forces schema-constrained
 * output; the tool arguments are re-validated client-side before any
 * reducer dispatch.
 */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

const INTERVIEWER_STEPS = new Set([1, 2, 3, 4]);
const GAP_FINDER_STEPS = new Set([3, 4]);
const LOGIC_ARCHITECT_STEPS = new Set([5, 6, 7]);
const LOGIC_ARCHITECT_COMPILE_STEPS = new Set([8]);

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

// ── Logic Architect (Slice 5) ─────────────────────────────────────────────
const LA_TARGET_FIELDS = [
  "outcomes.add",
  "notifications.add",
  "destination.kind",
  "destination.externalUrl",
  "destination.deepLinkTemplate",
  "destination.openMode",
  "launch.slugCandidates",
] as const;

const LOGIC_ARCHITECT_SYSTEM_PROMPT = `You are the ASC Logic Architect.

ROLE
- Translate captured business + caller-reason context into proposed
  outcomes (Step 5), notification rules (Step 6), and destination + launch
  candidates (Step 7). All output is proposal-only.
- Scope: Steps 5, 6, 7 only.

GROUNDING (hard rules)
- Use only: draftInputSnapshot and the supplied grounding fields
  (workspaceOutcomeCatalog, workspaceNotificationDestinations,
  destinationContext, takenSlugs).
- Never invent third-party brand names, prices, jurisdictions, phone numbers,
  emails, channel handles, integration names, or URLs that are not in the
  supplied grounding.
- Never claim a slug is unique. Slug uniqueness is decided client-side.

STEP 5 — Outcomes
- At most 6 outcomes. Each: { id, label, kind, note? }.
- The stable identifier is the label. \`kind\` is a coarse PROPOSAL-LOCAL hint
  (success, qualified, unqualified, callback, voicemail, escalated, blocked,
  other). Do NOT treat \`kind\` as a canonical taxonomy.
- Prefer labels from workspaceOutcomeCatalog. Don't duplicate (normalized
  compare) outcomes already in draftInputSnapshot.outcomesDraftEdits.

STEP 6 — Notifications
- At most 6 rules. Each: { id, outcomeRef, channelRef, audienceRef?, urgency, note? }.
- outcomeRef MUST reference an outcome label already in
  draftInputSnapshot.outcomesDraftEdits. channelRef MUST reference an entry
  in workspaceNotificationDestinations.
- If workspaceNotificationDestinations is empty, return proposals=[] and one
  advisory explaining the gap.

STEP 7 — Destination + launch
- Destination proposals are scoped subfields:
    destination.kind            (always groundable)
    destination.externalUrl     (only if URL appears in destinationContext)
    destination.deepLinkTemplate (only if template appears in destinationContext)
    destination.openMode        (always groundable)
- Launch proposals are launch.slugCandidates (string[]). Never write a single
  "slug". Candidates: short, kebab-case, ASCII.
- If destinationContext is empty, prefer destination.kind="internal_runner"
  and move any external suggestions to advisories[].

RESPONSE
- Always call the logic_architect_response tool exactly once. Free-form
  replies are invalid. step MUST equal the request's step.`;

const LOGIC_ARCHITECT_TOOL = {
  type: "function" as const,
  function: {
    name: "logic_architect_response",
    description:
      "Return the next Logic Architect proposal set for the ASC wizard. Always call this; never reply in free text.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        step: { type: "integer", enum: [5, 6, 7] },
        proposals: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              targetField: { type: "string", enum: LA_TARGET_FIELDS },
              value: {},
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              rationale: { type: "string" },
            },
            required: ["id", "targetField", "value", "confidence", "rationale"],
          },
        },
        advisories: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              message: { type: "string", maxLength: 240 },
            },
            required: ["message"],
          },
        },
      },
      required: ["step", "proposals", "advisories"],
    },
  },
};

// ── Logic Architect compile (Slice 6 — Step 8) ────────────────────────────
const LOGIC_ARCHITECT_COMPILE_SYSTEM_PROMPT = `You are the ASC Logic Architect, COMPILE mode.

ROLE
- Step 8 ONLY. Translate the confirmed Step 1–7 inputs into a single ASC-local
  draft object. ASC-local means: this is NOT a canonical campaign or flow
  schema; do not invent runtime semantics. A separate fork step (later)
  translates this draft into canonical entities.
- All output is a draft. Manual user input from Steps 1–7 remains the source
  of truth.

GROUNDING (hard rules)
- Use only: draftInputSnapshot and grounding (workspaceOutcomeCatalog,
  workspaceNotificationDestinations, destinationContext, takenSlugs).
- Never invent third-party brand names, prices, jurisdictions, phone numbers,
  emails, channel handles, integration names, or URLs not in grounding.
- Never claim a slug is unique. Echo whatever slug is in
  draftInputSnapshot.launch.slug. Do not invent a new slug.

NO LEGAL / MEDICAL / FINANCIAL ADVICE
- Copy you write into node.copy.opener / node.copy.body must NEVER imply
  legal, medical, financial, or regulated advice. No "we guarantee",
  "legally", "diagnose", "prescribe", "investment advice", "we advise you to".
  When unsure, leave the copy slot empty and add a node.todos[] entry
  explaining what to write later. Empty copy is a successful outcome.

STRUCTURE
- generated.flow.nodes: minimum one "entry" node. Use kinds
  entry | reason_branch | handling | outcome | exit. Node ids are short ASCII.
- generated.flow.edges: id, from, to, optional trigger (plain language). Edges
  reference existing node ids.
- generated.reasonToBranch: map every AscCallerReason.id to a flow node id
  (typically a reason_branch). Keys MUST match draftInputSnapshot.callerReasons[].id.
- generated.outcomes: link normalized outcome labels (from
  draftInputSnapshot.outcomesDraftEdits) to fromReasonIds and notificationRefs.
- generated.notifications: { id, outcomeRef, channelRef, audienceRef?, urgency,
  note? }. channelRef MUST match grounding.workspaceNotificationDestinations.
- generated.destinationLaunch.destination: mirror the user's confirmed
  destination if present; otherwise propose only fields you can ground.
- generated.destinationLaunch.launch.slug: echo the user's confirmed slug or
  omit. Never invent.
- generated.todos: short markers for under-specified areas.
- generated.confidenceByArea: high/medium/low per area (flow, copy, outcomes,
  notifications, destination), with a one-line reason.

SAFETY / FAIL-CLOSED
- If you cannot produce a usable structure, return one entry node + one
  todos[] item explaining what's missing rather than fabricating.
- Caps: at most 60 nodes, 120 edges, 30 outcomes, 30 notifications, 60 TODOs.

RESPONSE
- Always call the logic_architect_compile_response tool exactly once.
- step MUST equal 8.`;

const NODE_KINDS = ["entry", "reason_branch", "handling", "outcome", "exit"] as const;
const AREA_KINDS = ["flow", "copy", "outcomes", "notifications", "destination"] as const;
const URGENCY_KINDS = ["low", "normal", "high"] as const;
const DEST_KINDS = ["internal_runner", "external_url", "deep_link"] as const;
const OPEN_MODES = ["same_tab", "new_tab", "side_panel"] as const;
const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;

const LOGIC_ARCHITECT_COMPILE_TOOL = {
  type: "function" as const,
  function: {
    name: "logic_architect_compile_response",
    description:
      "Return the ASC Step 8 compile artifact. Always call this; never reply in free text.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        step: { type: "integer", enum: [8] },
        generated: {
          type: "object",
          additionalProperties: false,
          properties: {
            flow: {
              type: "object",
              additionalProperties: false,
              properties: {
                nodes: {
                  type: "array",
                  maxItems: 60,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      id: { type: "string" },
                      kind: { type: "string", enum: NODE_KINDS },
                      label: { type: "string", maxLength: 200 },
                      reasonId: { type: "string" },
                      outcomeRef: { type: "string" },
                      copy: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          opener: { type: "string", maxLength: 600 },
                          body: { type: "string", maxLength: 1200 },
                        },
                      },
                      todos: {
                        type: "array",
                        items: { type: "string", maxLength: 240 },
                      },
                    },
                    required: ["id", "kind", "label"],
                  },
                },
                edges: {
                  type: "array",
                  maxItems: 120,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      id: { type: "string" },
                      from: { type: "string" },
                      to: { type: "string" },
                      trigger: { type: "string", maxLength: 240 },
                    },
                    required: ["id", "from", "to"],
                  },
                },
              },
              required: ["nodes", "edges"],
            },
            reasonToBranch: {
              type: "object",
              additionalProperties: { type: "string" },
            },
            outcomes: {
              type: "array",
              maxItems: 30,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  outcomeRef: { type: "string" },
                  fromReasonIds: { type: "array", items: { type: "string" } },
                  notificationRefs: { type: "array", items: { type: "string" } },
                },
                required: ["outcomeRef", "fromReasonIds", "notificationRefs"],
              },
            },
            notifications: {
              type: "array",
              maxItems: 30,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  id: { type: "string" },
                  outcomeRef: { type: "string" },
                  channelRef: { type: "string" },
                  audienceRef: { type: "string" },
                  urgency: { type: "string", enum: URGENCY_KINDS },
                  note: { type: "string", maxLength: 240 },
                },
                required: ["id", "outcomeRef", "channelRef", "urgency"],
              },
            },
            destinationLaunch: {
              type: "object",
              additionalProperties: false,
              properties: {
                destination: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    kind: { type: "string", enum: DEST_KINDS },
                    externalUrl: { type: "string" },
                    deepLinkTemplate: { type: "string" },
                    openMode: { type: "string", enum: OPEN_MODES },
                    notes: { type: "string", maxLength: 240 },
                  },
                  required: ["kind"],
                },
                launch: {
                  type: "object",
                  additionalProperties: false,
                  properties: { slug: { type: "string" } },
                },
              },
              required: ["destination", "launch"],
            },
            todos: {
              type: "array",
              maxItems: 60,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  id: { type: "string" },
                  area: { type: "string", enum: AREA_KINDS },
                  message: { type: "string", maxLength: 240 },
                },
                required: ["id", "area", "message"],
              },
            },
            confidenceByArea: {
              type: "object",
              additionalProperties: {
                type: "object",
                additionalProperties: false,
                properties: {
                  level: { type: "string", enum: CONFIDENCE_LEVELS },
                  reason: { type: "string", maxLength: 240 },
                },
                required: ["level"],
              },
            },
          },
          required: [
            "flow",
            "reasonToBranch",
            "outcomes",
            "notifications",
            "destinationLaunch",
            "todos",
          ],
        },
        advisories: {
          type: "array",
          maxItems: 12,
          items: {
            type: "object",
            additionalProperties: false,
            properties: { message: { type: "string", maxLength: 240 } },
            required: ["message"],
          },
        },
      },
      required: ["step", "generated", "advisories"],
    },
  },
};

interface BaseRequest {
  role:
    | "interviewer"
    | "gap-finder"
    | "logic-architect"
    | "logic-architect-compile";
  step: number;
  workspaceId: string;
  skinId?: string;
  draftInputSnapshot: Record<string, unknown>;
  confirmedFields?: string[];
  lastUserMessage?: string;
  grounding?: Record<string, unknown>;
}

function validateRequest(raw: unknown): BaseRequest | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Body must be an object" };
  const r = raw as Record<string, unknown>;
  const role = r.role;
  if (
    role !== "interviewer" &&
    role !== "gap-finder" &&
    role !== "logic-architect" &&
    role !== "logic-architect-compile"
  ) {
    return {
      error: `Only role="interviewer" | "gap-finder" | "logic-architect" | "logic-architect-compile" is supported (got ${JSON.stringify(role)})`,
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
  if (role === "logic-architect" && !LOGIC_ARCHITECT_STEPS.has(r.step)) {
    return { error: `logic-architect step must be 5, 6, or 7 (got ${r.step})` };
  }
  if (
    role === "logic-architect-compile" &&
    !LOGIC_ARCHITECT_COMPILE_STEPS.has(r.step)
  ) {
    return { error: `logic-architect-compile step must be 8 (got ${r.step})` };
  }
  if (typeof r.workspaceId !== "string" || r.workspaceId.length === 0) {
    return { error: "workspaceId is required" };
  }
  if (!r.draftInputSnapshot || typeof r.draftInputSnapshot !== "object") {
    return { error: "draftInputSnapshot is required" };
  }
  return {
    role,
    step: r.step,
    workspaceId: r.workspaceId,
    skinId: typeof r.skinId === "string" ? r.skinId : undefined,
    draftInputSnapshot: r.draftInputSnapshot as Record<string, unknown>,
    confirmedFields: Array.isArray(r.confirmedFields)
      ? (r.confirmedFields.filter((s) => typeof s === "string") as string[])
      : [],
    lastUserMessage:
      typeof r.lastUserMessage === "string" ? r.lastUserMessage : undefined,
    grounding:
      r.grounding && typeof r.grounding === "object"
        ? (r.grounding as Record<string, unknown>)
        : undefined,
  };
}

function buildInterviewerUserMessage(req: BaseRequest): string {
  const allowed = STEP_FIELDS[req.step as 1 | 2 | 3 | 4].join(", ");
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

function buildLogicArchitectUserMessage(req: BaseRequest): string {
  const snapshot = JSON.stringify(req.draftInputSnapshot, null, 2);
  const grounding = JSON.stringify(req.grounding ?? {}, null, 2);
  return [
    `Step: ${req.step}`,
    `Workspace skin id: ${req.skinId ?? "(none)"}`,
    "",
    "Current draft input snapshot (JSON):",
    snapshot,
    "",
    "Grounding (the ONLY external context you may reference):",
    grounding,
    "",
    "Reply by calling the logic_architect_response tool exactly once.",
  ].join("\n");
}

function buildLogicArchitectCompileUserMessage(req: BaseRequest): string {
  const snapshot = JSON.stringify(req.draftInputSnapshot, null, 2);
  const grounding = JSON.stringify(req.grounding ?? {}, null, 2);
  return [
    `Step: 8 (compile)`,
    `Workspace skin id: ${req.skinId ?? "(none)"}`,
    "",
    "Current draft input snapshot (JSON):",
    snapshot,
    "",
    "Grounding (the ONLY external context you may reference):",
    grounding,
    "",
    "Compile into a single ASC-local draft. Echo the user's confirmed slug; never invent.",
    "Reply by calling the logic_architect_compile_response tool exactly once.",
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

  let systemPrompt: string;
  let userMessage: string;
  let tool: typeof INTERVIEWER_TOOL;
  let toolName: string;
  if (validated.role === "interviewer") {
    systemPrompt = INTERVIEWER_SYSTEM_PROMPT;
    userMessage = buildInterviewerUserMessage(validated);
    tool = INTERVIEWER_TOOL;
    toolName = "interviewer_response";
  } else if (validated.role === "gap-finder") {
    systemPrompt = GAP_FINDER_SYSTEM_PROMPT;
    userMessage = buildGapFinderUserMessage(validated);
    tool = GAP_FINDER_TOOL;
    toolName = "gap_finder_response";
  } else if (validated.role === "logic-architect") {
    systemPrompt = LOGIC_ARCHITECT_SYSTEM_PROMPT;
    userMessage = buildLogicArchitectUserMessage(validated);
    tool = LOGIC_ARCHITECT_TOOL;
    toolName = "logic_architect_response";
  } else {
    systemPrompt = LOGIC_ARCHITECT_COMPILE_SYSTEM_PROMPT;
    userMessage = buildLogicArchitectCompileUserMessage(validated);
    tool = LOGIC_ARCHITECT_COMPILE_TOOL;
    toolName = "logic_architect_compile_response";
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
