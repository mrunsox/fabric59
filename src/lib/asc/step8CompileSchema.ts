/**
 * ASC Slice 6 — Step 8 Logic Architect "compile" response contract.
 *
 * Separate from the Slice 5 proposal-list schema. Step 8 returns a single
 * compile artifact, NOT a proposal list. Strict validator returns null on
 * any deviation so malformed responses fail closed.
 *
 * ASC-local only. The shape mirrors `AscGenerated` from types.ts. Translation
 * into canonical campaign/guide/flow entities is the explicit job of a later
 * fork slice and does NOT happen here.
 */
import type {
  AscGenerated,
  AscGeneratedFlowEdge,
  AscGeneratedFlowNode,
  AscGeneratedNotification,
  AscGeneratedOutcomeLink,
  AscGeneratedTodo,
  AscGenerationArea,
  AscGenerationConfidence,
  AscWizardInput,
} from "./types";
import { normalizeOutcomeLabel } from "./logicArchitectSchema";

export const ASC_STEP8_NODE_KINDS = [
  "entry",
  "reason_branch",
  "handling",
  "outcome",
  "exit",
] as const;

export const ASC_STEP8_AREAS = [
  "flow",
  "copy",
  "outcomes",
  "notifications",
  "destination",
] as const;

export const ASC_STEP8_URGENCIES = ["low", "normal", "high"] as const;

export const ASC_STEP8_DESTINATION_KINDS = [
  "internal_runner",
  "external_url",
  "deep_link",
] as const;

export const ASC_STEP8_OPEN_MODES = [
  "same_tab",
  "new_tab",
  "side_panel",
] as const;

/** Hard caps to keep `intake_data.ascDraft` JSONB sane. */
export const ASC_STEP8_MAX_NODES = 60;
export const ASC_STEP8_MAX_EDGES = 120;
export const ASC_STEP8_MAX_TODOS = 60;
export const ASC_STEP8_MAX_NOTIFICATIONS = 30;
export const ASC_STEP8_MAX_OUTCOMES = 30;
export const ASC_STEP8_MAX_ADVISORIES = 12;

export interface AscStep8Advisory {
  message: string;
}

export interface AscStep8CompileResponse {
  step: 8;
  generated: Omit<AscGenerated, "schemaVersion" | "generatedAt" | "inputFingerprint">;
  advisories: AscStep8Advisory[];
}

/**
 * Tiny forbidden-phrase list. Hits demote copy slots to undefined and add
 * a matching TODO. Intentionally conservative — false positives are
 * preferable to leaking legal/medical/financial-advice phrasing.
 */
const FORBIDDEN_COPY_PATTERNS: RegExp[] = [
  /\bguarantee[sd]?\b/i,
  /\bguaranteed\b/i,
  /\blegally\b/i,
  /\blegal advice\b/i,
  /\bmedical advice\b/i,
  /\bdiagnos(?:e|is|ed)\b/i,
  /\bprescrib(?:e|ed|ing)\b/i,
  /\binvestment advice\b/i,
  /\bwe advise you to\b/i,
  /\byou (?:must|are required to) (?:hire|retain)\b/i,
];

export function isCopyTextSafe(s: string | undefined | null): boolean {
  if (!s) return true;
  return !FORBIDDEN_COPY_PATTERNS.some((re) => re.test(s));
}

// ── Stable input fingerprint ──────────────────────────────────────────────

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

/**
 * Stable fingerprint over the Step 1–7 inputs that influence compile.
 *
 * Per scope guard "inputFingerprint must match stale semantics", this covers
 * ALL of `AscWizardInput` — business, purpose, caller reasons + per-reason
 * handling, outcome edits, notification edits, destination, launch — because
 * Step 1 (business) and Step 2 (purpose) changes also stale generation.
 */
export function computeInputFingerprint(input: AscWizardInput): string {
  const s = stableStringify(input);
  // djb2
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `f1:${(h >>> 0).toString(36)}:${s.length.toString(36)}`;
}

// ── Validators ────────────────────────────────────────────────────────────

