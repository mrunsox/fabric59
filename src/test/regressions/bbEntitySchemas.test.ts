/**
 * Business Brain — entity-schema unit tests (Slice 1).
 */
import { describe, it, expect } from "vitest";
import { BB_ENTITY_TYPES } from "@/lib/business-brain/types";
import {
  ENTITY_SCHEMAS,
  canonicalKey,
  validateEntityPayload,
} from "@/lib/business-brain/entitySchemas";

describe("Business Brain — entity schemas", () => {
  it("ships exactly the 10 Phase 1 / Slice 1 entity types", () => {
    expect([...BB_ENTITY_TYPES].sort()).toEqual(
      [
        "department",
        "destination_contact",
        "escalation_contact",
        "faq",
        "hours",
        "intake_requirement",
        "phone",
        "policy",
        "service",
        "staff",
      ].sort(),
    );
  });

  it("each entity_type has a Zod schema", () => {
    for (const t of BB_ENTITY_TYPES) {
      expect(ENTITY_SCHEMAS[t]).toBeTruthy();
    }
  });

  it("validates a canonical staff payload and rejects an empty one", () => {
    expect(validateEntityPayload("staff", { name: "Jane Doe" }).ok).toBe(true);
    expect(validateEntityPayload("staff", { name: "" }).ok).toBe(false);
  });

  it("rejects faq payloads missing required fields", () => {
    expect(validateEntityPayload("faq", { question: "How?", answer: "Yes" }).ok).toBe(true);
    expect(validateEntityPayload("faq", { question: "How?" }).ok).toBe(false);
  });

  it("canonicalKey normalizes phone numbers to digits only", () => {
    const a = canonicalKey("phone", { number: "(212) 555-0100", label: "Main" });
    const b = canonicalKey("phone", { number: "212.555.0100", label: "Main line" });
    expect(a).toBe(b);
    expect(a).toBe("phone:2125550100");
  });

  it("canonicalKey lowercases and collapses whitespace for names", () => {
    const a = canonicalKey("department", { name: "Family   LAW" });
    const b = canonicalKey("department", { name: "family law" });
    expect(a).toBe(b);
  });
});

describe("Business Brain — Slice 2 schema hardening", () => {
  it("rejects phone numbers with fewer than 7 digits", () => {
    expect(validateEntityPayload("phone", { label: "Main", number: "(212) 555-0100" }).ok).toBe(true);
    expect(validateEntityPayload("phone", { label: "Main", number: "555-12" }).ok).toBe(false);
  });

  it("policy body is capped at 500 characters", () => {
    const longBody = "x".repeat(501);
    expect(validateEntityPayload("policy", { title: "T", body: "Short policy." }).ok).toBe(true);
    expect(validateEntityPayload("policy", { title: "T", body: longBody }).ok).toBe(false);
  });

  it("intake_requirement dedupes and lowercases its fields list", () => {
    const r = validateEntityPayload("intake_requirement", {
      label: "New client intake",
      fields: ["Name", "name", "EMAIL", "Email", "phone"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const data = r.data as { fields: string[] };
      expect(data.fields).toEqual(["name", "email", "phone"]);
    }
  });

  it("hours payload accepts an optional weekly structure", () => {
    expect(
      validateEntityPayload("hours", {
        label: "Office",
        schedule: "Mon-Fri 9-5",
        weekly: { mon: "9-5", tue: "9-5", wed: "9-5", thu: "9-5", fri: "9-5" },
      }).ok,
    ).toBe(true);
  });

  it("faq accepts an optional service association", () => {
    const r = validateEntityPayload("faq", {
      question: "What is your consult fee?",
      answer: "$250.",
      service: "Initial Consultation",
    });
    expect(r.ok).toBe(true);
  });
});
