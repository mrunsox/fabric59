/**
 * Phase 7 — adapter mapping.
 *
 * Translates a finalized InteractionRecord + the Phase 5 campaign-flow
 * output mappings into a list of adapter writeback jobs ready to be
 * enqueued onto the existing `legal_connect_sync_jobs` queue (drained by
 * `supabase/functions/legal-connect-jobs`).
 *
 * Industry-neutral — vertical-specific behavior lives inside each adapter
 * (Clio/MyCase/Smokeball), not here.
 */
import type { FlowOutputMapping } from "@/types/campaign-flow";
import type {
  AdapterWritebackJobInput,
  ContactMatchOutcome,
  InteractionRecord,
} from "./types";

export interface IntegrationConnection {
  id: string;
  provider: string;
  /** When true the connection is configured but not active — skip writeback. */
  disabled?: boolean;
}

const SUPPORTED_LEGAL_PROVIDERS = new Set(["clio", "clio_manage", "mycase", "smokeball", "clio_grow"]);

export function buildAdapterJobs(
  rec: InteractionRecord,
  mappings: FlowOutputMapping[],
  connections: IntegrationConnection[],
): AdapterWritebackJobInput[] {
  const jobs: AdapterWritebackJobInput[] = [];
  const activeConns = connections.filter(
    (c) => !c.disabled && SUPPORTED_LEGAL_PROVIDERS.has(c.provider.toLowerCase()),
  );
  if (activeConns.length === 0) return jobs;

  const mappedFields = applyMappings(rec.values, mappings);
  const baseSummary = rec.copilotSummary ?? "";
  const intakePayload = {
    contact: {
      full_name: mappedFields.full_name ?? mappedFields["contact.full_name"] ?? rec.values.caller_name ?? null,
      first_name: mappedFields.first_name ?? mappedFields["contact.first_name"] ?? rec.values.first_name ?? null,
      last_name: mappedFields.last_name ?? mappedFields["contact.last_name"] ?? rec.values.last_name ?? null,
      email: mappedFields.email ?? mappedFields["contact.email"] ?? rec.values.caller_email ?? null,
      phone: mappedFields.phone ?? mappedFields["contact.phone"] ?? rec.ani ?? null,
    },
    matter: {
      description: mappedFields["matter.description"] ?? mappedFields.matter_description ?? null,
      practice_area: mappedFields["matter.practice_area"] ?? mappedFields.practice_area ?? null,
    },
    fields: mappedFields,
    outcome: rec.outcomeCode,
    notes: rec.notes,
    interaction_id: rec.id,
  };

  const noteBody = [baseSummary, rec.notes].filter(Boolean).join("\n\n").trim();

  for (const conn of activeConns) {
    const idemBase = `${rec.id}:${conn.id}`;

    // Always log a client note when we have anything to say.
    if (noteBody) {
      jobs.push({
        provider: conn.provider,
        connectionId: conn.id,
        action: "log_client_note",
        payload: {
          content: noteBody,
          subject: `Call summary · ${rec.outcomeCode ?? "no outcome"}`,
          interaction_id: rec.id,
        },
        idempotencyKey: `${idemBase}:note`,
      });
    }

    // Create or update the canonical entity when caller info is present.
    if (intakePayload.contact.phone || intakePayload.contact.email || intakePayload.contact.full_name) {
      jobs.push({
        provider: conn.provider,
        connectionId: conn.id,
        action: "create_intake",
        payload: intakePayload,
        idempotencyKey: `${idemBase}:intake`,
      });
    }

    // Follow-up task driven by outcome (callback / escalation / etc.).
    if (shouldCreateFollowup(rec)) {
      jobs.push({
        provider: conn.provider,
        connectionId: conn.id,
        action: "create_followup_task",
        payload: {
          subject: `Follow up · ${rec.outcomeCode ?? "callback"}`,
          due_in_hours: 24,
          interaction_id: rec.id,
          notes: rec.notes,
        },
        idempotencyKey: `${idemBase}:followup`,
      });
    }
  }
  return jobs;
}

export function annotateWithContactLink(
  jobs: AdapterWritebackJobInput[],
  match: ContactMatchOutcome,
): AdapterWritebackJobInput[] {
  if (match.kind === "linked") {
    return jobs.map((j) => ({ ...j, payload: { ...j.payload, contact_id: match.contact.id, contact_link: "matched" } }));
  }
  if (match.kind === "ambiguous" && match.chosen) {
    return jobs.map((j) => ({
      ...j,
      payload: { ...j.payload, contact_id: match.chosen!.id, contact_link: "ambiguous_default" },
    }));
  }
  return jobs.map((j) => ({ ...j, payload: { ...j.payload, contact_link: "unmatched" } }));
}

function applyMappings(
  values: Record<string, unknown>,
  mappings: FlowOutputMapping[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const m of mappings ?? []) {
    if (m.sourceKey in values) out[m.destinationKey] = values[m.sourceKey];
  }
  // Always include raw values under their original keys for downstream visibility.
  return { ...values, ...out };
}

function shouldCreateFollowup(rec: InteractionRecord): boolean {
  const code = (rec.outcomeCode ?? "").toLowerCase();
  if (!code) return false;
  return /callback|follow|escal|voicemail|left.?message|missed/.test(code);
}
