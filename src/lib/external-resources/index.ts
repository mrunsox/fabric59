/**
 * # External Resource Workspace — Architecture
 *
 * Lightweight tracking pointer to docs/external-resource-workspace-architecture.md.
 * This module re-exports the public surface only; no logic.
 */
export * from "./types";
export * from "./normalize";
export * from "./evaluateResources";
export * from "./resolveLaunchMode";
export { renderTemplate, resolveResourceUrl, SUPPORTED_TOKENS } from "./resolveParams";
export * from "./events";
export * from "./reasons";
