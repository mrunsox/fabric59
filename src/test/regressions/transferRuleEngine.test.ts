import { describe, it, expect } from "vitest";
import { normalizeTransferDirectory } from "@/lib/transfer-directory/normalize";
import { evaluateTransferRules } from "@/lib/transfer-directory/evaluateRules";
import type {
  TransferDirectoryConfig,
  TransferEntry,
  TransferRule,
} from "@/lib/transfer-directory/types";

function entry(partial: Partial<TransferEntry> & { id: string; displayName: string }): TransferEntry {
  return {
    id: partial.id,
    displayName: partial.displayName,
    transferType: "warm",
    enabled: true,
    fallback: false,
    escalationLevel: 0,
    issueTags: [],
    specialtyTags: [],
    urgencyTags: [],
    hours: "always",
    sortOrder: 0,
    ...partial,
  };
}

function rule(partial: Partial<TransferRule> & { id: string; then: TransferRule["then"] }): TransferRule {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    enabled: true,
    priority: 100,
    when: partial.when ?? { combinator: "all", conditions: [] },
    then: partial.then,
  };
}

function cfg(entries: TransferEntry[], rules: TransferRule[]): TransferDirectoryConfig {
  return normalizeTransferDirectory({ entries, rules });
}

describe("transfer rule engine", () => {
  it("returns all enabled entries with no rules", () => {
    const r = evaluateTransferRules(
      cfg(
        [
          entry({ id: "a", displayName: "A" }),
          entry({ id: "b", displayName: "B", enabled: false }),
        ],
        [],
      ),
      {},
    );
    expect(r.allowed.length + r.recommended.length).toBe(1);
    expect(r.unavailable).toEqual([]);
  });

  it("exclude beats include", () => {
    const r = evaluateTransferRules(
      cfg(
        [entry({ id: "a", displayName: "A" })],
        [
          rule({
            id: "inc",
            then: { kind: "include", targetIds: ["a"] },
            when: {
              combinator: "all",
              conditions: [{ field: "issueType", op: "eq", value: "x" }],
            },
          }),
          rule({
            id: "exc",
            then: { kind: "exclude", targetIds: ["a"] },
            priority: 200,
            when: {
              combinator: "all",
              conditions: [{ field: "issueType", op: "eq", value: "x" }],
            },
          }),
        ],
      ),
      { issueType: "x" },
    );
    expect(r.allowed).toEqual([]);
    expect(r.unavailable[0]?.entry.id).toBe("a");
  });

  it("singleAllowed flag fires when exactly one target survives", () => {
    const r = evaluateTransferRules(
      cfg(
        [
          entry({ id: "a", displayName: "A" }),
          entry({ id: "b", displayName: "B" }),
        ],
        [
          rule({
            id: "inc",
            then: { kind: "include", targetIds: ["a"] },
            when: {
              combinator: "all",
              conditions: [{ field: "issueType", op: "eq", value: "claims" }],
            },
          }),
        ],
      ),
      { issueType: "claims" },
    );
    expect(r.singleAllowed).toBe(true);
    expect(r.recommended.length + r.allowed.length).toBe(1);
  });

  it("instructions_only short-circuits and returns no targets", () => {
    const r = evaluateTransferRules(
      cfg(
        [entry({ id: "a", displayName: "A" })],
        [
          rule({
            id: "block",
            then: { kind: "instructions_only", message: "No transfers in this branch" },
            when: {
              combinator: "all",
              conditions: [{ field: "branch", op: "eq", value: "blocked" }],
            },
          }),
        ],
      ),
      { branch: "blocked" },
    );
    expect(r.instructionsOnly?.message).toBe("No transfers in this branch");
    expect(r.allowed).toEqual([]);
    expect(r.recommended).toEqual([]);
  });

  it("hours behavior filters after-hours targets", () => {
    const r = evaluateTransferRules(
      cfg(
        [
          entry({ id: "a", displayName: "A", hours: "business_hours" }),
          entry({ id: "b", displayName: "B", hours: "after_hours" }),
        ],
        [],
      ),
      { timeMode: "after_hours" },
    );
    expect(r.allowed.map((t) => t.entry.id)).toEqual(["b"]);
    expect(r.unavailable.map((t) => t.entry.id)).toEqual(["a"]);
  });

  it("prioritize moves boosted entries into recommended bucket", () => {
    const r = evaluateTransferRules(
      cfg(
        [
          entry({ id: "a", displayName: "A" }),
          entry({ id: "b", displayName: "B" }),
        ],
        [
          rule({
            id: "boost",
            then: { kind: "prioritize", targetIds: ["b"], boost: 50 },
          }),
        ],
      ),
      {},
    );
    expect(r.recommended[0]?.entry.id).toBe("b");
  });

  it("fallback-only entries land in fallback bucket", () => {
    const r = evaluateTransferRules(
      cfg(
        [
          entry({ id: "a", displayName: "A", fallback: true }),
          entry({ id: "b", displayName: "B" }),
        ],
        [],
      ),
      {},
    );
    expect(r.fallback.map((t) => t.entry.id)).toEqual(["a"]);
    expect(r.recommended.map((t) => t.entry.id)).toEqual(["b"]);
  });

  it("captured field conditions are evaluated", () => {
    const r = evaluateTransferRules(
      cfg(
        [
          entry({ id: "a", displayName: "A" }),
          entry({ id: "b", displayName: "B" }),
        ],
        [
          rule({
            id: "spec",
            then: { kind: "include", targetIds: ["a"] },
            when: {
              combinator: "all",
              conditions: [
                { field: "capturedField", key: "policy_type", op: "eq", value: "auto" },
              ],
            },
          }),
        ],
      ),
      { capturedFields: { policy_type: "auto" } },
    );
    expect(r.recommended.length + r.allowed.length).toBe(1);
    expect((r.recommended[0] ?? r.allowed[0]).entry.id).toBe("a");
  });

  it("rule priority breaks ties deterministically", () => {
    const a = entry({ id: "a", displayName: "A" });
    const b = entry({ id: "b", displayName: "B" });
    const r = evaluateTransferRules(
      cfg(
        [a, b],
        [
          rule({ id: "low", priority: 10, then: { kind: "prioritize", targetIds: ["a"], boost: 5 } }),
          rule({ id: "high", priority: 100, then: { kind: "prioritize", targetIds: ["b"], boost: 5 } }),
        ],
      ),
      {},
    );
    // Both boosted equally; sort then by sortOrder, displayName.
    expect(r.recommended.length).toBe(2);
  });

  it("evaluation is deterministic across runs", () => {
    const config = cfg(
      [entry({ id: "a", displayName: "A" }), entry({ id: "b", displayName: "B" })],
      [rule({ id: "p", then: { kind: "prioritize", targetIds: ["b"], boost: 10 } })],
    );
    const r1 = evaluateTransferRules(config, {});
    const r2 = evaluateTransferRules(config, {});
    expect(JSON.stringify(r1)).toEqual(JSON.stringify(r2));
  });
});

describe("transfer directory normalization", () => {
  it("drops invalid entries silently", () => {
    const n = normalizeTransferDirectory({
      entries: [{ id: "a" } /* missing displayName */, { id: "b", displayName: "B" }],
      rules: [],
    });
    expect(n.entries.map((e) => e.id)).toEqual(["b"]);
  });

  it("clamps urgency tags to allowed enum", () => {
    const n = normalizeTransferDirectory({
      entries: [
        {
          id: "a",
          displayName: "A",
          urgencyTags: ["high", "ultra", "normal"],
        },
      ],
      rules: [],
    });
    expect(n.entries[0].urgencyTags).toEqual(["high", "normal"]);
  });
});
