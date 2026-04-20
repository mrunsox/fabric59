// Disposition mapping engine — converts a normalized Five9 event + disposition
// mapping config into a provider-specific action chain.

import type { Five9NormalizedEvent } from "./five9-event-normalizer.ts";
import type { ProviderCapability } from "./provider-registry.ts";
import type { SyncAction, ReviewItem } from "./normalized-entities.ts";

export interface DispositionMapping {
  id: string;
  client_id: string;
  campaign_id: string | null;
  disposition_code: string;
  provider_target: string | null;
  required_call_variables: string[];
  is_open_disposition: boolean;
  unsupported_action_behavior: "review_queue" | "drop" | "log_only";
  create_contact: boolean;
  update_contact: boolean;
  create_matter: boolean;
  attach_to_existing_matter: boolean;
  create_note: boolean;
  create_task: boolean;
  create_callback: boolean;
  create_activity: boolean;
  send_to_manual_review: boolean;
  require_call_notes: boolean;
  metadata: Record<string, unknown> | null;
}

export interface MappingResult {
  actions: SyncAction[];
  review_items: ReviewItem[];
  warnings: string[];
}

const ACTION_TO_CAPABILITY: Record<string, string> = {
  lookup_contact: "contact_sync",
  create_contact: "contact_sync",
  update_contact: "contact_sync",
  lookup_matter: "matter_sync",
  create_matter: "matter_sync",
  create_lead: "lead_sync",
  create_note: "note_sync",
  create_task: "task_sync",
  create_activity: "activity_sync",
};

export function buildActionChain(
  evt: Five9NormalizedEvent,
  mapping: DispositionMapping | null,
  provider: string,
  capabilities: ProviderCapability[],
): MappingResult {
  const actions: SyncAction[] = [];
  const review_items: ReviewItem[] = [];
  const warnings: string[] = [];

  // 1. If no mapping defined, route to review (conservative default).
  if (!mapping) {
    review_items.push({
      reason: `no_disposition_mapping:${evt.disposition ?? "missing"}`,
      payload: { event: evt, provider },
      suggested_resolution: "Configure a disposition mapping for this code, then replay.",
    });
    return { actions, review_items, warnings };
  }

  // 2. Validate required call variables.
  const missing = mapping.required_call_variables.filter(
    (k) => evt.call_variables[k] === undefined || evt.call_variables[k] === null || evt.call_variables[k] === "",
  );
  if (missing.length > 0) {
    review_items.push({
      reason: "missing_required_call_variables",
      payload: { missing, mapping_id: mapping.id, event: evt },
      suggested_resolution: `Capture values for: ${missing.join(", ")}`,
    });
    return { actions, review_items, warnings };
  }

  // 3. Manual-review override.
  if (mapping.send_to_manual_review) {
    review_items.push({
      reason: "manual_review_required_by_mapping",
      payload: { mapping_id: mapping.id, event: evt },
    });
    return { actions, review_items, warnings };
  }

  // 4. Build the chain. Always lookup_contact first as a soft step.
  const enqueue = (action: SyncAction["action"], payload: Record<string, unknown>) => {
    const cap = ACTION_TO_CAPABILITY[action];
    if (cap) {
      const supported = capabilities.find((c) => c.capability_key === cap)?.supported;
      if (!supported) {
        if (mapping.unsupported_action_behavior === "drop") {
          warnings.push(`dropped_unsupported_action:${action}`);
          return;
        }
        if (mapping.unsupported_action_behavior === "log_only") {
          warnings.push(`logged_only_unsupported_action:${action}`);
          return;
        }
        review_items.push({
          reason: `unsupported_action:${provider}.${action}`,
          payload: { action, payload, mapping_id: mapping.id },
          suggested_resolution: "Provider does not support this action. Resolve manually or update mapping.",
        });
        return;
      }
    }
    actions.push({ action, payload, required_capability: cap ?? "" });
  };

  // ── Action chain (order matters) ─────────────────────────────
  if (evt.ani || evt.call_variables["caller_phone"]) {
    enqueue("lookup_contact", {
      phone: evt.ani ?? evt.call_variables["caller_phone"],
      email: evt.call_variables["caller_email"] ?? undefined,
      full_name: evt.call_variables["caller_name"] ?? undefined,
    });
  }

  if (mapping.create_contact) {
    enqueue("create_contact", {
      first_name: (evt.call_variables["caller_first_name"] ?? evt.call_variables["first_name"]) as string,
      last_name: (evt.call_variables["caller_last_name"] ?? evt.call_variables["last_name"]) as string,
      full_name: evt.call_variables["caller_name"] as string,
      phone: evt.ani ?? (evt.call_variables["caller_phone"] as string),
      email: evt.call_variables["caller_email"] as string,
    });
  } else if (mapping.update_contact) {
    enqueue("update_contact", {
      phone: evt.ani,
      email: evt.call_variables["caller_email"] as string,
    });
  }

  if (mapping.create_matter) {
    enqueue("create_matter", {
      description: (evt.call_variables["matter_type"] ?? evt.call_variables["intake_type"] ?? "New matter") as string,
      practice_area: evt.call_variables["practice_area"] as string,
    });
  } else if (mapping.attach_to_existing_matter) {
    enqueue("lookup_matter", { status: "open" });
  }

  // Smokeball-first: create lead when configured (intake-style mapping flag in metadata)
  if ((mapping.metadata as any)?.create_lead && provider === "smokeball") {
    enqueue("create_lead", {
      source: "five9",
      intake_type: evt.call_variables["intake_type"] as string,
      notes: evt.disposition_notes,
    });
  }

  if (mapping.create_note) {
    enqueue("create_note", {
      subject: `Five9 — ${evt.disposition ?? "interaction"}`,
      content: buildNoteBody(evt),
    });
  }

  if (mapping.create_activity) {
    enqueue("create_activity", {
      type: "call",
      subject: `Call — ${evt.disposition ?? ""}`,
      description: evt.disposition_notes,
      occurred_at: evt.occurred_at,
    });
  }

  if (mapping.create_task || mapping.create_callback) {
    enqueue("create_task", {
      subject: mapping.create_callback
        ? `Callback: ${evt.ani ?? "caller"}`
        : `Follow-up: ${evt.disposition ?? "intake"}`,
      description: evt.disposition_notes,
      due_date: evt.call_variables["callback_at"] as string,
      priority: (evt.call_variables["urgency"] as any) ?? "normal",
    });
  }

  return { actions, review_items, warnings };
}

function buildNoteBody(evt: Five9NormalizedEvent): string {
  const lines: string[] = [];
  if (evt.disposition) lines.push(`Disposition: ${evt.disposition}`);
  if (evt.agent_username) lines.push(`Agent: ${evt.agent_username}`);
  if (evt.campaign_name) lines.push(`Campaign: ${evt.campaign_name}`);
  if (evt.disposition_notes) lines.push("", evt.disposition_notes);
  const vars = Object.entries(evt.call_variables).filter(([_, v]) => v !== null && v !== "");
  if (vars.length) {
    lines.push("", "Call variables:");
    for (const [k, v] of vars) lines.push(`  ${k}: ${v}`);
  }
  return lines.join("\n");
}