const NODE_KIND_SET: ReadonlySet<string> = new Set(ASC_STEP8_NODE_KINDS);
const AREA_SET: ReadonlySet<string> = new Set(ASC_STEP8_AREAS);
const URGENCY_SET: ReadonlySet<string> = new Set(ASC_STEP8_URGENCIES);
const DEST_KIND_SET: ReadonlySet<string> = new Set(ASC_STEP8_DESTINATION_KINDS);
const OPEN_MODE_SET: ReadonlySet<string> = new Set(ASC_STEP8_OPEN_MODES);
const CONFIDENCE_SET = new Set(["high", "medium", "low"]);

function isStr(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function parseNode(v: unknown): AscGeneratedFlowNode | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (!isStr(o.id)) return null;
  if (typeof o.kind !== "string" || !NODE_KIND_SET.has(o.kind)) return null;
  if (!isStr(o.label)) return null;
  if (o.label.length > 200) return null;
  const out: AscGeneratedFlowNode = {
    id: o.id,
    kind: o.kind as AscGeneratedFlowNode["kind"],
    label: o.label,
  };
  if (o.reasonId !== undefined) {
    if (typeof o.reasonId !== "string") return null;
    if (o.reasonId) out.reasonId = o.reasonId;
  }
  if (o.outcomeRef !== undefined) {
    if (typeof o.outcomeRef !== "string") return null;
    if (o.outcomeRef) out.outcomeRef = o.outcomeRef;
  }
  if (o.copy !== undefined) {
    if (!o.copy || typeof o.copy !== "object" || Array.isArray(o.copy))
      return null;
    const c = o.copy as Record<string, unknown>;
    const copy: { opener?: string; body?: string } = {};
    if (c.opener !== undefined) {
      if (typeof c.opener !== "string") return null;
      if (c.opener.length > 600) return null;
      copy.opener = c.opener;
    }
    if (c.body !== undefined) {
      if (typeof c.body !== "string") return null;
      if (c.body.length > 1200) return null;
      copy.body = c.body;
    }
    if (copy.opener || copy.body) out.copy = copy;
  }
  if (o.todos !== undefined) {
    if (!Array.isArray(o.todos)) return null;
    const todos: string[] = [];
    for (const t of o.todos) {
      if (typeof t !== "string" || t.length === 0 || t.length > 240) return null;
      todos.push(t);
    }
    if (todos.length > 0) out.todos = todos;
  }
  return out;
}

function parseEdge(v: unknown): AscGeneratedFlowEdge | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (!isStr(o.id) || !isStr(o.from) || !isStr(o.to)) return null;
  const out: AscGeneratedFlowEdge = { id: o.id, from: o.from, to: o.to };
  if (o.trigger !== undefined) {
    if (typeof o.trigger !== "string" || o.trigger.length > 240) return null;
    if (o.trigger) out.trigger = o.trigger;
  }
  return out;
}

function parseOutcomeLink(v: unknown): AscGeneratedOutcomeLink | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (!isStr(o.outcomeRef)) return null;
  if (!Array.isArray(o.fromReasonIds)) return null;
  if (!Array.isArray(o.notificationRefs)) return null;
  for (const r of o.fromReasonIds) if (typeof r !== "string") return null;
  for (const r of o.notificationRefs) if (typeof r !== "string") return null;
  return {
    outcomeRef: o.outcomeRef,
    fromReasonIds: o.fromReasonIds as string[],
    notificationRefs: o.notificationRefs as string[],
  };
}

function parseNotification(v: unknown): AscGeneratedNotification | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (!isStr(o.id) || !isStr(o.outcomeRef) || !isStr(o.channelRef)) return null;
  if (typeof o.urgency !== "string" || !URGENCY_SET.has(o.urgency)) return null;
  const out: AscGeneratedNotification = {
    id: o.id,
    outcomeRef: o.outcomeRef,
    channelRef: o.channelRef,
    urgency: o.urgency as AscGeneratedNotification["urgency"],
  };
  if (o.audienceRef !== undefined) {
    if (typeof o.audienceRef !== "string") return null;
    if (o.audienceRef) out.audienceRef = o.audienceRef;
  }
  if (o.note !== undefined) {
    if (typeof o.note !== "string" || o.note.length > 240) return null;
    if (o.note) out.note = o.note;
  }
  return out;
}

