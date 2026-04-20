// Five9 event normalizer — converts raw Five9 webhook payloads into the
// canonical Five9NormalizedEvent shape used across the overlay pipeline.

export type Five9EventType =
  | "interaction_started"
  | "lookup_requested"
  | "interaction_updated"
  | "disposition_submitted"
  | "callback_requested"
  | "post_call_sync"
  | "test"
  | "replay";

export interface Five9NormalizedEvent {
  event_type: Five9EventType;
  five9_domain?: string;
  campaign_name?: string;
  queue_id?: string;
  dnis?: string;
  ani?: string;
  call_id?: string;
  agent_id?: string;
  agent_username?: string;
  disposition?: string;
  disposition_notes?: string;
  call_variables: Record<string, string | number | boolean | null>;
  occurred_at: string;
  raw_event_id?: string;
  correlation_id: string;
}

const TYPE_ALIASES: Record<string, Five9EventType> = {
  interaction_started: "interaction_started",
  call_started: "interaction_started",
  agent_call_start: "interaction_started",
  lookup: "lookup_requested",
  lookup_requested: "lookup_requested",
  pre_call_lookup: "lookup_requested",
  interaction_updated: "interaction_updated",
  disposition: "disposition_submitted",
  disposition_submitted: "disposition_submitted",
  call_disposition: "disposition_submitted",
  callback: "callback_requested",
  callback_requested: "callback_requested",
  post_call: "post_call_sync",
  post_call_sync: "post_call_sync",
  test: "test",
  replay: "replay",
};

function pickFirst<T>(...vals: (T | undefined | null)[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
}

function flattenCallVariables(raw: any): Record<string, any> {
  const out: Record<string, any> = {};
  // Five9 sends call variables under several shapes depending on connector
  // 1. payload.call_variables = [{ name, value, group }]
  // 2. payload.callVariables  = { Group.Var: value }
  // 3. payload.variables       = { var: value }
  // 4. payload.metadata.call_variables = ...
  const candidates = [
    raw?.call_variables,
    raw?.callVariables,
    raw?.variables,
    raw?.metadata?.call_variables,
  ];
  for (const c of candidates) {
    if (!c) continue;
    if (Array.isArray(c)) {
      for (const v of c) {
        if (!v?.name) continue;
        const key = v.group ? `${v.group}.${v.name}` : v.name;
        out[key] = v.value ?? null;
      }
    } else if (typeof c === "object") {
      Object.assign(out, c);
    }
  }
  return out;
}

export function normalizeFive9Event(
  raw: Record<string, any>,
  hint?: { event_type?: Five9EventType; correlation_id?: string },
): Five9NormalizedEvent {
  const explicitType = (raw.event_type ?? raw.eventType ?? raw.type ?? hint?.event_type ?? "")
    .toString()
    .toLowerCase();
  const event_type: Five9EventType = TYPE_ALIASES[explicitType] ?? "interaction_updated";

  const correlation_id =
    hint?.correlation_id ??
    raw.correlation_id ??
    raw.correlationId ??
    raw.call_id ??
    raw.callId ??
    crypto.randomUUID();

  return {
    event_type,
    five9_domain: pickFirst(raw.five9_domain, raw.domain, raw.tenant?.domain),
    campaign_name: pickFirst(raw.campaign_name, raw.campaign, raw.campaignName),
    queue_id: pickFirst(raw.queue_id, raw.queueId, raw.queue),
    dnis: pickFirst(raw.dnis, raw.DNIS, raw.called_number),
    ani: pickFirst(raw.ani, raw.ANI, raw.caller_number, raw.from),
    call_id: pickFirst(raw.call_id, raw.callId, raw.session_id),
    agent_id: pickFirst(raw.agent_id, raw.agentId),
    agent_username: pickFirst(raw.agent_username, raw.agentUsername, raw.agent),
    disposition: pickFirst(raw.disposition, raw.disposition_name, raw.dispositionName),
    disposition_notes: pickFirst(raw.disposition_notes, raw.notes, raw.agent_notes),
    call_variables: flattenCallVariables(raw),
    occurred_at: raw.occurred_at ?? raw.timestamp ?? new Date().toISOString(),
    raw_event_id: raw.event_id ?? raw.eventId,
    correlation_id,
  };
}
