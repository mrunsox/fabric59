/**
 * Business Brain — promotion / merge helpers.
 *
 * Pure functions used by both the edge function and the client mutation
 * hooks. Conservative by design: an approval creates a NEW fact unless the
 * reviewer explicitly chose an existing fact to merge into. There is no
 * fuzzy or silent auto-merge in Slice 1.
 */
import type { BbSourceRef } from "./types";

export interface MergeResult {
  /** New combined source_refs list, deduped by extraction_id, source_id+snippet. */
  source_refs: BbSourceRef[];
  /** Number of refs added beyond the existing fact's. */
  added: number;
}

/**
 * Merge extraction source refs into an existing fact's source_refs without
 * losing provenance. Deduped on `(source_id, extraction_id, snippet)`.
 * Existing refs are preserved verbatim and listed first; new refs are
 * appended in order.
 */
export function mergeSourceRefs(
  existing: BbSourceRef[],
  incoming: BbSourceRef[],
): MergeResult {
  const seen = new Set<string>();
  const key = (r: BbSourceRef) =>
    `${r.source_id}|${r.extraction_id ?? ""}|${(r.snippet ?? "").slice(0, 200)}`;
  const out: BbSourceRef[] = [];
  for (const r of existing) {
    const k = key(r);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  let added = 0;
  for (const r of incoming) {
    const k = key(r);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
    added += 1;
  }
  return { source_refs: out, added };
}
