/**
 * Phase 2 — Compatibility re-export.
 *
 * The canonical AuthShell now lives at "@/shells/AuthShell". This file
 * remains as a thin re-export so any historical import path keeps working
 * during the rebuild window.
 */
export { AuthShell, default } from "@/shells/AuthShell";
