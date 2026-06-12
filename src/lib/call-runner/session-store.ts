/**
 * Phase 6 · session persistence.
 *
 * Stores the active runner session in localStorage so a refresh or transient
 * disconnect does not destroy work-in-progress. No schema changes; keys are
 * scoped per workspace/campaign/call so multiple parallel sessions don't bleed.
 */
import {
  CALL_RUNNER_SESSION_SCHEMA_VERSION,
  type CallSessionMeta,
  type CallSessionState,
} from "@/types/call-runner";

const NAMESPACE = "fabric59:call-runner:session";
/** Sessions older than this are treated as expired (8h). */
export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export function sessionKey(meta: Pick<CallSessionMeta, "workspaceId" | "campaignId" | "callId">): string {
  return `${NAMESPACE}:${meta.workspaceId}:${meta.campaignId}:${meta.callId ?? "default"}`;
}

export function emptySession(meta: CallSessionMeta): CallSessionState {
  const nowIso = new Date().toISOString();
  return {
    schemaVersion: CALL_RUNNER_SESSION_SCHEMA_VERSION,
    meta: { ...meta, startedAt: meta.startedAt || nowIso },
    currentStepId: null,
    completedStepIds: [],
    values: {},
    notes: "",
    updatedAt: nowIso,
    finalized: false,
  };
}

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadSession(meta: CallSessionMeta): CallSessionState | null {
  const store = safeLocalStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(sessionKey(meta));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CallSessionState;
    if (parsed.schemaVersion !== CALL_RUNNER_SESSION_SCHEMA_VERSION) return null;
    const age = Date.now() - new Date(parsed.updatedAt).getTime();
    if (age > SESSION_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(state: CallSessionState): void {
  const store = safeLocalStorage();
  if (!store) return;
  try {
    store.setItem(sessionKey(state.meta), JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
  } catch {
    /* quota or serialization error — non-fatal */
  }
}

export function clearSession(meta: CallSessionMeta): void {
  const store = safeLocalStorage();
  if (!store) return;
  try {
    store.removeItem(sessionKey(meta));
  } catch {
    /* ignore */
  }
}
