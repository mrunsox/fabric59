# ASC Shadow Rollout — Phase 6 · Slice 2

This document is the operator guide for the ASC (Assisted Script Creation) shadow rollout. It pairs with `docs/asc-architecture.md`, which is the source of truth for the ASC ↔ canonical handoff architecture.

## Goal

Quietly observe ASC end-to-end usage with a small, trusted audience to decide whether to invest further in ASC, simplify it, or remove it.

Success criteria: 10–20 full ASC → canonical journeys from people who actually ship campaigns, over 2–4 weeks.

## Audience

- Internal team members (always on for ops).
- 2–5 trusted customers who are already comfortable building campaigns and willing to give structured feedback.

Do not promote ASC in the main nav, marketing surfaces, or onboarding.

## Enabling ASC for a workspace

ASC is gated by `resolveAscWizardFlag`. Precedence (highest first):

1. Dev override (DEV builds only): `localStorage.fabric59.features.ascWizard.enabled = "1"`.
2. Merged config — `features.ascWizard.enabled === true` from Client > Partner > Org `integration_configs`.
3. Default: off.

For pilots, set the flag at the most specific scope you want:

- Org: `organizations.integration_configs.features.ascWizard.enabled = true`
- Partner: `partners.integration_configs.features.ascWizard.enabled = true`
- Client (tenant): `tenants.integration_configs.features.ascWizard.enabled = true`

Only the literal boolean `true` enables ASC. Strings, `1`, `"true"`, null, or malformed values resolve to `false`.

## Expectation copy for pilot users

When introducing a pilot user, give them this short framing:

> ASC is an assisted campaign design wizard. It helps you think through caller types, outcomes, and routing before you commit. When you're done, it hands the draft off into the normal canonical campaign builder for final review and publish. ASC itself never publishes a campaign.

## What we measure

All events land in `platform_events` with `source: "asc"` (or `"canonical"` for the canonical-side ASC-origin events) and `event_type` prefixed `asc_` or `canonical_from_asc_`.

Event catalog: see `src/lib/asc/telemetry.ts` — `ASC_EVENT_TYPES`.

Wizard lifecycle:

- `asc_wizard_opened`
- `asc_step_completed` — `{ step, usedAi }`
- `asc_step_back` — `{ step }`
- `asc_wizard_abandoned` — `{ lastStep }`

AI usage:

- `asc_ai_call` — `{ role, step, outcome, errorCode? }`
- `asc_ai_proposal_confirmed` — `{ role, step, targetField }`

Readiness + handoff:

- `asc_readiness_viewed` — `{ blockerCount, warningCount }`
- `asc_readiness_blocker_seen` — `{ blockerId }`
- `asc_handoff_initiated`
- `asc_handoff_completed`

Canonical side (ASC-origin only):

- `canonical_from_asc_opened`
- `canonical_from_asc_saved`
- `canonical_from_asc_published`

## Reading the rollout

Use `/superadmin/asc-shadow` for the live observation dashboard. It reads `platform_events` for the last 30 days and renders:

- A funnel from `opened` → `published`.
- AI adoption: % of step completions with `usedAi=true`.
- Top blockers seen.
- Per-draft handoff drop-off.

Do not infer success from a single number. The goal is to spot clusters of pain that justify Phase 7 work — or the absence of pain that justifies retiring features.

## Out of scope

- No automated rollout expansion. Adding a pilot workspace is a manual config change.
- No DB schema changes for telemetry — events ride on the existing `platform_events` table.
- No publishing from ASC. The canonical builder remains the only publish surface.
