/**
 * Canonical noun migrations (Fabric59 Canonical Strip + Rebuild).
 *
 * UI-only reference. Database tables, types, and hooks keep their legacy
 * names until later phases; user-facing labels move first.
 *
 * Use this list when reviewing PRs to surface mismatched nouns in the UI.
 */
export const CANONICAL_TERMS = {
  // legacy -> canonical (user-facing label)
  Tenant: "Client",
  tenant: "client",
  Tenants: "Clients",
  tenants: "clients",
  // "Workspace" should ONLY appear where a real workspace concept exists
  // (org switcher, future workspace shell, this outline doc).
  // Avoid it as a synonym for organization or for client.
} as const;

/**
 * Phase ownership of each rename.
 */
export const TERM_RENAME_PHASE: Record<string, string> = {
  "tenant->client (UI labels)": "Phase 1",
  "tenant->client (DB tables)": "deferred — not in current spec scope",
  "introduce real Workspace entity": "Phase 2",
  "scripts/scripter/tree-editor->Guide": "Phase 4",
};
