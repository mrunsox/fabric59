/**
 * Phase 7A — Call session snapshot JSON contract (v1).
 *
 * `call_session_snapshots` is a DERIVED, APPEND-ONLY READ MODEL for replay
 * and audit. It is NOT the system source of truth — the canonical state lives
 * in `call_sessions`, `call_outcomes`, `call_notes`, `call_session_events`,
 * and the live Knowledge Bin resolver. A snapshot is a server-assembled
 * "story of the call" captured at or after wrap-up / completion.
 *
 * The shape below is v1 and stable for v1. Additive evolution in later
 * phases is allowed; bump `call_session_snapshots.version` and add fields
 * without removing or renaming existing ones. Phase 7B (replay + summaries)
 * consumes this shape read-only.
 */

import type { CallPhase } from "@/lib/workspace/cockpit/callSession";
import type { KnowledgeSourceType } from "@/lib/workspace/cockpit/knowledgeBin";

export const SNAPSHOT_CONTRACT_VERSION = 1 as const;

export interface SnapshotCallerLabel {
  value: string;
  source: "telephony" | "brain" | "contact" | "unknown";
}

export interface SnapshotSession {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  agent_id: string | null;
  status: string;
  phase: CallPhase;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  ani: string | null;
  caller_label: SnapshotCallerLabel;
}

/** Lite form of a KnowledgeBinItem — heavy refs intentionally dropped. */
export interface SnapshotKnowledgeItem {
  id: string;
  source_type: KnowledgeSourceType;
  source_id: string | null;
  label: string;
  body: string;
  scope: string;
  approval_state: "approved" | "needs_review" | "n/a";
  topic_key: string;
}

export interface SnapshotKnowledgeGroup {
  key:
    | "caller"
    | "instructions"
    | "required"
    | "guide"
    | "approved"
    | "references"
    | "dispositions";
  precedence: number;
  items: SnapshotKnowledgeItem[];
}

export interface SnapshotKnowledgeBin {
  captured_at: string;
  groups: SnapshotKnowledgeGroup[];
}

export type SnapshotEvent =
  | {
      ts: string;
      type: "phase_change";
      from: CallPhase | string | null;
      to: CallPhase | string;
    }
  | {
      ts: string;
      type: "required_field_completed";
      field_key: string;
      value_preview: string | null;
    }
  | {
      ts: string;
      type: "disposition_selected";
      disposition_id: string | null;
      label: string;
    };

export interface SnapshotOutcome {
  disposition_id: string | null;
  disposition_label: string | null;
  notes_excerpt: string | null;
}

export interface SnapshotAssistUsage {
  ts: string;
  suggestion_id: string;
  source_precedence: number;
  source_type: KnowledgeSourceType;
  action: "copied" | "accepted" | "ignored";
}

export interface SnapshotAiAssist {
  used_suggestions: SnapshotAssistUsage[];
}

export interface CallSessionSnapshotV1 {
  session: SnapshotSession;
  knowledge_bin: SnapshotKnowledgeBin;
  events: SnapshotEvent[];
  outcome: SnapshotOutcome;
  ai_assist: SnapshotAiAssist;
}

/** Mask a captured value for the event log so PII never lands in a snapshot. */
export function maskValuePreview(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value);
  if (!s) return null;
  // Email-ish
  const at = s.indexOf("@");
  if (at > 1) {
    return `${s[0]}***${s.slice(at - 1)}`;
  }
  if (s.length <= 2) return "***";
  if (s.length <= 6) return `${s[0]}***${s.slice(-1)}`;
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}
