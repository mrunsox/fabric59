

# Prompt Alignment Audit — Fabric59 vs Ultra Master Standards

## Summary

Fabric59 is **well-aligned** on core infrastructure (auth, multi-tenant, RLS, build map, marketing shell, onboarding) but has **notable gaps** in several extended segments. Below is a section-by-section breakdown.

---

## Alignment Scorecard

| Prompt Section | Status | Notes |
|---|---|---|
| **0. Client readiness / multi-tenant** | DONE | Three-level hierarchy (Org → Partner → Client), per-tenant branding, RLS everywhere |
| **1. Layout, nav, auth** | DONE | Left sidebar, top sub-nav, `/login` with back-to-home, forgot password flow |
| **2. Footer / UNSOX branding** | DONE | Orange pulsing heart linking to unsox.com, dynamic copyright year in `MegaFooter.tsx` |
| **3. /outline build map** | PARTIAL | `buildMap.ts` exists with 23 categories, `/outline` route works, "Tested" checkbox present. **Missing:** "KB" checkbox column, `requiredSecrets` array, unfinished-items-float-to-top ordering |
| **4. Knowledge base** | PARTIAL | DB-backed KB exists (`kb_categories`, `kb_articles`, hooks). **Missing:** `knowledgeBase.ts` file derived from buildMap with structured fields (`publicTitle`, `summary`, `howItWorks`, `whenToUseIt`, `faq`). KB checkbox not wired in `/outline` |
| **5. Required secrets** | MISSING | No `requiredSecrets` array in `buildMap.ts`, no secrets section on `/outline` |
| **6. AI assistant** | MISSING | No floating chat button, no assistant panel, no KB-wired AI assistant, no tenant-configurable assistant settings |
| **6a. AI guardrails** | MISSING | No `/prompts` directory, no system prompt template, no guardrails config |
| **7. Marketing site** | PARTIAL | `/` landing page is rich with mega menu, feature tabs, stats, testimonials, pricing, FAQ. **Missing:** `/product`, `/demo`, `/faq` as separate routes. No interactive sandbox/scripted demo. No before/after slider or persona tabs |
| **8. SEO / AI readiness** | DONE | `SEOHead.tsx`, `StructuredData.tsx`, `robots.txt`, `sitemap.xml`, `llms.txt`, `ai.txt` all present |
| **9. Copy rules (no dashes)** | NOT AUDITED | Would need a content sweep |
| **10. Onboarding** | DONE | `/onboarding` with milestone rail, Five9 connection test, intent capture, readiness score, context helper. Concierge model implemented |
| **11. Data model / RLS** | DONE | `tenant_id`, timestamps, soft delete, RLS on all tables, `user_has_permission()` security definer |
| **12. Notifications** | PARTIAL | `notifications` table, `NotificationsPage`, `useNotifications` hook. **Missing:** in-app notification bell/center icon in header, lifecycle emails, webhook event layer |
| **13. Analytics / instrumentation** | PARTIAL | `api_logs`, call session tracking, outcome analytics exist. **Missing:** structured activation/engagement/retention event logging, error rate tracking on critical flows |
| **14. Roles / permissions / audit** | DONE | Granular permissions table, `user_has_permission()`, permission-based sidebar, audit log table for agent lifecycle |
| **15. Import/export** | PARTIAL | Report exports exist. **Missing:** CSV export for main entities, import wizard, data portability docs |
| **16. Contextual help** | MISSING | No contextual help icons on complex pages, no KB ↔ assistant cross-links |
| **17. Prompt governance** | MISSING | No `/prompts` directory, no prompt library, no change tracking |
| **18. Testing mindset** | PARTIAL | `/outline` tested checkboxes work. Test console exists. **Missing:** vitest coverage is minimal (only `example.test.ts`) |

---

## Website Builder Prompt Gaps

| Requirement | Status |
|---|---|
| `/product` deep tour page | MISSING |
| `/demo` interactive sandbox | MISSING |
| `/faq` standalone route | MISSING (inline accordion on landing only) |
| `/legal/privacy` | MISSING |
| `/legal/terms` | DONE (`/terms`) |
| Sticky header on scroll | MISSING |
| Interactive storytelling (3+ modules) | PARTIAL (FeatureTabs only; no before/after slider, persona tabs, or mini dashboard sim) |
| Live/simulated product visual in hero | MISSING (static content only) |

## Onboarding Prompt Gaps

| Requirement | Status |
|---|---|
| Multi-step concierge flow | DONE |
| AI-guided intent capture | PARTIAL (intent step exists but no AI recommendation engine) |
| Profile + workspace basics step | PARTIAL (org name collected, no avatar/timezone/color) |
| First object creation with AI assist | MISSING |
| Invite team step | MISSING |
| Micro tour after setup | DONE (GuidedTour, AdminTour, MasterTour components) |
| Getting started dashboard widget | MISSING |
| Onboarding restart from settings | MISSING |

---

## Priority Gaps to Close (Recommended Sprint Order)

### Sprint A — Build Map & KB Alignment (quick wins)
1. Add `requiredSecrets` array to `buildMap.ts` with Stripe, Five9, Clio, Google, Slack keys
2. Add "KB" checkbox column to `/outline`
3. Add "Required Secrets" section to `/outline`
4. Add unfinished-items-float-to-top sorting
5. Create `src/data/knowledgeBase.ts` with structured fields derived from buildMap

### Sprint B — AI Assistant + Guardrails
1. Build floating chat button component for logged-in users
2. Create assistant panel with KB-grounded responses
3. Create `/prompts/assistant-system.txt` with guardrails from section 6a
4. Add tenant-configurable assistant settings (name, avatar, enabled toggle)
5. Wire contextual help icons on complex pages

### Sprint C — Marketing Expansion
1. Add `/product` deep tour page
2. Add `/demo` interactive sandbox (read-only mini app with mock data)
3. Add `/faq` standalone route
4. Add `/legal/privacy` route
5. Add sticky header behavior on scroll
6. Add 2 more interactive storytelling modules (before/after slider, persona tabs)
7. Add live product visual in hero section

### Sprint D — Notifications + Import/Export
1. Add notification bell icon in header with dropdown
2. Add CSV export buttons for main entity tables
3. Add import wizard component
4. Define lifecycle email templates
5. Create webhook event layer for key actions

### Sprint E — Onboarding Polish
1. Add AI-recommended setup defaults based on intent answers
2. Add invite team step to onboarding flow
3. Add "Getting started" dashboard widget with checklist
4. Add onboarding restart option in settings

No code changes needed now. This is a gap analysis only. Let me know which sprint to tackle first.

