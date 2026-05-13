/**
 * Phase 0 — Canonical OnboardingShell (re-export).
 *
 * Re-exports the concierge OnboardingShell. Phase 2 consolidates the
 * onboarding flow so it lands directly on /w/:defaultId/home.
 */
export { OnboardingShell } from "@/components/onboarding/OnboardingShell";
export type { OnboardingStepDef } from "@/components/onboarding/OnboardingShell";
export { OnboardingShell as default } from "@/components/onboarding/OnboardingShell";
