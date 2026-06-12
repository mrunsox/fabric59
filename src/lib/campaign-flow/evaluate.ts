import type { FlowCondition, FlowConditionGroup, FlowRule } from "@/types/campaign-flow";

/** Evaluate a single condition against an answers record. */
export function evalCondition(c: FlowCondition, values: Record<string, unknown>): boolean {
  const v = values[c.source];
  switch (c.op) {
    case "eq": return v === c.value;
    case "neq": return v !== c.value;
    case "in": return Array.isArray(c.value) && c.value.includes(String(v));
    case "not_in": return Array.isArray(c.value) && !c.value.includes(String(v));
    case "contains": return typeof v === "string" && typeof c.value === "string" && v.includes(c.value);
    case "gt": return Number(v) > Number(c.value);
    case "lt": return Number(v) < Number(c.value);
    case "is_set": return v !== undefined && v !== null && v !== "";
    case "is_empty": return v === undefined || v === null || v === "";
    default: return false;
  }
}

export function evalGroup(g: FlowConditionGroup, values: Record<string, unknown>): boolean {
  if (g.conditions.length === 0) return true;
  return g.combinator === "AND"
    ? g.conditions.every((c) => evalCondition(c, values))
    : g.conditions.some((c) => evalCondition(c, values));
}

/** Rule fires when ANY group passes (OR of AND-groups). */
export function ruleFires(r: FlowRule, values: Record<string, unknown>): boolean {
  if (r.groups.length === 0) return false;
  return r.groups.some((g) => evalGroup(g, values));
}