function parseTodo(v: unknown): AscGeneratedTodo | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (!isStr(o.id) || !isStr(o.message)) return null;
  if (o.message.length > 240) return null;
  if (typeof o.area !== "string" || !AREA_SET.has(o.area)) return null;
  return {
    id: o.id,
    area: o.area as AscGenerationArea,
    message: o.message,
  };
}

function parseConfidence(v: unknown): AscGenerationConfidence | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.level !== "string" || !CONFIDENCE_SET.has(o.level)) return null;
  const out: AscGenerationConfidence = {
    level: o.level as AscGenerationConfidence["level"],
  };
  if (o.reason !== undefined) {
    if (typeof o.reason !== "string" || o.reason.length > 240) return null;
    if (o.reason) out.reason = o.reason;
  }
  return out;
}

/**
 * Strict parser. Returns null on any structural deviation. Returns the parsed
 * response without applying the post-processing pipeline (grounding filter,
 * copy safety, fingerprint) — that lives in `normalizeStep8Compile`.
 */
export function parseStep8CompileResponse(
  raw: unknown,
): AscStep8CompileResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.step !== 8) return null;
  if (!r.generated || typeof r.generated !== "object" || Array.isArray(r.generated))
    return null;
  const g = r.generated as Record<string, unknown>;

  if (!g.flow || typeof g.flow !== "object") return null;
  const flow = g.flow as Record<string, unknown>;
  if (!Array.isArray(flow.nodes) || !Array.isArray(flow.edges)) return null;
  if (flow.nodes.length === 0 || flow.nodes.length > ASC_STEP8_MAX_NODES)
    return null;
  if (flow.edges.length > ASC_STEP8_MAX_EDGES) return null;

  const nodes: AscGeneratedFlowNode[] = [];
  const nodeIds = new Set<string>();
  for (const n of flow.nodes) {
    const parsed = parseNode(n);
    if (!parsed) return null;
    if (nodeIds.has(parsed.id)) return null;
    nodeIds.add(parsed.id);
    nodes.push(parsed);
  }

  const edges: AscGeneratedFlowEdge[] = [];
  const edgeIds = new Set<string>();
  for (const e of flow.edges) {
    const parsed = parseEdge(e);
    if (!parsed) return null;
    if (edgeIds.has(parsed.id)) return null;
    if (!nodeIds.has(parsed.from) || !nodeIds.has(parsed.to)) return null;
    edgeIds.add(parsed.id);
    edges.push(parsed);
  }

  if (!g.reasonToBranch || typeof g.reasonToBranch !== "object") return null;
  const reasonToBranch: Record<string, string> = {};
  for (const [k, v] of Object.entries(g.reasonToBranch)) {
    if (typeof v !== "string" || !nodeIds.has(v)) return null;
    reasonToBranch[k] = v;
  }

  if (!Array.isArray(g.outcomes)) return null;
  if (g.outcomes.length > ASC_STEP8_MAX_OUTCOMES) return null;
  const outcomes: AscGeneratedOutcomeLink[] = [];
  for (const o of g.outcomes) {
    const parsed = parseOutcomeLink(o);
    if (!parsed) return null;
    outcomes.push(parsed);
  }

  if (!Array.isArray(g.notifications)) return null;
  if (g.notifications.length > ASC_STEP8_MAX_NOTIFICATIONS) return null;
  const notifications: AscGeneratedNotification[] = [];
  const notificationIds = new Set<string>();
  for (const n of g.notifications) {
    const parsed = parseNotification(n);
    if (!parsed) return null;
    if (notificationIds.has(parsed.id)) return null;
    notificationIds.add(parsed.id);
    notifications.push(parsed);
  }

  if (!g.destinationLaunch || typeof g.destinationLaunch !== "object") return null;
  const dl = g.destinationLaunch as Record<string, unknown>;
  if (!dl.destination || typeof dl.destination !== "object") return null;
  const dest = dl.destination as Record<string, unknown>;
  if (typeof dest.kind !== "string" || !DEST_KIND_SET.has(dest.kind)) return null;
  const destination: AscStep8CompileResponse["generated"]["destinationLaunch"]["destination"] = {
    kind: dest.kind as AscStep8CompileResponse["generated"]["destinationLaunch"]["destination"]["kind"],
  };
  if (dest.externalUrl !== undefined) {
    if (typeof dest.externalUrl !== "string") return null;
    if (dest.externalUrl) destination.externalUrl = dest.externalUrl;
  }
  if (dest.deepLinkTemplate !== undefined) {
    if (typeof dest.deepLinkTemplate !== "string") return null;
    if (dest.deepLinkTemplate) destination.deepLinkTemplate = dest.deepLinkTemplate;
  }
  if (dest.openMode !== undefined) {
    if (typeof dest.openMode !== "string" || !OPEN_MODE_SET.has(dest.openMode))
      return null;
    destination.openMode =
      dest.openMode as NonNullable<typeof destination.openMode>;
  }
  if (dest.notes !== undefined) {
    if (typeof dest.notes !== "string" || dest.notes.length > 240) return null;
    if (dest.notes) destination.notes = dest.notes;
  }

  const launchObj = dl.launch;
  if (!launchObj || typeof launchObj !== "object") return null;
  const launch: { slug?: string } = {};
  const lo = launchObj as Record<string, unknown>;
  if (lo.slug !== undefined) {
    if (typeof lo.slug !== "string") return null;
    if (lo.slug) launch.slug = lo.slug;
  }

  let todos: AscGeneratedTodo[] = [];
  if (g.todos !== undefined) {
    if (!Array.isArray(g.todos)) return null;
    if (g.todos.length > ASC_STEP8_MAX_TODOS) return null;
    for (const t of g.todos) {
      const parsed = parseTodo(t);
      if (!parsed) return null;
      todos.push(parsed);
    }
  }

  const confidenceByArea: Partial<Record<AscGenerationArea, AscGenerationConfidence>> = {};
  if (g.confidenceByArea !== undefined) {
    if (
      !g.confidenceByArea ||
      typeof g.confidenceByArea !== "object" ||
      Array.isArray(g.confidenceByArea)
    ) {
      return null;
    }
    for (const [k, v] of Object.entries(g.confidenceByArea)) {
      if (!AREA_SET.has(k)) return null;
      const parsed = parseConfidence(v);
      if (!parsed) return null;
      confidenceByArea[k as AscGenerationArea] = parsed;
    }
  }

  let advisories: AscStep8Advisory[] = [];
  if (r.advisories !== undefined) {
    if (!Array.isArray(r.advisories)) return null;
    if (r.advisories.length > ASC_STEP8_MAX_ADVISORIES) return null;
    for (const a of r.advisories) {
      if (!a || typeof a !== "object") return null;
      const ao = a as Record<string, unknown>;
      if (!isStr(ao.message) || ao.message.length > 240) return null;
      advisories.push({ message: ao.message });
    }
  }

  return {
    step: 8,
    generated: {
      flow: { nodes, edges },
      reasonToBranch,
      outcomes,
      notifications,
      destinationLaunch: { destination, launch },
      todos,
      confidenceByArea,
    },
    advisories,
  };
}

