/**
 * Business Brain — read-only bridge selectors.
 *
 * THIS FILE IS THE BRIDGE BOUNDARY. Downstream consumers (ASC, canonical
 * builder, agent workspace) MAY import the view-model types and async
 * selectors declared here. They MUST NOT import:
 *
 *   - raw bb_* table row types from src/integrations/supabase/types.ts
 *   - extraction internals (payload shapes, review actions)
 *   - hooks under src/hooks/useBusinessBrain*
 *   - pages under src/pages/workspace/brain/
 *
 * Slice 1 ships the boundary with stub implementations that return empty
 * lists. Phase 2 wires real queries through this same surface so ASC never
 * needs new import paths to start using approved facts.
 *
 * See docs/business-brain-architecture.md (Bridge rules).
 */
import type { BbEntityType, BbVerificationState } from "./types";

/**
 * Workspace-scoped, read-only view of an approved fact. Intentionally narrow
 * — no DB row leaks through. Downstream code reads only these fields.
 */
export interface ApprovedFactView {
  id: string;
  workspaceId: string;
  clientId: string | null;
  entityType: BbEntityType;
  displayName: string;
  /** Frozen, denormalized payload. Treat as opaque per-entity-type. */
  payload: Readonly<Record<string, unknown>>;
  verificationState: BbVerificationState;
  lastReviewedAt: string;
  sourceCount: number;
}

export interface ApprovedFactQuery {
  workspaceId: string;
  clientId?: string | null;
  entityType?: BbEntityType;
  limit?: number;
}

/**
 * Stub for Slice 1. Real implementation lands in Phase 2 Slice 1 and
 * queries `bb_facts` filtered by workspace/client/entity_type, returning
 * verification_state ∈ {approved, needs_review} only (never stale, never
 * superseded). ASC and canonical code can already depend on this signature.
 */
export async function listApprovedFacts(
  _query: ApprovedFactQuery,
): Promise<ApprovedFactView[]> {
  return [];
}

/**
 * Stub for Slice 1. Real implementation in Phase 2 returns the source
 * snippets behind a given fact so suggestion UIs can show "from <source>".
 */
export async function getFactSourceRefs(
  _factId: string,
): Promise<Array<{ sourceId: string; snippet: string | null }>> {
  return [];
}
