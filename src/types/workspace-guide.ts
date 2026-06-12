/**
 * Phase 4 — Canonical Workspace Guide (singleton, section-based).
 *
 * Stored in guide_versions.content for the singleton guide row per workspace
 * (the row with metadata.kind = 'workspace_singleton'). This is a parallel
 * schema variant (schemaVersion: 2) — does NOT replace GuideContentV1, which
 * remains the schema for per-campaign block-style guides.
 */

export const WORKSPACE_GUIDE_SINGLETON_KIND = "workspace_singleton" as const;
export const WORKSPACE_GUIDE_SINGLETON_NAME = "__workspace_guide__" as const;
export const WORKSPACE_GUIDE_SCHEMA_VERSION = 2 as const;

/** Generic, industry-agnostic section types. Templates may use any/all. */
export type WorkspaceGuideSectionKind =
  | "greeting"
  | "business_overview"
  | "service_descriptions"
  | "specialties"
  | "hours"
  | "callback_policy"
  | "escalation_contacts"
  | "special_handling"
  | "faqs"
  | "exceptions"
  | "internal_notes"
  | "custom";

/** Visibility: agent-facing (rendered in live runner) or internal-only. */
export type WorkspaceGuideVisibility = "agent" | "internal";

export interface WorkspaceGuideField {
  id: string;
  label: string;
  /** Free text body for the field. */
  value: string;
}

export interface WorkspaceGuideSection {
  id: string;
  kind: WorkspaceGuideSectionKind;
  /** Editable display label. Templates seed sensible defaults. */
  label: string;
  description?: string;
  /** Optional short note (e.g. instructions to the editor). */
  helper?: string;
  visibility: WorkspaceGuideVisibility;
  required: boolean;
  enabled: boolean;
  /** Structured fields — keeps content bounded vs. an unconstrained WYSIWYG. */
  fields: WorkspaceGuideField[];
}

export interface WorkspaceGuideContentV2 {
  schemaVersion: 2;
  sections: WorkspaceGuideSection[];
}

export const EMPTY_WORKSPACE_GUIDE: WorkspaceGuideContentV2 = {
  schemaVersion: 2,
  sections: [],
};

export interface WorkspaceGuideTemplate {
  id: string;
  name: string;
  description: string;
  /** Marketing pack hint — kept industry-neutral on the builder chrome. */
  vertical?: "generic" | "legal" | string;
  build: () => WorkspaceGuideContentV2;
}
