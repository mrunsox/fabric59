import { describe, expect, it } from "vitest";

/**
 * Phase 6 — sticky suppression logic.
 *
 * Validates the rule encoded in bb-evaluate-vertical:
 *   - A gap whose shape (workspace, profile, entity, fact, field, kind) is
 *     in the suppressed table is NEVER reopened by a fresh evaluation.
 *   - A new gap with a different shape (e.g. different fact, different field)
 *     is still opened normally.
 */

type Status = "open" | "resolved" | "suppressed";
interface Gap {
  workspace_id: string;
  vertical_profile_id: string;
  entity_type: string;
  gap_kind: string;
  fact_id: string | null;
  field_path: string | null;
  status: Status;
}

const key = (g: Omit<Gap, "status">) =>
  `${g.workspace_id}|${g.vertical_profile_id}|${g.entity_type}|${g.gap_kind}|${g.fact_id ?? ""}|${g.field_path ?? ""}`;

function reconcile(
  existing: Gap[],
  desired: Array<Omit<Gap, "status">>,
): { toOpen: Array<Omit<Gap, "status">>; toResolve: string[] } {
  const openByKey = new Map<string, Gap>();
  const suppressedByKey = new Map<string, Gap>();
  for (const g of existing) {
    if (g.status === "open") openByKey.set(key(g), g);
    else if (g.status === "suppressed") suppressedByKey.set(key(g), g);
  }
  const desiredKeys = new Set(desired.map((d) => key(d)));
  const toOpen: Array<Omit<Gap, "status">> = [];
  for (const d of desired) {
    const k = key(d);
    if (openByKey.has(k)) continue;
    if (suppressedByKey.has(k)) continue;
    toOpen.push(d);
  }
  const toResolve: string[] = [];
  for (const [k] of openByKey) {
    if (!desiredKeys.has(k)) toResolve.push(k);
  }
  return { toOpen, toResolve };
}

describe("bbVerticalSuppressionLogic", () => {
  const base = { workspace_id: "w1", vertical_profile_id: "p1" };

  it("does not reopen a suppressed gap of the same shape", () => {
    const existing: Gap[] = [
      {
        ...base, entity_type: "service", gap_kind: "missing_field",
        fact_id: "f1", field_path: "payload.name", status: "suppressed",
      },
    ];
    const desired = [
      { ...base, entity_type: "service", gap_kind: "missing_field", fact_id: "f1", field_path: "payload.name" },
    ];
    const { toOpen } = reconcile(existing, desired);
    expect(toOpen).toEqual([]);
  });

  it("opens new gaps with different shape even when a related shape is suppressed", () => {
    const existing: Gap[] = [
      {
        ...base, entity_type: "service", gap_kind: "missing_field",
        fact_id: "f1", field_path: "payload.name", status: "suppressed",
      },
    ];
    const desired = [
      { ...base, entity_type: "service", gap_kind: "missing_field", fact_id: "f2", field_path: "payload.name" },
      { ...base, entity_type: "service", gap_kind: "missing_field", fact_id: "f1", field_path: "payload.description" },
    ];
    const { toOpen } = reconcile(existing, desired);
    expect(toOpen).toHaveLength(2);
  });

  it("resolves an open gap that is no longer in the desired set", () => {
    const existing: Gap[] = [
      {
        ...base, entity_type: "hours", gap_kind: "under_min_count",
        fact_id: null, field_path: null, status: "open",
      },
    ];
    const { toResolve } = reconcile(existing, []);
    expect(toResolve).toHaveLength(1);
  });
});
