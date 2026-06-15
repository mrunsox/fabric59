/**
 * Config normalization for the external-resource workspace.
 *
 * Defensively coerces persisted JSON into the canonical typed shape. Invalid
 * resources/rules are silently dropped; URLs must be `http(s)://` — any
 * `javascript:`, `data:`, or other scheme is rejected.
 *
 * Mirrors the structural conventions of normalizeTransferDirectory so the
 * two metadata namespaces are read/written the same way.
 */
import {
  DEFAULT_EXTERNAL_RESOURCES,
  EXTERNAL_RESOURCES_VERSION,
  type ExternalResource,
  type ExternalResourceRule,
  type ExternalResourcesConfig,
  type ResourceCondition,
  type ResourceConditionGroup,
  type ResourceConditionOperator,
  type ResourceContextFieldKey,
  type ResourceKind,
  type ResourceOpenMode,
  type ResourceRuleAction,
  type ResourceUrgency,
  type ResourceWidth,
} from "./types";

const KINDS: ResourceKind[] = ["calendar", "website", "document", "form", "portal", "custom"];
const OPEN_MODES: ResourceOpenMode[] = ["auto", "iframe", "drawer", "replace_center", "new_tab"];
const WIDTHS: ResourceWidth[] = ["sm", "md", "lg", "full"];
const URGENCIES: ResourceUrgency[] = ["low", "normal", "high", "critical"];
const FIELDS: ResourceContextFieldKey[] = [
  "issueType",
  "category",
  "specialty",
  "urgency",
  "stepId",
  "branch",
  "disposition",
  "transferGroup",
  "embedMode",
  "timeMode",
  "capturedField",
];
const OPS: ResourceConditionOperator[] = [
  "eq",
  "neq",
  "in",
  "nin",
  "contains",
  "gte",
  "lte",
  "exists",
  "missing",
];

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function str(v: unknown, max = 256): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.length > max ? t.slice(0, max) : t;
}

function strArray(v: unknown, max = 64): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const s = str(x, max);
    if (s) out.push(s);
  }
  return out;
}

let _idSeq = 0;
function newId(prefix: string): string {
  _idSeq = (_idSeq + 1) >>> 0;
  return `${prefix}_${Date.now().toString(36)}_${_idSeq.toString(36)}`;
}

/**
 * Strict URL validation. Only http(s) accepted — javascript:/data:/file:/etc.
 * are rejected so a hostile config can never inject a script-URL launch.
 * Total length cap: 2000 chars (browser-safe).
 */
export function sanitizeResourceUrl(raw: unknown): string | null {
  const s = str(raw, 2000);
  if (!s) return null;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  return u.toString();
}

function normalizeParamTemplate(raw: unknown): Record<string, string> | undefined {
  if (!isRecord(raw)) return undefined;
  const out: Record<string, string> = {};
  let count = 0;
  for (const [k, v] of Object.entries(raw)) {
    if (count >= 24) break;
    const key = str(k, 64);
    const val = str(v, 256);
    if (!key || !val) continue;
    // Param-key sanity — alphanum / underscore / dash / dot only.
    if (!/^[a-zA-Z0-9_.\-]+$/.test(key)) continue;
    out[key] = val;
    count++;
  }
  return Object.keys(out).length ? out : undefined;
}

export function normalizeResource(raw: unknown, index = 0): ExternalResource | null {
  if (!isRecord(raw)) return null;
  const label = str(raw.label, 120);
  if (!label) return null;
  const url = sanitizeResourceUrl(raw.url);
  if (!url) return null;
  const kind = (KINDS as string[]).includes(raw.kind as string)
    ? (raw.kind as ResourceKind)
    : "custom";
  const openMode = (OPEN_MODES as string[]).includes(raw.openMode as string)
    ? (raw.openMode as ResourceOpenMode)
    : "auto";
  return {
    id: str(raw.id, 64) ?? newId("er"),
    label,
    kind,
    url,
    description: str(raw.description, 500),
    enabled: raw.enabled !== false,
    openMode,
    sortOrder: Number.isFinite(raw.sortOrder as number) ? Number(raw.sortOrder) : index,
    tags: strArray(raw.tags),
    issueTags: strArray(raw.issueTags),
    specialtyTags: strArray(raw.specialtyTags),
    dispositionTags: strArray(raw.dispositionTags),
    urgencyTags: strArray(raw.urgencyTags).filter((u): u is ResourceUrgency =>
      (URGENCIES as string[]).includes(u),
    ) as ResourceUrgency[],
    allowParamInjection: raw.allowParamInjection === true,
    paramTemplate: normalizeParamTemplate(raw.paramTemplate),
    notesTemplate: str(raw.notesTemplate, 1000),
    requiresConfirmation: raw.requiresConfirmation === true ? true : undefined,
    preferredWidth: (WIDTHS as string[]).includes(raw.preferredWidth as string)
      ? (raw.preferredWidth as ResourceWidth)
      : undefined,
    metadata: isRecord(raw.metadata) ? (raw.metadata as Record<string, unknown>) : undefined,
  };
}

