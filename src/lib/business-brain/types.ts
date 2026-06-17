/**
 * Business Brain — Phase 1 / Slice 1 public types.
 *
 * Truth model:
 *   Source        → ingested artifact (upload, paste, etc.)
 *   Extraction    → raw AI extraction (suggested | approved | rejected | superseded)
 *   Fact          → governed, reviewer-approved business memory
 *   FactRelation  → typed edges between approved facts
 *   ReviewEvent   → audit trail of every state change
 *
 * Downstream consumers (ASC, canonical, agent workspace) MUST import from
 * `@/lib/business-brain/selectors` only. They MUST NOT import raw table row
 * types, extraction payload internals, or DB modules. See
 * `docs/business-brain-architecture.md`.
 */

export const BB_ENTITY_TYPES = [
  "department",
  "service",
  "staff",
  "phone",
  "hours",
  "destination_contact",
  "faq",
  "escalation_contact",
  "intake_requirement",
  "policy",
] as const;
export type BbEntityType = (typeof BB_ENTITY_TYPES)[number];

export const BB_SOURCE_KINDS = [
  "upload_doc",
  "paste_text",
  "paste_faq",
  "upload_csv",
  "url_crawl",
] as const;
export type BbSourceKind = (typeof BB_SOURCE_KINDS)[number];

export type BbSourceStatus =
  | "pending"
  | "processing"
  | "processed"
  | "failed"
  | "superseded";

export type BbReviewStatus =
  | "suggested"
  | "approved"
  | "rejected"
  | "superseded";

export type BbVerificationState = "approved" | "needs_review" | "stale";

export type BbRelationKind =
  | "staff_in_department"
  | "department_handles_service"
  | "route_to_destination"
  | "faq_about_service"
  | "service_in_area"
  | "escalation_for";

export type BbReviewAction =
  | "approve"
  | "reject"
  | "edit"
  | "merge"
  | "supersede"
  | "reopen";

export interface BbSourceRef {
  source_id: string;
  extraction_id: string | null;
  snippet: string | null;
}
