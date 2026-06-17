/**
 * ASC Telemetry — Phase 6 · Slice 2.
 *
 * Thin wrapper around the existing platform_events insert. Centralizes the
 * event catalog so call sites stay consistent and easy to grep. Failures are
 * always swallowed — telemetry MUST NOT block UX or mutate ASC state.
 *
 * Catalog and shadow rollout docs: docs/asc-shadow-rollout.md
 */
import { supabase } from "@/integrations/supabase/client";

export const ASC_EVENT_TYPES = [
  // Wizard lifecycle
  "asc_wizard_opened",
  "asc_step_completed",
  "asc_step_back",
  "asc_wizard_abandoned",
  // AI usage
  "asc_ai_call",
  "asc_ai_proposal_confirmed",
  // Readiness + handoff
  "asc_readiness_viewed",
  "asc_readiness_blocker_seen",
  "asc_handoff_initiated",
  "asc_handoff_completed",
  // Canonical side (ASC-origin only)
  "canonical_from_asc_opened",
  "canonical_from_asc_saved",
  "canonical_from_asc_published",
] as const;

export type AscEventType = (typeof ASC_EVENT_TYPES)[number];

export type AscEventRole =
  | "interviewer"
  | "gap_finder"
  | "logic_architect"
  | "generator";

export type AscEventOutcome = "ok" | "fail";

export type AscEventErrorCode = "402" | "429" | "schema" | "network" | "unknown";

export interface AscEventPayload {
  ascDraftId?: string | null;
  workspaceId?: string | null;
  organizationId?: string | null;
  step?: number;
  role?: AscEventRole;
  targetField?: string;
  outcome?: AscEventOutcome;
  errorCode?: AscEventErrorCode;
  blockerCount?: number;
  warningCount?: number;
  blockerId?: string;
  usedAi?: boolean;
  lastStep?: number;
  source?: "asc" | "canonical";
}

const ALLOWED_KEYS: ReadonlySet<keyof AscEventPayload> = new Set([
  "ascDraftId",
  "workspaceId",
  "organizationId",
  "step",
  "role",
  "targetField",
  "outcome",
  "errorCode",
  "blockerCount",
  "warningCount",
  "blockerId",
  "usedAi",
  "lastStep",
  "source",
]);

function isValidType(type: string): type is AscEventType {
  return (ASC_EVENT_TYPES as readonly string[]).includes(type);
}

function sanitize(payload: AscEventPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(payload) as Array<keyof AscEventPayload>) {
    if (!ALLOWED_KEYS.has(k)) continue;
    const v = payload[k];
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Test seam — production code always uses the supabase insert. Tests can
 * swap this to a spy via `__setAscTelemetryEmitter`.
 */
type Emitter = (
  eventType: AscEventType,
  payload: Record<string, unknown>,
  organizationId: string | null,
  source: string,
) => Promise<void> | void;

let emitter: Emitter = async (eventType, payload, organizationId, source) => {
  if (!organizationId) return; // platform_events is org-scoped
  try {
    await supabase.from("platform_events").insert([
      {
        organization_id: organizationId,
        event_type: eventType,
        payload: payload as never,
        source,
      },
    ]);
  } catch {
    // swallow
  }
};

export function __setAscTelemetryEmitter(next: Emitter | null): void {
  if (next === null) {
    // restore default
    emitter = async (eventType, payload, organizationId, source) => {
      if (!organizationId) return;
      try {
        await supabase.from("platform_events").insert([
          {
            organization_id: organizationId,
            event_type: eventType,
            payload: payload as never,
            source,
          },
        ]);
      } catch {
        // swallow
      }
    };
    return;
  }
  emitter = next;
}

/**
 * Fire-and-forget. Never throws. Never mutates caller-provided payload.
 */
export function emitAscEvent(
  eventType: AscEventType,
  payload: AscEventPayload = {},
): void {
  try {
    if (!isValidType(eventType)) {
      if (import.meta.env?.DEV) {
        // eslint-disable-next-line no-console
        console.warn("[asc-telemetry] unknown event type rejected:", eventType);
      }
      return;
    }
    const clean = sanitize(payload);
    const source =
      payload.source ??
      (eventType.startsWith("canonical_from_asc") ? "canonical" : "asc");
    const orgId = payload.organizationId ?? null;
    const result = emitter(eventType, clean, orgId, source);
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch(() => {
        /* swallow */
      });
    }
  } catch (err) {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[asc-telemetry] emit failed:", err);
    }
  }
}
