/**
 * Phase 0 — Canonical AuthShell (re-export).
 *
 * Re-exports the existing premium AuthShell. Phase 2 will move it under
 * src/shells/ proper and restyle in canonical tokens.
 */
export { AuthShell } from "@/components/auth/AuthShell";
export { AuthShell as default } from "@/components/auth/AuthShell";
