import { describe, it, expect } from "vitest";
import { formSchemaV1Zod, migrateLegacyFormSchema } from "@/lib/forms/schema-zod";
import { emptyFormSchemaV1, FORM_SCHEMA_VERSION } from "@/types/form-schema";

/**
 * FormSchemaV1 contract — Phase C lock.
 *
 * - Raw V1 payloads must validate.
 * - Legacy lead-capture payloads must NOT validate against the raw schema.
 * - migrateLegacyFormSchema must always produce a payload that DOES validate.
 */

describe("FormSchemaV1 — raw validation", () => {
  it("accepts a minimal valid V1 schema", () => {
    const ok = emptyFormSchemaV1();
    const parsed = formSchemaV1Zod.safeParse(ok);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.schemaVersion).toBe(FORM_SCHEMA_VERSION);
      expect(parsed.data.sections.length).toBeGreaterThan(0);
    }
  });

  it("accepts a fully-populated V1 schema with logic and outcomes", () => {
    const schema = {
      schemaVersion: 1 as const,
      sections: [
        {
          id: "sec-1",
          title: "Caller info",
          description: "",
          fields: [
            { id: "f1", key: "first_name", type: "text" as const, label: "First name", required: true },
            { id: "f2", key: "rating", type: "rating" as const, label: "Rating" },
            { id: "f3", key: "interest", type: "select" as const, label: "Interest", options: [{ label: "Yes", value: "yes" }] },
          ],
        },
      ],
      logic: [
        {
          id: "rule-1",
          name: "End on no interest",
          groups: [{ all: [{ fieldKey: "interest", op: "equals" as const, value: "no" }] }],
          actions: [{ type: "end_with_outcome" as const, outcomeKey: "not_interested" }],
          enabled: true,
        },
      ],
      outcomes: [{ key: "not_interested", label: "Not interested" }],
    };
    expect(formSchemaV1Zod.safeParse(schema).success).toBe(true);
  });

  it("rejects a legacy lead-capture-style payload", () => {
    const legacy = {
      fields: [
        { id: "x", key: "name", type: "text", label: "Name" },
      ],
      confirmation: "Thanks!",
    };
    const parsed = formSchemaV1Zod.safeParse(legacy);
    expect(parsed.success).toBe(false);
  });

  it("rejects a payload missing schemaVersion", () => {
    const bad = { sections: [], logic: [], outcomes: [] };
    expect(formSchemaV1Zod.safeParse(bad).success).toBe(false);
  });
});

describe("migrateLegacyFormSchema — idempotent upgrader", () => {
  it("wraps a legacy { fields: [] } payload into a single-section V1 schema", () => {
    const legacy = {
      fields: [
        { id: "a", key: "first_name", type: "text", label: "First name", required: true },
        { id: "b", key: "email", type: "email", label: "Email" },
      ],
      confirmation: "Thanks!",
    };
    const migrated = migrateLegacyFormSchema(legacy);
    expect(migrated.schemaVersion).toBe(FORM_SCHEMA_VERSION);
    expect(migrated.sections).toHaveLength(1);
    expect(migrated.sections[0].fields).toHaveLength(2);
    expect(formSchemaV1Zod.safeParse(migrated).success).toBe(true);
  });

  it("returns an empty valid V1 for null / undefined / non-object input", () => {
    for (const input of [null, undefined, 42, "x"]) {
      const out = migrateLegacyFormSchema(input);
      expect(formSchemaV1Zod.safeParse(out).success).toBe(true);
    }
  });

  it("is idempotent on already-V1 payloads", () => {
    const v1 = emptyFormSchemaV1();
    const a = migrateLegacyFormSchema(v1);
    const b = migrateLegacyFormSchema(a);
    expect(formSchemaV1Zod.safeParse(b).success).toBe(true);
    expect(b.schemaVersion).toBe(FORM_SCHEMA_VERSION);
  });
});
