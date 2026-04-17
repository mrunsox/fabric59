

# Build & Test All `/outline` Items That Don't Need External Integrations

## Scope

I'll implement all **planned** items from the build map that don't require user-supplied secrets (Stripe, Clio, MyCase, Five9, Resend, Twilio). Lovable AI Gateway counts as "no setup needed" since `LOVABLE_API_KEY` is auto-provisioned.

## Excluded (Need Secrets/Integrations)
- Billing Module → Stripe Integration
- Legal Connect → Five9 Reporting, Clio Deep Two-Way Sync, MyCase Adapter
- Notifications → Lifecycle Email Templates (Resend)

## Scope of Work (28 Planned Items Across 7 Categories)

### Sprint 1 — Marketing Expansion (7 items)
1. **Standalone FAQ Page** (`/faq`) — categorized accordion, search, FAQPage schema
2. **Product Tour Page** (`/product`) — interactive walkthrough with feature anchors
3. **Interactive Demo Sandbox** (`/demo`) — read-only mock app with guided tour
4. **Sticky Header on Scroll** — condensed `MegaMenuHeader` with backdrop blur
5. **Before/After Interactive Module** — draggable slider on landing page
6. **Persona Tabs Module** — role tabs (BPO / Legal / Home Services) on landing
7. **Live Product Visual in Hero** — animated mini UI preview

### Sprint 2 — AI Assistant & Guardrails (5 items)
1. **System Prompt File** — `prompts/assistant-system.txt` with guardrails
2. **Floating Chat Button** — bottom-right button in `AdminLayout`
3. **Assistant Panel with KB Grounding** — chat panel calling Lovable AI gateway, grounded in `knowledgeBase.ts` + `buildMap.ts`
4. **Edge Function** — `assistant-chat` calling `google/gemini-2.5-flash` with KB context
5. **Tenant-Configurable Assistant** — `assistant_config` table + settings UI
6. **Contextual Help Icons** — `<HelpIcon />` component on complex pages

### Sprint 3 — Notifications & Data Portability (3 items)
1. **Notification Bell in Header** — bell with unread badge, dropdown using existing `useNotifications` hook
2. **CSV Export for Main Entities** — reusable `exportToCsv` util + buttons on agents, tenants, campaigns, call logs
3. **Import Wizard Component** — `<ImportWizard />` with upload, column mapping, validation, preview, write
4. **Webhook Event Layer** — `platform_events` table + `emitEvent` helper

### Sprint 4 — Onboarding Polish (4 items)
1. **AI-Recommended Setup Defaults** — Lovable AI suggestion based on intent answers
2. **Invite Team Step** — onboarding step using existing `invite-member` function
3. **Getting Started Dashboard Widget** — persistent checklist on `UserDashboardPage`
4. **Onboarding Restart from Settings** — button in Settings to reset and reopen tour

### Sprint 5 — Prompt Governance (3 items)
1. **Prompts Directory** — `prompts/` folder with `INDEX.md` listing all prompts
2. **Prompt Change Tracking** — header in each prompt file with version + change log
3. **Safety-Labeled Prompts** — `[SAFETY]` / `[USER-FACING]` labels on relevant prompts

### Sprint 6 — Legal Connect (3 items, no external API needed)
1. **Tenant Testing Framework** — `legal_connect_test_plans` + `_test_runs` tables, edge function, Testing tab UI
2. **Example Library & Seed Data** — `legal_connect_examples` table seeded with ~30 scenarios
3. **AI Prompt Pack System** — `legal_connect_prompts` table seeded with ~15 templates, editable UI
4. **AI Edge Function** (`legal-connect-ai`) — Lovable AI gateway executor with context merging
5. **Agent Context Panel** — agent-facing call summary component
6. **Go-Live Readiness Tools** — readiness checklist UI + risk analysis

### Sprint 7 — Web Callback (1 item)
1. **QR Code Inbound Routing** — DID-to-tenant mapping table, source_channel tracking

## Database Migrations Required

- `assistant_config` (per-tenant assistant name, avatar, enabled)
- `platform_events` (webhook event bus)
- `legal_connect_test_plans` + `legal_connect_test_runs`
- `legal_connect_examples` (seeded)
- `legal_connect_prompts` (seeded ~15 templates)
- `qr_did_mappings` (DID → tenant for QR inbound)

All tables get RLS policies scoped by org_id using existing `has_role` / `user_has_permission` helpers.

## Edge Functions Required

- `assistant-chat` — Lovable AI gateway, KB-grounded
- `legal-connect-ai` — Lovable AI gateway, context-aware prompt executor
- `legal-connect-test` — run test plans against tenant configs

All use existing `LOVABLE_API_KEY` (auto-provisioned).

## Files to Create (~35 new files)

Marketing: `FaqPage.tsx`, `ProductTourPage.tsx`, `DemoSandboxPage.tsx`, `BeforeAfterSlider.tsx`, `PersonaTabs.tsx`, `HeroProductVisual.tsx`
Assistant: `AssistantButton.tsx`, `AssistantPanel.tsx`, `HelpIcon.tsx`, `prompts/assistant-system.txt`, `useAssistant.ts`
Notifications: `NotificationBell.tsx`, `ImportWizard.tsx`, `exportToCsv.ts`, `usePlatformEvents.ts`
Onboarding: `GettingStartedWidget.tsx`, `InviteTeamStep.tsx`
Legal Connect: `TestingPanel.tsx` enhanced, `ExamplesPanel.tsx` enhanced, `PromptPackManager.tsx`, `AgentContextPanel.tsx` enhanced, `GoLiveReadiness.tsx`
Prompts dir: `prompts/INDEX.md`, `prompts/legal-connect-context.txt`, etc.

## Files to Edit (~15 files)
- `src/App.tsx` — add `/faq`, `/product`, `/demo` routes
- `src/components/layout/AdminLayout.tsx` — mount `<AssistantButton />`, `<NotificationBell />`
- `src/components/marketing/MegaMenuHeader.tsx` — sticky scroll, FAQ link
- `src/pages/LandingPage.tsx` — add BeforeAfter, PersonaTabs, HeroVisual
- `src/pages/onboarding/OnboardingPage.tsx` — add invite step, AI defaults
- `src/pages/admin/UserDashboardPage.tsx` — add GettingStartedWidget
- `src/pages/admin/SettingsPage.tsx` — add restart onboarding button, assistant config
- `src/pages/admin/LegalConnectPage.tsx` — wire new panels
- Various entity pages (agents, tenants, campaigns) — CSV export buttons
- `src/data/buildMap.ts` — flip 28 items from `planned` to `done`

## Testing Approach

After each sprint, mark items `tested: true` in `buildMap.ts`. The work is mostly UI + DB tables + edge functions using already-available Lovable AI; no external API keys needed.

## Estimated Scope

~35 new files, ~15 edits, 6 migrations, 3 edge functions. This is a large sprint. I'll execute it in the order above (Sprints 1 → 7) and report progress at each milestone.