function normalizeCondition(raw: unknown): ResourceCondition | null {
  if (!isRecord(raw)) return null;
  const field = raw.field as ResourceContextFieldKey;
  if (!FIELDS.includes(field)) return null;
  const op = raw.op as ResourceConditionOperator;
  if (!OPS.includes(op)) return null;
  const cond: ResourceCondition = { field, op };
  if (field === "capturedField") {
    const key = str(raw.key, 120);
    if (!key) return null;
    cond.key = key;
  }
  if (raw.value !== undefined && raw.value !== null) {
    if (Array.isArray(raw.value)) {
      cond.value = strArray(raw.value);
    } else if (
      typeof raw.value === "string" ||
      typeof raw.value === "number" ||
      typeof raw.value === "boolean"
    ) {
      cond.value = raw.value;
    }
  }
  return cond;
}

function normalizeGroup(raw: unknown): ResourceConditionGroup {
  if (!isRecord(raw)) return { combinator: "all", conditions: [] };
  const combinator = raw.combinator === "any" ? "any" : "all";
  const conds = Array.isArray(raw.conditions) ? raw.conditions : [];
  const out: (ResourceCondition | ResourceConditionGroup)[] = [];
  for (const c of conds) {
    if (isRecord(c) && Array.isArray((c as Record<string, unknown>).conditions)) {
      out.push(normalizeGroup(c));
    } else {
      const cn = normalizeCondition(c);
      if (cn) out.push(cn);
    }
  }
  return { combinator, conditions: out };
}

function normalizeAction(raw: unknown): ResourceRuleAction | null {
  if (!isRecord(raw)) return null;
  const kind = raw.kind;
  switch (kind) {
    case "show":
    case "hide": {
      const targetIds =
        raw.targetIds === "*" ? "*" : strArray((raw as Record<string, unknown>).targetIds);
      const tagsAny = Array.isArray(raw.tagsAny) ? strArray(raw.tagsAny) : undefined;
      return { kind, targetIds, ...(tagsAny && tagsAny.length ? { tagsAny } : {}) } as ResourceRuleAction;
    }
    case "prioritize":
      return {
        kind,
        targetIds: strArray((raw as Record<string, unknown>).targetIds),
        boost: Number.isFinite(raw.boost as number) ? Number(raw.boost) : 10,
      };
    case "suggest": {
      return {
        kind,
        targetIds: strArray((raw as Record<string, unknown>).targetIds),
        message: str(raw.message, 240),
      };
    }
    case "auto_open_if_safe": {
      const targetId = str(raw.targetId, 64);
      if (!targetId) return null;
      return { kind, targetId };
    }
    case "annotate": {
      const rationale = str(raw.rationale, 240);
      if (!rationale) return null;
      const targetIds =
        raw.targetIds === "*" ? "*" : strArray((raw as Record<string, unknown>).targetIds);
      return { kind, targetIds, rationale } as ResourceRuleAction;
    }
    default:
      return null;
  }
}

export function normalizeRule(raw: unknown, index = 0): ExternalResourceRule | null {
  if (!isRecord(raw)) return null;
  const action = normalizeAction(raw.then);
  if (!action) return null;
  return {
    id: str(raw.id, 64) ?? newId("err"),
    name: str(raw.name, 120) ?? `Rule ${index + 1}`,
    enabled: raw.enabled !== false,
    priority: Number.isFinite(raw.priority as number) ? Number(raw.priority) : 100 - index,
    when: normalizeGroup(raw.when),
    then: action,
  };
}

export function normalizeExternalResources(raw: unknown): ExternalResourcesConfig {
  if (!isRecord(raw)) return { ...DEFAULT_EXTERNAL_RESOURCES };
  const resourcesRaw = Array.isArray(raw.resources) ? raw.resources : [];
  const rulesRaw = Array.isArray(raw.rules) ? raw.rules : [];
  const resources: ExternalResource[] = [];
  resourcesRaw.forEach((r, i) => {
    const n = normalizeResource(r, i);
    if (n) resources.push(n);
  });
  // Stable sort by sortOrder then label for deterministic UI baseline.
  resources.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  const rules: ExternalResourceRule[] = [];
  rulesRaw.forEach((r, i) => {
    const n = normalizeRule(r, i);
    if (n) rules.push(n);
  });
  return {
    version: EXTERNAL_RESOURCES_VERSION,
    resources,
    rules,
    updatedAt: str(raw.updatedAt, 64) ?? null,
  };
}

export function readExternalResourcesFromMetadata(metadata: unknown): ExternalResourcesConfig {
  if (!isRecord(metadata)) return { ...DEFAULT_EXTERNAL_RESOURCES };
  return normalizeExternalResources(metadata.externalResources);
}

export function applyExternalResourcesPatch(
  metadata: unknown,
  patch: Partial<ExternalResourcesConfig>,
): Record<string, unknown> {
  const meta = isRecord(metadata) ? { ...metadata } : {};
  const current = readExternalResourcesFromMetadata(meta);
  const next = normalizeExternalResources({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  meta.externalResources = next as unknown as Record<string, unknown>;
  return meta;
}

export function generateResourceId(): string {
  return newId("er");
}

export function generateResourceRuleId(): string {
  return newId("err");
}
