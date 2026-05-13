/**
 * Phase 0 — Canonical MarketingShell (re-export).
 *
 * Re-exports the existing MarketingLayout so canonical pages can import from
 * the new shells/ namespace immediately. Phase 1 replaces the body with new
 * canonical chrome (header + footer driven by MARKETING_NAV).
 */
export { MarketingLayout as MarketingShell } from "@/components/marketing/MarketingLayout";
export { MarketingLayout as default } from "@/components/marketing/MarketingLayout";
