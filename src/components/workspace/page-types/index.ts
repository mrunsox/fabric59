/**
 * Phase 3 — Canonical workspace page-type primitives.
 *
 * Use these instead of hand-rolling page chrome. Each primitive is a thin
 * wrapper over WorkspacePageHeader + shared layout tokens; none introduce
 * new visual language or own data.
 */
export { ListPage } from "./ListPage";
export { DetailPage } from "./DetailPage";
export { BuilderPage } from "./BuilderPage";
export { ConfigPage, type ConfigSection } from "./ConfigPage";
export { LogPage, type LogStat } from "./LogPage";
