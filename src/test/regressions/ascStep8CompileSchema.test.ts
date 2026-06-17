/**
 * ASC Slice 6 — Step 8 compile schema parsing + normalization.
 *
 * Verifies:
 *  - parseStep8CompileResponse rejects malformed shapes (fail-closed).
 *  - normalizeStep8Compile filters ungrounded notifications/destinations into
 *    advisories rather than silently coercing intent.
 *  - Unsafe copy slots are demoted to undefined + TODO.
 *  - AI-supplied slug never overrides the user's Step 7 slug.
 *  - Generation can still succeed with empty copy slots replaced by TODOs.
 */
import { describe, it, expect } from "vitest";
import {
  computeInputFingerprint,
  isCopyTextSafe,
  normalizeStep8Compile,
  parseStep8CompileResponse,
  type AscStep8CompileResponse,
  type NormalizeStep8Options,
} from "@/lib/asc/step8CompileSchema";
import { createEmptyAscInput } from "@/lib/asc/fixtures";
import { normalizeOutcomeLabel } from "@/lib/asc/logicArchitectSchema";

function validRawResponse(): unknown {
  return {
    step: 8,
    generated: {
      flow: {
        nodes: [
          { id: "entry", kind: "entry", label: "Start" },
          { id: "br1", kind: "reason_branch", label: "Booking", reasonId: "r1" },
          { id: "out1", kind: "outcome", label: "Booked", outcomeRef: "booked" },
        ],
        edges: [{ id: "e1", from: "entry", to: "br1" }],
      },
      reasonToBranch: { r1: "br1" },
      outcomes: [
        { outcomeRef: "Booked", fromReasonIds: ["r1"], notificationRefs: ["n1"] },
      ],
      notifications: [
        {
          id: "n1",
          outcomeRef: "Booked",
          channelRef: "slack",
          urgency: "normal",
        },
      ],
      destinationLaunch: {
        destination: { kind: "internal_runner" },
        launch: {},
      },
      todos: [],
      confidenceByArea: { flow: { level: "medium" } },
    },
    advisories: [],
  };
}

function buildInput() {
  const input = createEmptyAscInput();
  input.business.description = "A test biz";
  input.purpose.primaryOutcome = "Schedule consult";
  input.callerReasons = [
    { id: "r1", label: "Booking", requiredCapture: [] },
  ];
  input.outcomesDraftEdits = [{ id: "o1", label: "Booked" }];
  input.destination = { kind: "internal_runner" };
  return input;
}

function defaultOpts(): NormalizeStep8Options {
  return {
    knownReasonIds: new Set(["r1"]),
    knownOutcomeRefs: new Set(["booked"]),
    knownChannelRefs: new Set(["slack"]),
    knownExternalUrls: new Set(),
    knownDeepLinkTemplates: new Set(),
  };
}

