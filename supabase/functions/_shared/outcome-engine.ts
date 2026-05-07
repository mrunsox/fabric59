// Phase 3 — Outcome Engine
//
// Translates a normalized Five9 event + caller classification (caller_type +
// call_reason, sourced from worksheet/disposition mapping metadata) into a
// provider-agnostic set of outcome actions. The producer (five9-main) then
// turns each outcome action into a sync job (or skips it cleanly).
//
// Design goals:
//   - Business-level, not Clio/MyCase specific.
//   - Sane defaults; matrix can be overridden per-client via
//     legal_connect_disposition_mappings.metadata.outcome_overrides.
//   - send_post_call_email is first-class and does not require any CRM write.

export type CallerType =
  | "new_lead"
  | "current_client"
  | "former_client"
  | "third_party"
  | "unknown";

export type CallReason =
  | "new_case"
  | "case_update"
  | "send_information"
  | "appointment_request"
  | "billing_question"
  | "status_check"
  | "attorney_callback_request"
  | "general_question"
  | "wrong_number"
  | "spam";

export type OutcomeActionType =
  | "create_intake"
  | "log_client_note"
  | "create_followup_task"
  | "update_contact_or_matter"
  | "send_post_call_email"
  | "no_writeback";

export interface OutcomeAction {
  type: OutcomeActionType;
  /** Optional rationale for observability/dev guide. */
  reason?: string;
  /** Optional payload hints (template name, priority, etc). */
  hints?: Record<string, unknown>;
}

export interface ClassificationInput {
  caller_type?: CallerType | null;
  call_reason?: CallReason | null;
  disposition?: string | null;
  /** Free-form per-client overrides from disposition mapping metadata. */
  overrides?: Record<string, OutcomeActionType[]> | null;
}

const DEFAULT_MATRIX: Record<string, OutcomeActionType[]> = {
  // New leads
  "new_lead:new_case":               ["create_intake", "send_post_call_email"],
  "new_lead:appointment_request":    ["create_intake", "send_post_call_email"],
  "new_lead:general_question":       ["log_client_note", "send_post_call_email"],
  "new_lead:send_information":       ["send_post_call_email"],

  // Current clients — bias toward notes/tasks/email, NEVER create_intake
  "current_client:case_update":      ["log_client_note", "create_followup_task"],
  "current_client:status_check":     ["send_post_call_email"],
  "current_client:billing_question": ["send_post_call_email"],
  "current_client:appointment_request": ["log_client_note", "create_followup_task"],
  "current_client:attorney_callback_request": ["log_client_note", "create_followup_task"],
  "current_client:send_information": ["send_post_call_email"],
  "current_client:general_question": ["log_client_note"],

  // Former clients
  "former_client:new_case":          ["create_intake", "send_post_call_email"],
  "former_client:billing_question":  ["send_post_call_email"],
  "former_client:general_question":  ["log_client_note"],

  // Third parties (adjusters, providers, courts)
  "third_party:case_update":         ["log_client_note"],
  "third_party:send_information":    ["send_post_call_email"],
  "third_party:general_question":    ["log_client_note"],

  // Wrong number / spam — no writeback regardless of caller_type
  "*:wrong_number":                  ["no_writeback"],
  "*:spam":                          ["no_writeback"],

  // Unknown caller — conservative
  "unknown:new_case":                ["create_intake"],
  "unknown:general_question":        ["log_client_note"],
};

/**
 * Resolve outcome actions. Order of precedence:
 *   1. Per-client override (`overrides["caller_type:call_reason"]`).
 *   2. Wildcard reason rules (`*:reason`) — e.g. wrong_number always skips.
 *   3. Exact match in default matrix.
 *   4. Caller-type fallback.
 *   5. `[no_writeback]` with reason="unclassified".
 */
export function resolveOutcomeActions(input: ClassificationInput): OutcomeAction[] {
  const ct = (input.caller_type ?? "unknown") as CallerType;
  const cr = input.call_reason ?? null;

  if (cr) {
    const overrideKey = `${ct}:${cr}`;
    const wild = `*:${cr}`;
    const ovr =
      input.overrides?.[overrideKey] ??
      input.overrides?.[wild] ??
      DEFAULT_MATRIX[wild] ??
      DEFAULT_MATRIX[overrideKey];
    if (ovr && ovr.length) {
      return ovr.map((type) => ({ type, reason: `matrix:${overrideKey}` }));
    }
  }

  // Caller-type fallback for missing reason.
  if (ct === "current_client") {
    return [{ type: "log_client_note", reason: "fallback:current_client_no_reason" }];
  }
  if (ct === "third_party") {
    return [{ type: "log_client_note", reason: "fallback:third_party" }];
  }
  if (ct === "new_lead") {
    return [{ type: "create_intake", reason: "fallback:new_lead_no_reason" }];
  }
  return [{ type: "no_writeback", reason: "unclassified" }];
}

/**
 * Map a normalized outcome action to (provider, job_type) for the queue.
 * Returns null when the action does not produce a job (no_writeback).
 *
 * The producer decides which connection/provider to use; this just gives
 * a sensible job_type per action.
 */
export function actionToJobType(
  action: OutcomeActionType,
  provider: string | null,
): { provider: string; job_type: string } | null {
  if (action === "no_writeback") return null;
  if (action === "send_post_call_email") {
    return { provider: "post_call_email", job_type: "email.send" };
  }
  if (!provider) return null;
  switch (action) {
    case "create_intake":
      return { provider, job_type: provider === "clio_grow" ? "lead.create" : "matter.create" };
    case "log_client_note":
      return { provider, job_type: "note.create" };
    case "create_followup_task":
      return { provider, job_type: "task.create" };
    case "update_contact_or_matter":
      return { provider, job_type: "contact.update" };
  }
}

/**
 * Extract caller_type / call_reason from the available sources, in priority:
 *   1. Worksheet snapshot (most authoritative — set by agent at wrap-up).
 *   2. Five9 call_variables (if mapped).
 *   3. Disposition mapping metadata defaults.
 */
export function extractClassification(
  worksheet: Record<string, unknown> | null | undefined,
  call_variables: Record<string, unknown> | null | undefined,
  mappingMetadata: Record<string, unknown> | null | undefined,
): { caller_type: CallerType | null; call_reason: CallReason | null } {
  const ws = worksheet ?? {};
  const cv = call_variables ?? {};
  const md = (mappingMetadata as any) ?? {};

  const caller_type =
    (ws.caller_type as CallerType) ||
    (cv.caller_type as CallerType) ||
    (md.default_caller_type as CallerType) ||
    null;

  const call_reason =
    (ws.call_reason as CallReason) ||
    (cv.call_reason as CallReason) ||
    (md.default_call_reason as CallReason) ||
    null;

  return { caller_type, call_reason };
}