// ── Post-parse normalization (grounding-aware, copy-safety) ───────────────

export interface NormalizeStep8Options {
  /** AscCallerReason.id values currently in the draft. */
  knownReasonIds: Set<string>;
  /** Normalized outcome labels currently in `outcomesDraftEdits`. */
  knownOutcomeRefs: Set<string>;
  /** Lowercased channelRef values from workspace notification destinations. */
  knownChannelRefs: Set<string>;
  /** External URLs configured in the workspace, lowercased. */
  knownExternalUrls: Set<string>;
  /** Deep-link templates configured in the workspace, lowercased. */
  knownDeepLinkTemplates: Set<string>;
  /** Slug confirmed in Step 7 (if any). */
  step7Slug?: string;
}

export interface NormalizeStep8Result {
  generated: AscGenerated;
  advisories: AscStep8Advisory[];
  /** When true, the response was rejected outright (treat as incomplete). */
  fatal?: { code: "incomplete" | "unsafe"; message: string };
}

function makeTodoId(prefix: string, i: number): string {
  return `${prefix}-${i}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Apply scope-guard rules to the parsed response:
 *   - Drop notifications whose channelRef isn't grounded; emit advisory.
 *   - Coerce destination external/deep-link fields to undefined when not
 *     grounded; emit advisory + TODO (prefer advisory/TODO over silent
 *     intent change).
 *   - Echo Step 7 slug. NEVER invent a new slug — drop AI-supplied slug if
 *     it differs and emit a TODO.
 *   - Filter unsafe copy slots to undefined + TODO.
 *   - Drop outcome links / reasonToBranch entries whose refs don't exist.
 *   - Require: at least one node, entry node present, no orphan reasonToBranch.
 *
 * The function never throws. Returns a `fatal` discriminant when the result
 * cannot be safely persisted (used to dispatch FAIL_STEP8_GENERATION).
 */
export function normalizeStep8Compile(
  parsed: AscStep8CompileResponse,
  input: AscWizardInput,
  opts: NormalizeStep8Options,
  nowIso: string,
): NormalizeStep8Result {
  const advisories: AscStep8Advisory[] = [...parsed.advisories];
  const todos: AscGeneratedTodo[] = [...parsed.generated.todos];

  // --- Copy safety ---
  const nodes: AscGeneratedFlowNode[] = parsed.generated.flow.nodes.map(
    (n, idx) => {
      if (!n.copy) return n;
      let opener = n.copy.opener;
      let body = n.copy.body;
      const stripped: string[] = [];
      if (opener && !isCopyTextSafe(opener)) {
        stripped.push(`opener for "${n.label}"`);
        opener = undefined;
      }
      if (body && !isCopyTextSafe(body)) {
        stripped.push(`body for "${n.label}"`);
        body = undefined;
      }
      if (stripped.length > 0) {
        todos.push({
          id: makeTodoId("td-copy", idx),
          area: "copy",
          message: `Removed copy (${stripped.join(", ")}) that may imply legal/medical/financial advice. Please rewrite.`,
        });
      }
      const copy = opener || body ? { opener, body } : undefined;
      return { ...n, copy };
    },
  );

  // --- Notifications grounding ---
  const filteredNotifications: AscGeneratedNotification[] = [];
  const droppedNotificationIds = new Set<string>();
  for (const n of parsed.generated.notifications) {
    if (
      opts.knownChannelRefs.size > 0 &&
      !opts.knownChannelRefs.has(n.channelRef.trim().toLowerCase())
    ) {
      droppedNotificationIds.add(n.id);
      advisories.push({
        message: `Dropped notification rule for "${n.outcomeRef}" — channel "${n.channelRef}" isn't configured.`,
      });
      continue;
    }
    if (opts.knownChannelRefs.size === 0) {
      droppedNotificationIds.add(n.id);
      advisories.push({
        message: `Dropped notification rule for "${n.outcomeRef}" — no notification destinations are configured.`,
      });
      continue;
    }
    filteredNotifications.push(n);
  }

  // --- Outcome links: keep only ones with known outcomeRef + known reasons,
  //     and strip dropped notification refs. ---
  const filteredOutcomes: AscGeneratedOutcomeLink[] = [];
  for (const o of parsed.generated.outcomes) {
    const norm = normalizeOutcomeLabel(o.outcomeRef);
    if (!opts.knownOutcomeRefs.has(norm)) {
      todos.push({
        id: makeTodoId("td-out", filteredOutcomes.length),
        area: "outcomes",
        message: `Dropped outcome link "${o.outcomeRef}" — not in your outcomes list.`,
      });
      continue;
    }
    const reasons = o.fromReasonIds.filter((r) => opts.knownReasonIds.has(r));
    const notifs = o.notificationRefs.filter(
      (n) => !droppedNotificationIds.has(n),
    );
    filteredOutcomes.push({
      outcomeRef: norm,
      fromReasonIds: reasons,
      notificationRefs: notifs,
    });
  }

  // --- reasonToBranch: drop entries whose reasonId is unknown or whose
  //     branch node was filtered. ---
  const nodeIdSet = new Set(nodes.map((n) => n.id));
  const reasonToBranch: Record<string, string> = {};
  for (const [reasonId, nodeId] of Object.entries(parsed.generated.reasonToBranch)) {
    if (!opts.knownReasonIds.has(reasonId)) continue;
    if (!nodeIdSet.has(nodeId)) continue;
    reasonToBranch[reasonId] = nodeId;
  }

  // --- Destination grounding (advisory/TODO over silent coercion) ---
  const proposedDest = parsed.generated.destinationLaunch.destination;
  let nextDest: typeof proposedDest = { kind: proposedDest.kind };

  // Prefer the user's confirmed destination as the source of truth.
  if (input.destination) {
    nextDest = {
      kind: input.destination.kind,
      ...(input.destination.externalUrl
        ? { externalUrl: input.destination.externalUrl }
        : {}),
      ...(input.destination.deepLinkTemplate
        ? { deepLinkTemplate: input.destination.deepLinkTemplate }
        : {}),
      ...(input.destination.openMode
        ? { openMode: input.destination.openMode }
        : {}),
      ...(input.destination.notes ? { notes: input.destination.notes } : {}),
    };
  } else {
    if (proposedDest.openMode) nextDest.openMode = proposedDest.openMode;
    if (proposedDest.externalUrl) {
      const ok = opts.knownExternalUrls.has(
        proposedDest.externalUrl.trim().toLowerCase(),
      );
      if (ok) {
        nextDest.externalUrl = proposedDest.externalUrl;
      } else {
        advisories.push({
          message: `Ignored proposed external URL "${proposedDest.externalUrl}" — not configured in the workspace.`,
        });
        todos.push({
          id: makeTodoId("td-dest", 0),
          area: "destination",
          message: "Set a destination URL before publishing.",
        });
      }
    }
    if (proposedDest.deepLinkTemplate) {
      const ok = opts.knownDeepLinkTemplates.has(
        proposedDest.deepLinkTemplate.trim().toLowerCase(),
      );
      if (ok) {
        nextDest.deepLinkTemplate = proposedDest.deepLinkTemplate;
      } else {
        advisories.push({
          message: `Ignored proposed deep-link template — not configured in the workspace.`,
        });
        todos.push({
          id: makeTodoId("td-dest", 1),
          area: "destination",
          message: "Choose a deep-link template before publishing.",
        });
      }
    }
  }

  // --- Launch slug: echo Step 7 only. Never invent. ---
  const proposedSlug = parsed.generated.destinationLaunch.launch.slug;
  let nextSlug: string | undefined = opts.step7Slug;
  if (!nextSlug) {
    todos.push({
      id: makeTodoId("td-slug", 0),
      area: "destination",
      message: "No launch slug confirmed yet — pick one in Step 7 before publishing.",
    });
    if (proposedSlug) {
      advisories.push({
        message: `Ignored proposed slug "${proposedSlug}" — slug must be picked in Step 7.`,
      });
    }
  } else if (proposedSlug && proposedSlug.trim() !== nextSlug) {
    advisories.push({
      message: `Ignored alternate slug "${proposedSlug}" — Step 7 slug is the source of truth.`,
    });
  }

  // --- Structural minimums ---
  if (nodes.length === 0) {
    return {
      generated: blankGenerated(input, nowIso),
      advisories,
      fatal: { code: "incomplete", message: "Flow has no nodes." },
    };
  }
  if (!nodes.some((n) => n.kind === "entry")) {
    return {
      generated: blankGenerated(input, nowIso),
      advisories,
      fatal: { code: "incomplete", message: "Flow is missing an entry node." },
    };
  }

  const generated: AscGenerated = {
    schemaVersion: 1,
    generatedAt: nowIso,
    inputFingerprint: computeInputFingerprint(input),
    flow: { nodes, edges: parsed.generated.flow.edges },
    reasonToBranch,
    outcomes: filteredOutcomes,
    notifications: filteredNotifications,
    destinationLaunch: {
      destination: nextDest,
      launch: nextSlug ? { slug: nextSlug } : {},
    },
    todos,
    confidenceByArea: parsed.generated.confidenceByArea,
  };

  return { generated, advisories };
}

function blankGenerated(input: AscWizardInput, nowIso: string): AscGenerated {
  return {
    schemaVersion: 1,
    generatedAt: nowIso,
    inputFingerprint: computeInputFingerprint(input),
    flow: { nodes: [], edges: [] },
    reasonToBranch: {},
    outcomes: [],
    notifications: [],
    destinationLaunch: {
      destination: input.destination
        ? { ...input.destination }
        : { kind: "internal_runner" },
      launch: input.launch?.slug ? { slug: input.launch.slug } : {},
    },
    todos: [],
    confidenceByArea: {},
  };
}
