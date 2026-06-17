/**
 * ASC Slice 4 — Gap-finder response contract.
 *
 * Advisory-only. The Gap-finder NEVER mutates the draft — its output
 * surfaces as soft recommendations in the side panel. Strict parsing so
 * malformed responses fail closed.
 */
import type { AscGapItem, AscGapKind } from "./types";

export const ASC_GAP_KINDS: readonly AscGapKind[] = [
  "missing_handling",
  "escalation_no_destination",
  "implied_capture_missing",
  "after_hours_no_variant",
  "duplicate_reasons",
] as const;

const KIND_SET: ReadonlySet<string> = new Set(ASC_GAP_KINDS);

export interface AscGapFinderResponse {
  step: 3 | 4;
  items: AscGapItem[];
}

export function parseGapFinderResponse(
  raw: unknown,
): AscGapFinderResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.step !== 3 && r.step !== 4) return null;
  if (!Array.isArray(r.items)) return null;

  const step = r.step as 3 | 4;
  const items: AscGapItem[] = [];
  for (const x of r.items) {
    if (!x || typeof x !== "object") return null;
    const o = x as Record<string, unknown>;
    if (typeof o.id !== "string" || o.id.length === 0) return null;
    if (typeof o.kind !== "string" || !KIND_SET.has(o.kind)) return null;
    if (typeof o.message !== "string" || o.message.length === 0) return null;
    if (o.message.length > 240) return null;
    let reasonIds: string[] | undefined;
    if (o.reasonIds !== undefined) {
      if (!Array.isArray(o.reasonIds)) return null;
      if (!o.reasonIds.every((id) => typeof id === "string")) return null;
      reasonIds = o.reasonIds as string[];
    }
    items.push({
      id: o.id,
      step,
      kind: o.kind as AscGapKind,
      message: o.message,
      reasonIds,
    });
  }
  return { step, items };
}
