import { describe, it, expect } from "vitest";
import { normalizeExternalResources } from "@/lib/external-resources/normalize";
import { evaluateResources } from "@/lib/external-resources/evaluateResources";
import type {
  ExternalResource,
  ExternalResourceRule,
} from "@/lib/external-resources/types";

function resource(p: Partial<ExternalResource> & { id: string; label: string }): ExternalResource {
  return {
    id: p.id,
    label: p.label,
    kind: "website",
    url: "https://x.example.com",
    enabled: true,
    openMode: "auto",
    sortOrder: 0,
    tags: [],
    issueTags: [],
    specialtyTags: [],
    dispositionTags: [],
    urgencyTags: [],
    allowParamInjection: false,
    ...p,
  };
}

function rule(p: Partial<ExternalResourceRule> & { id: string; then: ExternalResourceRule["then"] }): ExternalResourceRule {
  return {
    id: p.id,
    name: p.name ?? p.id,
    enabled: true,
    priority: 100,
    when: p.when ?? { combinator: "all", conditions: [] },
    then: p.then,
  };
}

function cfg(resources: ExternalResource[], rules: ExternalResourceRule[]) {
  return normalizeExternalResources({ resources, rules });
}

describe("external-resource rule engine", () => {
  it("returns enabled resources with no rules", () => {
    const r = evaluateResources(
      cfg(
        [resource({ id: "a", label: "A" }), resource({ id: "b", label: "B", enabled: false })],
        [],
      ),
      {},
    );
    expect([...r.recommended, ...r.available].map((x) => x.resource.id)).toEqual(["a"]);
    expect(r.hidden).toEqual([]);
  });

  it("hide beats show — same target", () => {
    const r = evaluateResources(
      cfg(
        [resource({ id: "a", label: "A" })],
        [
          rule({ id: "s", then: { kind: "show", targetIds: ["a"] }, priority: 200 }),
          rule({ id: "h", then: { kind: "hide", targetIds: ["a"] }, priority: 50 }),
        ],
      ),
      {},
    );
    expect(r.hidden.length).toBe(1);
    expect(r.available.length + r.recommended.length).toBe(0);
  });

  it("show rule restricts visible set", () => {
    const r = evaluateResources(
      cfg(
        [resource({ id: "a", label: "A" }), resource({ id: "b", label: "B" })],
        [
          rule({
            id: "s",
            then: { kind: "show", targetIds: ["a"] },
            when: { combinator: "all", conditions: [{ field: "issueType", op: "eq", value: "x" }] },
          }),
        ],
      ),
      { issueType: "x" },
    );
    expect([...r.recommended, ...r.available].map((x) => x.resource.id)).toEqual(["a"]);
    expect(r.hidden.map((x) => x.resource.id)).toEqual(["b"]);
  });

  it("prioritize promotes target to recommended bucket", () => {
    const r = evaluateResources(
      cfg(
        [resource({ id: "a", label: "A" }), resource({ id: "b", label: "B" })],
        [rule({ id: "p", then: { kind: "prioritize", targetIds: ["b"], boost: 50 } })],
      ),
      {},
    );
    expect(r.recommended[0]?.resource.id).toBe("b");
  });

  it("suggest flags message and bucket", () => {
    const r = evaluateResources(
      cfg(
        [resource({ id: "a", label: "A" })],
        [rule({ id: "sg", then: { kind: "suggest", targetIds: ["a"], message: "use this" } })],
      ),
      {},
    );
    expect(r.recommended[0]?.suggestion).toBe("use this");
  });

  it("auto_open_if_safe is suppressed in embed mode for replace_center resources", () => {
    const r = evaluateResources(
      cfg(
        [resource({ id: "a", label: "A", openMode: "replace_center" })],
        [rule({ id: "ao", then: { kind: "auto_open_if_safe", targetId: "a" } })],
      ),
      { embedMode: "embed" },
    );
    expect(r.autoOpenCandidate).toBeNull();
  });

  it("auto_open_if_safe is honored in internal mode for drawer resources", () => {
    const r = evaluateResources(
      cfg(
        [resource({ id: "a", label: "A", openMode: "drawer" })],
        [rule({ id: "ao", then: { kind: "auto_open_if_safe", targetId: "a" } })],
      ),
      { embedMode: "internal" },
    );
    expect(r.autoOpenCandidate?.resource.id).toBe("a");
  });

  it("auto_open_if_safe is suppressed when resource requires confirmation", () => {
    const r = evaluateResources(
      cfg(
        [resource({ id: "a", label: "A", openMode: "drawer", requiresConfirmation: true })],
        [rule({ id: "ao", then: { kind: "auto_open_if_safe", targetId: "a" } })],
      ),
      { embedMode: "internal" },
    );
    expect(r.autoOpenCandidate).toBeNull();
  });

  it("lone visible resource is promoted to recommended", () => {
    const r = evaluateResources(
      cfg([resource({ id: "a", label: "A" })], []),
      {},
    );
    expect(r.recommended.map((x) => x.resource.id)).toEqual(["a"]);
    expect(r.available).toEqual([]);
  });

  it("captured field conditions match", () => {
    const r = evaluateResources(
      cfg(
        [resource({ id: "a", label: "A" }), resource({ id: "b", label: "B" })],
        [
          rule({
            id: "cf",
            then: { kind: "show", targetIds: ["a"] },
            when: {
              combinator: "all",
              conditions: [{ field: "capturedField", key: "policy_type", op: "eq", value: "auto" }],
            },
          }),
        ],
      ),
      { capturedFields: { policy_type: "auto" } },
    );
    expect([...r.recommended, ...r.available].map((x) => x.resource.id)).toEqual(["a"]);
  });

  it("evaluation is deterministic across runs", () => {
    const c = cfg(
      [resource({ id: "a", label: "A" }), resource({ id: "b", label: "B" })],
      [rule({ id: "p", then: { kind: "prioritize", targetIds: ["b"], boost: 10 } })],
    );
    expect(JSON.stringify(evaluateResources(c, {}))).toEqual(JSON.stringify(evaluateResources(c, {})));
  });
});
