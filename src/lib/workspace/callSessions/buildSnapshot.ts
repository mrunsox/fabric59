/**
 * Phase 7A — Pure builder for the v1 call session snapshot.
 *
 * Inputs are plain rows / domain objects so this is trivially testable and
 * runtime-agnostic (callable from the edge function or from tests). The
 * server-side capture path in `supabase/functions/_shared/session-snapshot.ts`
 * wraps this with the loads + insert.
 */

import {
  mapStatusToPhase,
  resolveCallerIdentity,
  type CallSessionRow,
} from "@/lib/workspace/cockpit/callSession";
import type { KnowledgeBin } from "@/lib/workspace/cockpit/knowledgeBin";
import {
  SNAPSHOT_CONTRACT_VERSION,
  maskValuePreview,
  type CallSessionSnapshotV1,
  type SnapshotEvent,
  type SnapshotKnowledgeBin,
  type SnapshotKnowledgeGroup,
  type SnapshotKnowledgeItem,
  type SnapshotOutcome,
  type SnapshotSession,
} from "./snapshotContract";

export { SNAPSHOT_CONTRACT_VERSION };

export interface RawSessionEventRow {
  timestamp: string;
  event_type: string;
  data: Record<string, unknown> | null;
}

export interface RawOutcomeRow {
  disposition: string | null;
  outcome_type_id: string | null;
  summary: string | null;
}

export interface RawNoteRow {
  note_text: string | null;
  created_at: string;
}

export interface RawAssistEventRow {
  created_at: string;
  suggestion_id: string | null;
  source_type: string | null;
  source_precedence: number | null;
  action: "accepted" | "copied" | "ignored" | null;
}

export interface BuildSnapshotInput {
  session: CallSessionRow;
  knowledgeBin: KnowledgeBin | null;
  events: RawSessionEventRow[];
  outcome: RawOutcomeRow | null;
  latestNote: RawNoteRow | null;
  /** Phase 7B — assist usage trail. Optional; absent = empty list. */
  assistEvents?: RawAssistEventRow[];
  capturedAt?: string;
}

function snapshotSession(session: CallSessionRow): SnapshotSession {
  const phase = mapStatusToPhase(session.status, session.ended_at, session.phase);
  const caller = resolveCallerIdentity({
    ani: session.ani,
    callerName: session.caller_name,
  });
  return {
    id: session.id,
    workspace_id: session.workspace_id ?? "",
    campaign_id: session.campaign_id,
    agent_id: session.agent_id,
    status: session.status,
    phase,
    started_at: session.started_at,
    ended_at: session.ended_at,
    duration_seconds: session.duration_seconds,
    ani: session.ani,
    caller_label: {
      value: caller.label,
      source:
        caller.source === "caller_name"
          ? "brain"
          : caller.source === "ani"
            ? "telephony"
            : "unknown",
    },
  };
}

const GROUP_PRECEDENCE: Record<SnapshotKnowledgeGroup["key"], number> = {
  caller: 1,
  instructions: 2,
  required: 2,
  guide: 3,
  approved: 4,
  references: 5,
  dispositions: Number.POSITIVE_INFINITY,
};

function snapshotKnowledgeBin(
  bin: KnowledgeBin | null,
  capturedAt: string,
): SnapshotKnowledgeBin {
  if (!bin) return { captured_at: capturedAt, groups: [] };
  const groups: SnapshotKnowledgeGroup[] = (
    [
      ["caller", bin.caller],
      ["instructions", bin.instructions],
      ["required", bin.required],
      ["guide", bin.guide],
      ["approved", bin.approved],
      ["references", bin.references],
      ["dispositions", bin.dispositions],
    ] as const
  )
    .filter(([, g]) => g.items.length > 0)
    .map(([key, g]) => ({
      key,
      precedence: GROUP_PRECEDENCE[key],
      items: g.items.map<SnapshotKnowledgeItem>((it) => ({
        id: it.id,
        source_type: it.sourceType,
        source_id: it.sourceId,
        label: it.label,
        body: it.body,
        scope: it.scope,
        approval_state: it.approvalState,
        topic_key: it.topicKey,
      })),
    }));
  return { captured_at: capturedAt, groups };
}

function snapshotEvents(
  rows: RawSessionEventRow[],
  fallbackDispositionLabel: string | null,
): SnapshotEvent[] {
  const out: SnapshotEvent[] = [];
  for (const r of rows) {
    const t = (r.event_type || "").toLowerCase();
    if (t === "phase_change" || t === "phase_transition") {
      out.push({
        ts: r.timestamp,
        type: "phase_change",
        from: (r.data?.from as string) ?? null,
        to: (r.data?.to as string) ?? "",
      });
    } else if (t === "required_field_completed" || t === "field_completed") {
      out.push({
        ts: r.timestamp,
        type: "required_field_completed",
        field_key: String(r.data?.field_key ?? r.data?.key ?? ""),
        value_preview: maskValuePreview(r.data?.value),
      });
    } else if (t === "disposition_selected" || t === "disposition") {
      out.push({
        ts: r.timestamp,
        type: "disposition_selected",
        disposition_id: (r.data?.disposition_id as string) ?? null,
        label: String(r.data?.label ?? fallbackDispositionLabel ?? ""),
      });
    }
  }
  return out;
}

function snapshotOutcome(
  outcome: RawOutcomeRow | null,
  note: RawNoteRow | null,
): SnapshotOutcome {
  return {
    disposition_id: outcome?.outcome_type_id ?? null,
    disposition_label: outcome?.disposition ?? null,
    notes_excerpt: note?.note_text ? note.note_text.slice(0, 280) : (outcome?.summary ?? null),
  };
}

export function buildCallSessionSnapshotV1(
  input: BuildSnapshotInput,
): CallSessionSnapshotV1 {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const assistEvents = (input.assistEvents ?? [])
    .filter((r) => r.suggestion_id && r.action)
    .map((r) => ({
      ts: r.created_at,
      suggestion_id: r.suggestion_id as string,
      source_precedence:
        typeof r.source_precedence === "number" && Number.isFinite(r.source_precedence)
          ? r.source_precedence
          : 0,
      source_type: (r.source_type ?? "live_session") as CallSessionSnapshotV1["ai_assist"]["used_suggestions"][number]["source_type"],
      action: (r.action ?? "accepted") as "accepted" | "copied" | "ignored",
    }));
  return {
    session: snapshotSession(input.session),
    knowledge_bin: snapshotKnowledgeBin(input.knowledgeBin, capturedAt),
    events: snapshotEvents(input.events, input.outcome?.disposition ?? null),
    outcome: snapshotOutcome(input.outcome, input.latestNote),
    ai_assist: { used_suggestions: assistEvents },
  };
}
