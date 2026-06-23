/**
 * Phase 7B — Snapshot-only AI summaries and QA hints.
 *
 * Both helpers take a snapshot JSON as their ONLY input. They never read live
 * call/session/CRM data. The actual model call runs server-side in the
 * `call-snapshot-ai` edge function so the snapshot is the single source of
 * grounding.
 *
 * Outputs are advisory:
 *   - `summarizeCallFromSnapshot` returns a short narrative summary + tags.
 *   - `suggestQaChecksFromSnapshot` returns 2–5 advisory hints. They are
 *     never used to auto-score or auto-pass/fail a call; the QA surface
 *     must render them with a "Advisory only — not a QA score" label.
 *
 * On insufficient input, both helpers return `{ reason: 'insufficient_data' }`
 * rather than throwing or making up output.
 */

import { supabase } from "@/integrations/supabase/client";
import type { CallSessionSnapshotV1 } from "./snapshotContract";

export interface CallSnapshotSummary {
  summary: string | null;
  tags: string[];
  reason?: "insufficient_data";
  generated_from?: { version: number; captured_at: string | null };
}

export interface CallSnapshotQaHints {
  hints: string[];
  reason?: "insufficient_data";
  generated_from?: { version: number; captured_at: string | null };
}

function isSnapshotUsable(snapshot: CallSessionSnapshotV1 | null | undefined): boolean {
  if (!snapshot) return false;
  const hasOutcome = !!snapshot.outcome?.disposition_label;
  const hasEvents = (snapshot.events?.length ?? 0) > 0;
  const hasKb = (snapshot.knowledge_bin?.groups?.length ?? 0) > 0;
  return hasOutcome || hasEvents || hasKb;
}

function snapshotMeta(snapshot: CallSessionSnapshotV1) {
  return {
    version: 1,
    captured_at: snapshot.knowledge_bin?.captured_at ?? null,
  };
}

async function callSnapshotAi(
  mode: "summary" | "qa_hints",
  snapshot: CallSessionSnapshotV1,
): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke("call-snapshot-ai", {
    body: { mode, snapshot },
  });
  if (error) throw error;
  return data;
}

export async function summarizeCallFromSnapshot(
  snapshot: CallSessionSnapshotV1 | null | undefined,
): Promise<CallSnapshotSummary> {
  if (!isSnapshotUsable(snapshot)) {
    return { summary: null, tags: [], reason: "insufficient_data" };
  }
  try {
    const data = (await callSnapshotAi("summary", snapshot!)) as {
      summary?: string;
      tags?: string[];
    } | null;
    return {
      summary: data?.summary?.trim() || null,
      tags: Array.isArray(data?.tags) ? data!.tags.slice(0, 3) : [],
      generated_from: snapshotMeta(snapshot!),
    };
  } catch {
    return {
      summary: null,
      tags: [],
      reason: "insufficient_data",
      generated_from: snapshotMeta(snapshot!),
    };
  }
}

export async function suggestQaChecksFromSnapshot(
  snapshot: CallSessionSnapshotV1 | null | undefined,
): Promise<CallSnapshotQaHints> {
  if (!isSnapshotUsable(snapshot)) {
    return { hints: [], reason: "insufficient_data" };
  }
  try {
    const data = (await callSnapshotAi("qa_hints", snapshot!)) as {
      hints?: string[];
    } | null;
    const hints = Array.isArray(data?.hints)
      ? data!.hints.map((h) => String(h).trim()).filter(Boolean).slice(0, 5)
      : [];
    return { hints, generated_from: snapshotMeta(snapshot!) };
  } catch {
    return {
      hints: [],
      reason: "insufficient_data",
      generated_from: snapshotMeta(snapshot!),
    };
  }
}
