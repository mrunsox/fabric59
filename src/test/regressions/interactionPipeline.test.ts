/**
 * Phase 7 · Submission → output pipeline regression suite.
 *
 * Covers the pure orchestration layer (contact match, adapter mapping,
 * notification routing, retry classification, end-to-end processInteraction)
 * plus the submission boundary's edge-function wiring + outbox resilience.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { resolveMatch } from "@/lib/call-runner/pipeline/contactMatch";
import {
  buildAdapterJobs,
  annotateWithContactLink,
} from "@/lib/call-runner/pipeline/adapterMapping";
import { routeNotifications, inferUrgency } from "@/lib/call-runner/pipeline/notificationRouting";
import {
  classifyError,
  backoffMs,
  shouldRetry,
  MAX_RETRY_ATTEMPTS,
} from "@/lib/call-runner/pipeline/retryClassification";
import {
  buildInteractionRecord,
  processInteraction,
} from "@/lib/call-runner/pipeline/processInteraction";
import {
  submitInteractionDraft,
  readPendingInteractions,
} from "@/lib/call-runner/submit";
import type { InteractionDraftPayload, CallSessionMeta } from "@/types/call-runner";
import type { ContactCandidate } from "@/lib/call-runner/pipeline/types";

const ROOT = path.resolve(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// ---- Shared fixtures ------------------------------------------------------

const META: CallSessionMeta = {
  workspaceId: "ws-1",
  campaignId: "c-1",
  callId: "call-7",
  ani: "+15555550100",
  startedAt: "2026-06-12T00:00:00.000Z",
};

const BASE_PAYLOAD: InteractionDraftPayload = {
  schemaVersion: 1,
  meta: META,
  values: {
    caller_name: "Pat Doe",
    caller_phone: "5555550100",
    caller_email: "pat@example.com",
    __outcome__: "new_intake",
    specialty: "personal_injury",
  },
  notes: "Caller wants a callback tomorrow.",
  outcomeCode: "new_intake",
  copilot: {
    draftSummary: "New intake; injured Tuesday.",
    suggestedNotificationTargets: ["ops@firm.example", "#intake"],
  },
  completedStepIds: ["s1", "s2", "s3"],
  finalizedAt: "2026-06-12T00:05:00.000Z",
};

const CANDIDATES: ContactCandidate[] = [
  { id: "c-a", fullName: "Pat Doe", phone: "+15555550100", email: "pat@example.com", lastActivityAt: "2026-06-01" },
  { id: "c-b", fullName: "Pat Doe", phone: "+15555550999", email: "other@example.com", lastActivityAt: "2026-06-05" },
];

const MAPPINGS = [
  { id: "m1", sourceKey: "caller_name", destinationKey: "contact.full_name" },
  { id: "m2", sourceKey: "caller_phone", destinationKey: "contact.phone" },
] as unknown as Parameters<typeof buildAdapterJobs>[1];

const CONNECTIONS = [
  { id: "conn-clio", provider: "clio" },
  { id: "conn-mycase", provider: "mycase" },
  { id: "conn-disabled", provider: "clio", disabled: true },
  { id: "conn-other", provider: "hubspot" }, // non-legal → filtered out
];

// ---- Contact match --------------------------------------------------------

describe("Phase 7 · contact match", () => {
  it("exact phone match → linked", () => {
    const rec = buildInteractionRecord(BASE_PAYLOAD);
    const out = resolveMatch(rec, [CANDIDATES[0]]);
    expect(out.kind).toBe("linked");
    if (out.kind === "linked") expect(out.via).toBe("phone");
  });

  it("multiple phone matches → ambiguous with deterministic chosen", () => {
    const rec = buildInteractionRecord(BASE_PAYLOAD);
    const dup = { ...CANDIDATES[0], id: "c-dup", lastActivityAt: "2026-06-10" };
    const out = resolveMatch(rec, [CANDIDATES[0], dup]);
    expect(out.kind).toBe("ambiguous");
    if (out.kind === "ambiguous") {
      expect(out.candidates.length).toBe(2);
      expect(out.chosen?.id).toBe("c-dup"); // most recent
    }
  });

  it("no signals → none", () => {
    const rec = buildInteractionRecord({
      ...BASE_PAYLOAD,
      values: {},
      meta: { ...META, ani: null },
    });
    expect(resolveMatch(rec, CANDIDATES).kind).toBe("none");
  });

  it("falls through to email when phone is unique-miss", () => {
    const rec = buildInteractionRecord({
      ...BASE_PAYLOAD,
      meta: { ...META, ani: "+15550000000" },
      values: { ...BASE_PAYLOAD.values, caller_phone: "" },
    });
    const out = resolveMatch(rec, [CANDIDATES[0]]);
    expect(out.kind).toBe("linked");
    if (out.kind === "linked") expect(out.via).toBe("email");
  });
});

// ---- Adapter mapping ------------------------------------------------------

describe("Phase 7 · adapter mapping", () => {
  it("emits intake + note jobs for each active legal connection only", () => {
    const rec = buildInteractionRecord(BASE_PAYLOAD);
    const jobs = buildAdapterJobs(rec, MAPPINGS, CONNECTIONS);
    const providers = new Set(jobs.map((j) => j.provider));
    expect(providers).toEqual(new Set(["clio", "mycase"]));
    // hubspot + disabled excluded
    expect(jobs.find((j) => j.provider === "hubspot")).toBeUndefined();
    expect(jobs.find((j) => j.connectionId === "conn-disabled")).toBeUndefined();
    // Each provider gets create_intake + log_client_note (no followup for "new_intake")
    const actionsByProvider = jobs.reduce<Record<string, Set<string>>>((acc, j) => {
      (acc[j.provider] ??= new Set()).add(j.action);
      return acc;
    }, {});
    expect(actionsByProvider.clio.has("create_intake")).toBe(true);
    expect(actionsByProvider.clio.has("log_client_note")).toBe(true);
    expect(actionsByProvider.clio.has("create_followup_task")).toBe(false);
  });

  it("emits create_followup_task for callback-style outcomes", () => {
    const rec = buildInteractionRecord({ ...BASE_PAYLOAD, outcomeCode: "callback_requested" });
    const jobs = buildAdapterJobs(rec, MAPPINGS, CONNECTIONS.slice(0, 1));
    expect(jobs.some((j) => j.action === "create_followup_task")).toBe(true);
  });

  it("idempotency keys are deterministic and unique per (interaction, conn, action)", () => {
    const rec = buildInteractionRecord(BASE_PAYLOAD);
    const a = buildAdapterJobs(rec, MAPPINGS, CONNECTIONS);
    const b = buildAdapterJobs(rec, MAPPINGS, CONNECTIONS);
    expect(a.map((j) => j.idempotencyKey)).toEqual(b.map((j) => j.idempotencyKey));
    expect(new Set(a.map((j) => j.idempotencyKey)).size).toBe(a.length);
  });

  it("annotateWithContactLink injects matched contact_id", () => {
    const rec = buildInteractionRecord(BASE_PAYLOAD);
    const raw = buildAdapterJobs(rec, MAPPINGS, [CONNECTIONS[0]]);
    const annotated = annotateWithContactLink(raw, {
      kind: "linked",
      via: "phone",
      contact: CANDIDATES[0],
    });
    for (const j of annotated) {
      expect(j.payload.contact_id).toBe("c-a");
      expect(j.payload.contact_link).toBe("matched");
    }
  });
});

// ---- Notification routing -------------------------------------------------

describe("Phase 7 · notification routing", () => {
  const rules = [
    { id: "r1", outcomeMatch: "new_intake", channel: "email" as const, recipient: "intake@firm.example" },
    { id: "r2", outcomeMatch: "*", specialtyMatch: "personal_injury", channel: "slack" as const, recipient: "#pi" },
    { id: "r3", outcomeMatch: "callback", channel: "internal" as const, recipient: "queue:callbacks" },
  ];

  it("matches outcome + specialty rules", () => {
    const rec = buildInteractionRecord(BASE_PAYLOAD);
    const jobs = routeNotifications({ rec, rules });
    const recipients = jobs.map((j) => j.recipient);
    expect(recipients).toContain("intake@firm.example");
    expect(recipients).toContain("#pi");
    expect(recipients).not.toContain("queue:callbacks");
  });

  it("fallback fires for unmatched urgent interaction", () => {
    const urgentRec = buildInteractionRecord({ ...BASE_PAYLOAD, outcomeCode: "urgent_escalation" });
    const jobs = routeNotifications({
      rec: urgentRec,
      rules: [],
      fallbackInternalRecipient: "ops-supervisor",
    });
    expect(jobs.length).toBe(1);
    expect(jobs[0].recipient).toBe("ops-supervisor");
  });

  it("copilot-suggested targets are appended as advisory jobs", () => {
    const rec = buildInteractionRecord(BASE_PAYLOAD);
    const jobs = routeNotifications({
      rec,
      rules: [],
      copilotSuggestedTargets: ["ops@firm.example"],
    });
    expect(jobs.find((j) => j.triggerEvent === "interaction.copilot_suggested")).toBeTruthy();
  });

  it("inferUrgency reads explicit field then outcome heuristic", () => {
    const r1 = buildInteractionRecord({ ...BASE_PAYLOAD, values: { ...BASE_PAYLOAD.values, urgency: "high" } });
    expect(inferUrgency(r1)).toBe("high");
    const r2 = buildInteractionRecord({ ...BASE_PAYLOAD, outcomeCode: "emergency_callback", values: {} });
    expect(inferUrgency(r2)).toBe("urgent");
  });
});

// ---- Retry classification -------------------------------------------------

describe("Phase 7 · retry classification", () => {
  it("permanent errors are not retried", () => {
    expect(classifyError("payload_validation_failed")).toBe("permanent");
    expect(classifyError("unauthorized 401")).toBe("permanent");
    expect(shouldRetry("payload_validation_failed", 1)).toBe(false);
  });

  it("transient errors retry up to MAX_RETRY_ATTEMPTS", () => {
    expect(classifyError("Gateway timeout 504")).toBe("transient");
    expect(shouldRetry("timeout", MAX_RETRY_ATTEMPTS - 1)).toBe(true);
    expect(shouldRetry("timeout", MAX_RETRY_ATTEMPTS)).toBe(false);
  });

  it("backoff increases monotonically and caps", () => {
    const a = backoffMs(1);
    const b = backoffMs(3);
    const c = backoffMs(99);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeLessThanOrEqual(15 * 60_000);
  });
});

// ---- End-to-end orchestrator ----------------------------------------------

describe("Phase 7 · processInteraction (orchestrator)", () => {
  it("produces InteractionRecord + matched contact + adapter jobs + notifications + log", () => {
    const result = processInteraction({
      payload: BASE_PAYLOAD,
      contactCandidates: [CANDIDATES[0]],
      mappings: MAPPINGS,
      connections: CONNECTIONS,
      notificationRules: [
        { id: "r1", outcomeMatch: "new_intake", channel: "email", recipient: "intake@firm.example" },
      ],
    });
    expect(result.interaction.id).toBe("int_call-7");
    expect(result.contactMatch.kind).toBe("linked");
    expect(result.adapterJobs.length).toBeGreaterThan(0);
    expect(result.notificationJobs.some((j) => j.recipient === "intake@firm.example")).toBe(true);
    // Sync log covers every major step.
    const steps = new Set(result.log.map((l) => l.step));
    expect(steps.has("interaction_record_created")).toBe(true);
    expect(steps.has("contact_match")).toBe(true);
    expect(steps.has("adapter_writeback_enqueued")).toBe(true);
    expect(steps.has("notification_enqueued")).toBe(true);
    expect(steps.has("pipeline_completed")).toBe(true);
  });

  it("ambiguous match lands an entry in the exception queue", () => {
    const dup = { ...CANDIDATES[0], id: "c-dup" };
    const result = processInteraction({
      payload: BASE_PAYLOAD,
      contactCandidates: [CANDIDATES[0], dup],
      mappings: MAPPINGS,
      connections: [CONNECTIONS[0]],
      notificationRules: [],
    });
    expect(result.contactMatch.kind).toBe("ambiguous");
    expect(result.exceptions.some((e) => e.operation === "contact_match")).toBe(true);
  });

  it("idempotency: same payload produces stable interaction id + job keys on replay", () => {
    const a = processInteraction({
      payload: BASE_PAYLOAD,
      contactCandidates: CANDIDATES,
      mappings: MAPPINGS,
      connections: CONNECTIONS,
      notificationRules: [],
    });
    const b = processInteraction({
      payload: BASE_PAYLOAD,
      contactCandidates: CANDIDATES,
      mappings: MAPPINGS,
      connections: CONNECTIONS,
      notificationRules: [],
    });
    expect(b.interaction.id).toBe(a.interaction.id);
    expect(b.adapterJobs.map((j) => j.idempotencyKey)).toEqual(a.adapterJobs.map((j) => j.idempotencyKey));
  });

  it("no legal connections → no adapter jobs, pipeline still completes", () => {
    const result = processInteraction({
      payload: BASE_PAYLOAD,
      contactCandidates: [],
      mappings: MAPPINGS,
      connections: [{ id: "x", provider: "hubspot" }],
      notificationRules: [],
    });
    expect(result.adapterJobs.length).toBe(0);
    expect(result.log[result.log.length - 1].step).toBe("pipeline_completed");
  });
});

// ---- Submission boundary --------------------------------------------------

describe("Phase 7 · submission boundary", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("submitInteractionDraft writes to the outbox AND attempts the pipeline invocation", async () => {
    // The Phase 6 contract (outbox enqueue) is preserved. Whether the edge
    // function call resolves or rejects in the test env, submission must
    // never throw and must always populate the outbox.
    const result = await submitInteractionDraft(BASE_PAYLOAD);
    expect(result.queuedAt).toBeTruthy();
    expect(result.pipelineStatus).toMatch(/accepted|deferred/);
    expect(readPendingInteractions().length).toBe(1);
    expect(readPendingInteractions()[0].payload.meta.callId).toBe("call-7");
  });

  it("submitInteractionDraft is non-blocking when the edge call fails", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    vi.spyOn(supabase.functions, "invoke").mockRejectedValue(new Error("offline"));
    const result = await submitInteractionDraft(BASE_PAYLOAD);
    expect(result.pipelineStatus).toBe("deferred");
    expect(readPendingInteractions().length).toBe(1);
  });
});

// ---- Vocabulary containment ----------------------------------------------

describe("Phase 7 · vocabulary containment", () => {
  it("pipeline modules do not hardcode legal vocabulary", () => {
    const files = [
      "lib/call-runner/pipeline/types.ts",
      "lib/call-runner/pipeline/contactMatch.ts",
      "lib/call-runner/pipeline/adapterMapping.ts",
      "lib/call-runner/pipeline/notificationRouting.ts",
      "lib/call-runner/pipeline/retryClassification.ts",
      "lib/call-runner/pipeline/processInteraction.ts",
      "lib/call-runner/submit.ts",
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(
        /law firm|attorney|practice area\b|legal advice/i.test(src),
        `${rel} leaks legal vocab`,
      ).toBe(false);
    }
  });
});

// ---- Existing edge-function presence -------------------------------------

describe("Phase 7 · edge function wiring", () => {
  it("interaction-pipeline edge function exists with required entry points", () => {
    const fnPath = path.resolve(process.cwd(), "supabase/functions/interaction-pipeline/index.ts");
    expect(fs.existsSync(fnPath)).toBe(true);
    const src = fs.readFileSync(fnPath, "utf8");
    expect(src).toMatch(/legal_connect_sync_jobs/);
    expect(src).toMatch(/legal_connect_event_log/);
    expect(src).toMatch(/platform_events/);
    expect(src).toMatch(/notifications/);
    expect(src).toMatch(/onConflict: "idempotency_key"/);
  });
});
