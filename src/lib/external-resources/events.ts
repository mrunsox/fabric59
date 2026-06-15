/**
 * External-resource event helpers.
 *
 * Events are appended to the runner session under
 * `session.values[RESOURCE_EVENT_TRAIL_KEY]` (additive — no changes to the
 * Phase 7 submission pipeline contract). Embed runner also uses these helpers
 * so its in-memory event trail is identical to the canonical runner.
 */
import {
  RESOURCE_EVENT_TRAIL_KEY,
  type EvaluatedResource,
  type ExternalResource,
  type LaunchResolution,
  type ResourceEvaluationContext,
  type ResourceEvent,
  type ResourceEventKind,
} from "./types";

const TRAIL_CAP = 200;

interface SessionLike {
  values: Record<string, unknown>;
}

interface SessionMutator {
  setValue: (key: string, value: unknown) => void;
}

export function buildEvent(
  kind: ResourceEventKind,
  resource: ExternalResource,
  context: ResourceEvaluationContext,
  opts: { launchMode?: LaunchResolution["mode"]; detail?: string } = {},
): ResourceEvent {
  return {
    at: new Date().toISOString(),
    kind,
    resourceId: resource.id,
    resourceLabel: resource.label,
    resourceKind: resource.kind,
    launchMode: opts.launchMode,
    detail: opts.detail,
    context: {
      stepId: context.stepId ?? null,
      issueType: context.issueType ?? null,
      urgency: context.urgency ?? null,
      branch: context.branch ?? null,
      disposition: context.disposition ?? null,
      embedMode: context.embedMode ?? null,
    },
  };
}

export function readEventTrail(session: SessionLike): ResourceEvent[] {
  const raw = session.values[RESOURCE_EVENT_TRAIL_KEY];
  return Array.isArray(raw) ? (raw as ResourceEvent[]) : [];
}

export function recordEvent(
  session: SessionLike,
  mutator: SessionMutator,
  event: ResourceEvent,
): void {
  const trail = readEventTrail(session);
  const next = [...trail, event].slice(-TRAIL_CAP);
  mutator.setValue(RESOURCE_EVENT_TRAIL_KEY, next);
}

export function summarizeEvents(events: ResourceEvent[]): Record<ResourceEventKind, number> {
  const out = {} as Record<ResourceEventKind, number>;
  for (const e of events) {
    out[e.kind] = (out[e.kind] ?? 0) + 1;
  }
  return out;
}

export function dedupeSurfaced(
  events: ResourceEvent[],
  surfacedIds: string[],
): string[] {
  const already = new Set(events.filter((e) => e.kind === "surfaced").map((e) => e.resourceId));
  return surfacedIds.filter((id) => !already.has(id));
}

/** Convenience used by panel rendering to log first-time surfacing of
 *  recommended/available resources. */
export function surfaceEvaluated(
  session: SessionLike,
  mutator: SessionMutator,
  evaluated: EvaluatedResource[],
  context: ResourceEvaluationContext,
): void {
  if (!evaluated.length) return;
  const trail = readEventTrail(session);
  const known = new Set(trail.filter((e) => e.kind === "surfaced").map((e) => e.resourceId));
  const newOnes = evaluated.filter((e) => !known.has(e.resource.id));
  if (!newOnes.length) return;
  const next = [...trail, ...newOnes.map((e) => buildEvent("surfaced", e.resource, context))].slice(-TRAIL_CAP);
  mutator.setValue(RESOURCE_EVENT_TRAIL_KEY, next);
}
