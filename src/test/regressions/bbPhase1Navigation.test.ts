/**
 * Phase 1 — Navigation activation fix.
 *
 * Locks in:
 *  - Sidebar "Knowledge" entry now resolves to /brain (was the broken
 *    /knowledge that had no route mounted).
 *  - The user-facing label reads "Business Brain".
 */
import { describe, expect, it } from "vitest";
import { WORKSPACE_NAV } from "@/config/canonicalNav";

describe("Phase 1 — canonical nav repoints Knowledge to Business Brain", () => {
  const item = WORKSPACE_NAV.find((n) => n.key === "knowledge");

  it("keeps the canonical key for back-compat", () => {
    expect(item).toBeDefined();
  });

  it("routes to the mounted /brain shell, not the broken /knowledge path", () => {
    expect(item?.to).toBe("brain");
  });

  it("uses the user-facing label 'Business Brain'", () => {
    expect(item?.label).toBe("Business Brain");
  });
});
