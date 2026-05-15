import { describe, it, expect } from "vitest";
import { evaluateSchema, validateField } from "@/lib/forms/evaluateLogic";
import type { FormField, FormSchemaV1 } from "@/types/form-schema";

const sec = (id: string, fields: FormField[] = []) => ({
  id, title: id, description: "", fields,
});
const f = (key: string, type: FormField["type"] = "text", extra: Partial<FormField> = {}): FormField => ({
  id: key, key, type, label: key, ...extra,
});

function schema(partial: Partial<FormSchemaV1> = {}): FormSchemaV1 {
  return {
    schemaVersion: 1,
    sections: [sec("s1", [f("name"), f("email", "email")]), sec("s2", [f("notes")])],
    logic: [],
    outcomes: [{ key: "done", label: "Done" }],
    ...partial,
  };
}

describe("evaluateSchema — operators", () => {
  const ops = [
    { op: "equals" as const, val: "x", value: "x", expect: true },
    { op: "equals" as const, val: "x", value: "y", expect: false },
    { op: "not_equals" as const, val: "x", value: "y", expect: true },
    { op: "contains" as const, val: "hello world", value: "WORLD", expect: true },
    { op: "not_contains" as const, val: "abc", value: "z", expect: true },
    { op: "is_empty" as const, val: "", value: undefined, expect: true },
    { op: "is_not_empty" as const, val: "x", value: undefined, expect: true },
    { op: "gt" as const, val: 10, value: 5, expect: true },
    { op: "lt" as const, val: 3, value: 5, expect: true },
  ];
  for (const t of ops) {
    it(`${t.op} matches when expected`, () => {
      const s = schema({
        logic: [{
          id: "r", groups: [{ all: [{ fieldKey: "name", op: t.op, value: t.value }] }],
          actions: [{ type: "hide_field", fieldKey: "email" }],
        }],
      });
      const e = evaluateSchema(s, { name: t.val });
      expect(e.hiddenFieldKeys.has("email")).toBe(t.expect);
    });
  }
});

describe("evaluateSchema — group logic", () => {
  it("AND within group + OR across groups", () => {
    const s = schema({
      logic: [{
        id: "r",
        groups: [
          { all: [{ fieldKey: "name", op: "equals", value: "A" }, { fieldKey: "email", op: "equals", value: "a@b.c" }] },
          { all: [{ fieldKey: "name", op: "equals", value: "B" }] },
        ],
        actions: [{ type: "hide_field", fieldKey: "notes" }],
      }],
    });
    expect(evaluateSchema(s, { name: "A", email: "a@b.c" }).hiddenFieldKeys.has("notes")).toBe(true);
    expect(evaluateSchema(s, { name: "A", email: "x" }).hiddenFieldKeys.has("notes")).toBe(false);
    expect(evaluateSchema(s, { name: "B" }).hiddenFieldKeys.has("notes")).toBe(true);
    expect(evaluateSchema(s, { name: "C" }).hiddenFieldKeys.has("notes")).toBe(false);
  });

  it("show_field overrides hide_field", () => {
    const s = schema({
      logic: [
        { id: "r1", groups: [{ all: [] }], actions: [{ type: "hide_field", fieldKey: "email" }] },
        { id: "r2", groups: [{ all: [{ fieldKey: "name", op: "equals", value: "x" }] }], actions: [{ type: "show_field", fieldKey: "email" }] },
      ],
    });
    expect(evaluateSchema(s, { name: "x" }).hiddenFieldKeys.has("email")).toBe(false);
    expect(evaluateSchema(s, { name: "y" }).hiddenFieldKeys.has("email")).toBe(true);
  });

  it("disabled rules are skipped", () => {
    const s = schema({
      logic: [{
        id: "r", enabled: false,
        groups: [{ all: [] }],
        actions: [{ type: "hide_field", fieldKey: "email" }],
      }],
    });
    expect(evaluateSchema(s, {}).hiddenFieldKeys.has("email")).toBe(false);
  });
});

describe("evaluateSchema — actions", () => {
  it("captures jump_to_section, end_with_outcome, notifications", () => {
    const s = schema({
      logic: [{
        id: "r",
        groups: [{ all: [{ fieldKey: "name", op: "equals", value: "billing" }] }],
        actions: [
          { type: "jump_to_section", sectionId: "s2" },
          { type: "end_with_outcome", outcomeKey: "done" },
          { type: "trigger_notification", notificationKey: "email_billing" },
        ],
      }],
    });
    const e = evaluateSchema(s, { name: "billing" });
    expect(e.jumpToSectionId).toBe("s2");
    expect(e.endedOutcomeKey).toBe("done");
    expect(e.notificationsToFire).toEqual(["email_billing"]);
  });

  it("require_field augments and prefill writes only when empty", () => {
    const s = schema({
      logic: [{
        id: "r",
        groups: [{ all: [] }],
        actions: [
          { type: "require_field", fieldKey: "notes" },
          { type: "prefill", fieldKey: "name", value: "Default" },
        ],
      }],
    });
    const e = evaluateSchema(s, { name: "" });
    expect(e.requiredFieldKeys.has("notes")).toBe(true);
    expect(e.prefill.name).toBe("Default");

    const e2 = evaluateSchema(s, { name: "Existing" });
    expect(e2.prefill.name).toBeUndefined();
  });
});

describe("validateField", () => {
  it("flags required empty, invalid email, invalid url, min/max number", () => {
    expect(validateField(f("x"), "", true)).toMatch(/required/);
    expect(validateField(f("e", "email"), "not-email", false)).toMatch(/email/i);
    expect(validateField(f("u", "url"), "not a url", false)).toMatch(/url/i);
    expect(
      validateField(f("n", "number", { validation: { min: 5 } }), 1, false),
    ).toMatch(/≥ 5/);
    expect(
      validateField(f("n", "number", { validation: { max: 5 } }), 9, false),
    ).toMatch(/≤ 5/);
    expect(validateField(f("x"), "ok", true)).toBeNull();
  });
});