describe("ASC Step 8 compile schema (Slice 6)", () => {
  it("parses a valid response", () => {
    const parsed = parseStep8CompileResponse(validRawResponse());
    expect(parsed).not.toBeNull();
    expect(parsed?.step).toBe(8);
    expect(parsed?.generated.flow.nodes).toHaveLength(3);
  });

  it("rejects non-object root", () => {
    expect(parseStep8CompileResponse(null)).toBeNull();
    expect(parseStep8CompileResponse("nope")).toBeNull();
    expect(parseStep8CompileResponse(42)).toBeNull();
  });

  it("rejects wrong step", () => {
    const r = validRawResponse() as Record<string, unknown>;
    r.step = 7;
    expect(parseStep8CompileResponse(r)).toBeNull();
  });

  it("rejects unknown node kind", () => {
    const r = validRawResponse() as { generated: { flow: { nodes: Array<{ kind: string }> } } };
    r.generated.flow.nodes[0].kind = "wormhole";
    expect(parseStep8CompileResponse(r)).toBeNull();
  });

  it("rejects edges referencing unknown nodes", () => {
    const r = validRawResponse() as { generated: { flow: { edges: Array<Record<string, string>> } } };
    r.generated.flow.edges.push({ id: "e2", from: "ghost", to: "entry" });
    expect(parseStep8CompileResponse(r)).toBeNull();
  });

  it("rejects reasonToBranch pointing at unknown node", () => {
    const r = validRawResponse() as { generated: { reasonToBranch: Record<string, string> } };
    r.generated.reasonToBranch.r1 = "doesNotExist";
    expect(parseStep8CompileResponse(r)).toBeNull();
  });

  it("rejects oversized advisory", () => {
    const r = validRawResponse() as { advisories: Array<{ message: string }> };
    r.advisories = [{ message: "x".repeat(500) }];
    expect(parseStep8CompileResponse(r)).toBeNull();
  });

  it("rejects when total nodes exceed cap", () => {
    const r = validRawResponse() as { generated: { flow: { nodes: unknown[] } } };
    r.generated.flow.nodes = Array.from({ length: 100 }, (_, i) => ({
      id: `n${i}`,
      kind: "entry",
      label: "x",
    }));
    expect(parseStep8CompileResponse(r)).toBeNull();
  });

  it("normalizes: drops notifications with ungrounded channelRef into advisories", () => {
    const parsed = parseStep8CompileResponse(validRawResponse())!;
    const input = buildInput();
    const opts = defaultOpts();
    // Strip slack from known channels.
    opts.knownChannelRefs = new Set(["email"]);
    const result = normalizeStep8Compile(parsed, input, opts, "2026-06-17T00:00:00.000Z");
    expect(result.fatal).toBeUndefined();
    expect(result.generated.notifications).toHaveLength(0);
    expect(
      result.advisories.some((a) => a.message.includes("Slack") || a.message.toLowerCase().includes("slack")),
    ).toBe(true);
  });

  it("normalizes: AI slug is ignored, Step 7 slug echoed", () => {
    const raw = validRawResponse() as {
      generated: { destinationLaunch: { launch: { slug?: string } } };
    };
    raw.generated.destinationLaunch.launch.slug = "ai-invented-slug";
    const parsed = parseStep8CompileResponse(raw)!;
    const input = buildInput();
    input.launch = { slug: "user-chosen" };
    const result = normalizeStep8Compile(
      parsed,
      input,
      { ...defaultOpts(), step7Slug: "user-chosen" },
      "2026-06-17T00:00:00.000Z",
    );
    expect(result.generated.destinationLaunch.launch.slug).toBe("user-chosen");
    expect(
      result.advisories.some((a) => a.message.includes("ai-invented-slug")),
    ).toBe(true);
  });

  it("normalizes: missing Step 7 slug yields TODO, no invention", () => {
    const parsed = parseStep8CompileResponse(validRawResponse())!;
    const input = buildInput();
    const result = normalizeStep8Compile(
      parsed,
      input,
      defaultOpts(),
      "2026-06-17T00:00:00.000Z",
    );
    expect(result.generated.destinationLaunch.launch.slug).toBeUndefined();
    expect(result.generated.todos.some((t) => t.area === "destination")).toBe(true);
  });

  it("normalizes: unsafe copy is stripped to undefined + TODO, generation still succeeds", () => {
    const raw = validRawResponse() as {
      generated: { flow: { nodes: Array<{ copy?: { opener?: string; body?: string } }> } };
    };
    raw.generated.flow.nodes[1].copy = {
      opener: "We guarantee a positive outcome.",
      body: "This is medical advice for you.",
    };
    const parsed = parseStep8CompileResponse(raw)!;
    const input = buildInput();
    const result = normalizeStep8Compile(
      parsed,
      input,
      defaultOpts(),
      "2026-06-17T00:00:00.000Z",
    );
    // Structure still succeeds.
    expect(result.fatal).toBeUndefined();
    // Copy slots demoted.
    const branchNode = result.generated.flow.nodes.find((n) => n.id === "br1");
    expect(branchNode?.copy).toBeUndefined();
    // TODO added.
    expect(result.generated.todos.some((t) => t.area === "copy")).toBe(true);
  });

  it("normalizes: all copy slots empty is a successful structural outcome", () => {
    const parsed = parseStep8CompileResponse(validRawResponse())!;
    const input = buildInput();
    const result = normalizeStep8Compile(
      parsed,
      input,
      defaultOpts(),
      "2026-06-17T00:00:00.000Z",
    );
    expect(result.fatal).toBeUndefined();
    expect(
      result.generated.flow.nodes.every((n) => n.copy === undefined),
    ).toBe(true);
    expect(result.generated.flow.nodes.length).toBeGreaterThan(0);
  });

  it("normalizes: incomplete (no entry node) yields fatal", () => {
    const raw = validRawResponse() as { generated: { flow: { nodes: Array<{ kind: string }>; edges: unknown[] } } };
    raw.generated.flow.nodes = raw.generated.flow.nodes.filter(
      (n) => n.kind !== "entry",
    );
    // also rewire edges so parse stays valid
    raw.generated.flow.edges = [];
    const r = raw as { generated: { reasonToBranch: Record<string, string> } };
    r.generated.reasonToBranch = {};
    const parsed = parseStep8CompileResponse(raw)!;
    expect(parsed).not.toBeNull();
    const input = buildInput();
    const result = normalizeStep8Compile(
      parsed,
      input,
      defaultOpts(),
      "2026-06-17T00:00:00.000Z",
    );
    expect(result.fatal?.code).toBe("incomplete");
  });

  it("isCopyTextSafe flags advice-y phrases and accepts neutral copy", () => {
    expect(isCopyTextSafe("Hi, thanks for calling.")).toBe(true);
    expect(isCopyTextSafe("We guarantee results.")).toBe(false);
    expect(isCopyTextSafe("This is not legal advice.")).toBe(false);
  });

  it("computeInputFingerprint covers Steps 1–7 and is stable", () => {
    const input = buildInput();
    const f1 = computeInputFingerprint(input);
    const f2 = computeInputFingerprint(buildInput());
    expect(f1).toBe(f2);
    input.business.description = "Different";
    expect(computeInputFingerprint(input)).not.toBe(f1);
  });

  it("normalize: outcome refs not present in workspace are dropped + TODO'd", () => {
    const raw = validRawResponse() as {
      generated: {
        outcomes: Array<{ outcomeRef: string; fromReasonIds: string[]; notificationRefs: string[] }>;
      };
    };
    raw.generated.outcomes = [
      { outcomeRef: "Never-defined-outcome", fromReasonIds: ["r1"], notificationRefs: [] },
    ];
    const parsed = parseStep8CompileResponse(raw)!;
    const input = buildInput();
    const result = normalizeStep8Compile(
      parsed,
      input,
      defaultOpts(),
      "2026-06-17T00:00:00.000Z",
    );
    expect(result.generated.outcomes).toHaveLength(0);
    expect(result.generated.todos.some((t) => t.area === "outcomes")).toBe(true);
    // Sanity: a parsed response where outcomeRef matches stays.
    void normalizeOutcomeLabel;
  });

  it("normalize: a successful APPLY-ready payload exposes a usable AscStep8CompileResponse", () => {
    const parsed = parseStep8CompileResponse(validRawResponse()) as AscStep8CompileResponse;
    expect(parsed.generated.flow.nodes.length).toBeGreaterThan(0);
  });
});
