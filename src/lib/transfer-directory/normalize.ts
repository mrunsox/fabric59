/**
 * Config normalization for the transfer directory.
 *
 * Defensively coerces persisted JSON into the canonical typed shape. Unknown
 * fields are dropped; arrays default to empty; ordering is stable.
 */
import {
  DEFAULT_TRANSFER_DIRECTORY,
  TRANSFER_DIRECTORY_VERSION,
  type Condition,
  type ConditionGroup,
  type ContextFieldKey,
  type ConditionOperator,
  type HoursBehavior,
  type RuleAction,
  type TransferDirectoryConfig,
  type TransferEntry,
  type TransferRule,
  type TransferType,
  type Urgency,
} from "./types";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

const TRANSFER_TYPES: TransferType[] = ["warm", "cold", "conference", "instructions_only"];
const HOURS: HoursBehavior[] = ["always", "business_hours", "after_hours"];
const URGENCIES: Urgency[] = ["low", "normal", "high", "critical"];
const FIELDS: ContextFieldKey[] = [
  "issueType",
  "category",
  "specialty",
  "urgency",
  "stepId",
  "branch",
  "disposition",
  "timeMode",
  "transferGroup",
  "capturedField",
];
const OPS: ConditionOperator[] = [
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

export function normalizeEntry(raw: unknown, index = 0): TransferEntry | null {
  if (!isRecord(raw)) return null;
  const displayName = str(raw.displayName, 120);
  if (!displayName) return null;
  const transferType = TRANSFER_TYPES.includes(raw.transferType as TransferType)
    ? (raw.transferType as TransferType)
    : "warm";
  const escalationLevelRaw = Number(raw.escalationLevel);
  const escalationLevel = (
    [0, 1, 2, 3].includes(escalationLevelRaw) ? escalationLevelRaw : 0
  ) as TransferEntry["escalationLevel"];
  return {
    id: str(raw.id, 64) ?? newId("te"),
    displayName,
    team: str(raw.team, 120),
    role: str(raw.role, 120),
    phoneNumber: str(raw.phoneNumber, 64),
    extension: str(raw.extension, 32),
    transferType,
    enabled: raw.enabled !== false,
    fallback: raw.fallback === true,
    escalationLevel,
    issueTags: strArray(raw.issueTags),
    specialtyTags: strArray(raw.specialtyTags),
    urgencyTags: strArray(raw.urgencyTags).filter((u): u is Urgency =>
      (URGENCIES as string[]).includes(u),
    ) as Urgency[],
    hours: HOURS.includes(raw.hours as HoursBehavior)
      ? (raw.hours as HoursBehavior)
      : "always",
    instructions: str(raw.instructions, 1000),
    sortOrder: Number.isFinite(raw.sortOrder as number)
      ? Number(raw.sortOrder)
      : index,
    metadata: isRecord(raw.metadata) ? (raw.metadata as Record<string, unknown>) : undefined,
  };
}

function normalizeCondition(raw: unknown): Condition | null {
  if (!isRecord(raw)) return null;
  const field = raw.field as ContextFieldKey;
  if (!FIELDS.includes(field)) return null;
  const op = raw.op as ConditionOperator;
  if (!OPS.includes(op)) return null;
  const cond: Condition = { field, op };
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

function normalizeGroup(raw: unknown): ConditionGroup {
  if (!isRecord(raw)) return { combinator: "all", conditions: [] };
  const combinator = raw.combinator === "any" ? "any" : "all";
  const conds = Array.isArray(raw.conditions) ? raw.conditions : [];
  const out: (Condition | ConditionGroup)[] = [];
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

function normalizeAction(raw: unknown): RuleAction | null {
  if (!isRecord(raw)) return null;
  const kind = raw.kind;
  switch (kind) {
    case "include":
    case "exclude": {
      const targetIds =
        raw.targetIds === "*" ? "*" : strArray((raw as Record<string, unknown>).targetIds);
      const tagsAny = Array.isArray(raw.tagsAny) ? strArray(raw.tagsAny) : undefined;
      return { kind, targetIds, ...(tagsAny && tagsAny.length ? { tagsAny } : {}) } as RuleAction;
    }
    case "prioritize":
      return {
        kind,
        targetIds: strArray((raw as Record<string, unknown>).targetIds),
        boost: Number.isFinite(raw.boost as number) ? Number(raw.boost) : 10,
      };
    case "escalation_only":
    case "fallback_only":
      return { kind, targetIds: strArray((raw as Record<string, unknown>).targetIds) };
    case "instructions_only": {
      const message = str(raw.message, 500);
      if (!message) return null;
      return { kind, message };
    }
    case "annotate": {
      const rationale = str(raw.rationale, 240);
      if (!rationale) return null;
      const targetIds =
        raw.targetIds === "*" ? "*" : strArray((raw as Record<string, unknown>).targetIds);
      return { kind, targetIds, rationale } as RuleAction;
    }
    default:
      return null;
  }
}

export function normalizeRule(raw: unknown, index = 0): TransferRule | null {
  if (!isRecord(raw)) return null;
  const action = normalizeAction(raw.then);
  if (!action) return null;
  const name = str(raw.name, 120) ?? `Rule ${index + 1}`;
  return {
    id: str(raw.id, 64) ?? newId("tr"),
    name,
    enabled: raw.enabled !== false,
    priority: Number.isFinite(raw.priority as number) ? Number(raw.priority) : 100 - index,
    when: normalizeGroup(raw.when),
    then: action,
  };
}

export function normalizeTransferDirectory(raw: unknown): TransferDirectoryConfig {
  if (!isRecord(raw)) return { ...DEFAULT_TRANSFER_DIRECTORY };
  const entriesRaw = Array.isArray(raw.entries) ? raw.entries : [];
  const rulesRaw = Array.isArray(raw.rules) ? raw.rules : [];
  const entries: TransferEntry[] = [];
  entriesRaw.forEach((e, i) => {
    const n = normalizeEntry(e, i);
    if (n) entries.push(n);
  });
  // Stable sort by sortOrder then displayName for deterministic UI baseline.
  entries.sort((a, b) =>
    a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName),
  );
  const rules: TransferRule[] = [];
  rulesRaw.forEach((r, i) => {
    const n = normalizeRule(r, i);
    if (n) rules.push(n);
  });
  return {
    version: TRANSFER_DIRECTORY_VERSION,
    entries,
    rules,
    updatedAt: str(raw.updatedAt, 64) ?? null,
  };
}

export function readTransferDirectoryFromMetadata(metadata: unknown): TransferDirectoryConfig {
  if (!isRecord(metadata)) return { ...DEFAULT_TRANSFER_DIRECTORY };
  return normalizeTransferDirectory(metadata.transferDirectory);
}

export function applyTransferDirectoryPatch(
  metadata: unknown,
  patch: Partial<TransferDirectoryConfig>,
): Record<string, unknown> {
  const meta = isRecord(metadata) ? { ...metadata } : {};
  const current = readTransferDirectoryFromMetadata(meta);
  const next = normalizeTransferDirectory({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  meta.transferDirectory = next as unknown as Record<string, unknown>;
  return meta;
}

export function generateEntryId(): string {
  return newId("te");
}

export function generateRuleId(): string {
  return newId("tr");
}
