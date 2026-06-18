import { describe, expect, it } from "vitest";

/**
 * Phase 6 — pure logic test for the vertical evaluation algorithm.
 *
 * Mirrors the readPath + isEmpty + open/resolve transitions used by
 * supabase/functions/bb-evaluate-vertical/index.ts so we can validate the
 * algorithm without booting the edge function.
 */

type GapKind = "missing_entity" | "missing_field" | "under_min_count";

interface EntityReq { entity_type: string; min_count: number }
interface FieldReq { entity_type: string; field_path: string }
interface Fact { id: string; entity_type: string; payload: Record<string, unknown> }

function readPath(obj: unknown, path: string): unknown {
  if (obj == null || typeof obj !== "object") return undefined;
  let cur: unknown = obj;
  for (const p of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}
function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length === 0;
  return false;
}

function evaluate(
  facts: Fact[],
  entityReqs: EntityReq[],
  fieldReqs: FieldReq[],
): Array<{ kind: GapKind; entity: string; factId: string | null; fieldPath: string | null }> {
  const byType = new Map<string, Fact[]>();
  for (const f of facts) {
    const arr = byType.get(f.entity_type) ?? [];
    arr.push(f);
    byType.set(f.entity_type, arr);
  }
  const gaps: Array<{ kind: GapKind; entity: string; factId: string | null; fieldPath: string | null }> = [];
  for (const r of entityReqs) {
    const present = byType.get(r.entity_type) ?? [];
    if (present.length < r.min_count) {
      gaps.push({ kind: "under_min_count", entity: r.entity_type, factId: null, fieldPath: null });
    }
    const fields = fieldReqs.filter((fr) => fr.entity_type === r.entity_type);
    for (const fact of present) {
      for (const fr of fields) {
        const path = fr.field_path.startsWith("payload.") ? fr.field_path.slice(8) : fr.field_path;
        if (isEmpty(readPath(fact.payload, path))) {
          gaps.push({ kind: "missing_field", entity: r.entity_type, factId: fact.id, fieldPath: fr.field_path });
        }
      }
    }
  }
  return gaps;
}

describe("bbVerticalEvaluationLogic", () => {
  const entityReqs: EntityReq[] = [
    { entity_type: "service", min_count: 1 },
    { entity_type: "hours", min_count: 1 },
    { entity_type: "escalation_contact", min_count: 1 },
  ];
  const fieldReqs: FieldReq[] = [
    { entity_type: "service", field_path: "payload.name" },
    { entity_type: "hours", field_path: "payload.hours" },
    { entity_type: "escalation_contact", field_path: "payload.contact" },
  ];

  it("opens under_min_count when entity is absent", () => {
    const gaps = evaluate([], entityReqs, fieldReqs);
    expect(gaps.filter((g) => g.kind === "under_min_count").map((g) => g.entity).sort()).toEqual([
      "escalation_contact", "hours", "service",
    ]);
  });

  it("opens missing_field per fact when required field is empty", () => {
    const facts: Fact[] = [
      { id: "f1", entity_type: "service", payload: { name: "" } },
      { id: "f2", entity_type: "hours", payload: { hours: { mon: "9-5" } } },
      { id: "f3", entity_type: "escalation_contact", payload: {} },
    ];
    const gaps = evaluate(facts, entityReqs, fieldReqs);
    const missingFields = gaps.filter((g) => g.kind === "missing_field");
    expect(missingFields).toContainEqual({
      kind: "missing_field", entity: "service", factId: "f1", fieldPath: "payload.name",
    });
    expect(missingFields).toContainEqual({
      kind: "missing_field", entity: "escalation_contact", factId: "f3", fieldPath: "payload.contact",
    });
    // hours payload is non-empty so no missing_field there
    expect(missingFields.find((g) => g.entity === "hours")).toBeUndefined();
  });

  it("emits no gaps when all required entities and fields are present", () => {
    const facts: Fact[] = [
      { id: "f1", entity_type: "service", payload: { name: "Trash pickup" } },
      { id: "f2", entity_type: "hours", payload: { hours: { mon: "9-5" } } },
      { id: "f3", entity_type: "escalation_contact", payload: { contact: "supervisor@x" } },
    ];
    expect(evaluate(facts, entityReqs, fieldReqs)).toEqual([]);
  });
});
