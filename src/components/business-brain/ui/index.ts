/**
 * Phase 2 Brain UI primitives — presentation only.
 *
 * These wrappers exist to keep raw styling decisions OUT of page
 * components. Pages compose primitives; primitives own the tokens.
 *
 * Constraints (Phase 2 scope guards):
 * - No business logic, no data fetching, no router state.
 * - Tokens flow from src/index.css :root + tailwind.config.ts; do not
 *   hardcode colors here.
 * - Cyan accents stay restrained (focus + active tab + info badges).
 */
export { BrainPanel } from "./BrainPanel";
export type { BrainPanelTone } from "./BrainPanel";
export { BrainPageHeader } from "./BrainPageHeader";
export { BrainStatCard } from "./BrainStatCard";
export type { BrainStatState } from "./BrainStatCard";
export { BrainBadge } from "./BrainBadge";
export type { BrainBadgeTone } from "./BrainBadge";
export { BrainTabsBar } from "./BrainTabsBar";
export type { BrainTab } from "./BrainTabsBar";
export { BrainTable } from "./BrainTable";
export type { BrainTableDensity } from "./BrainTable";
