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
