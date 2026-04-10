

# Premium Design System Overhaul + Onboarding Flows

This is a two-phase frontend-only redesign. No database changes. No edge functions.

---

## Phase 1: Design System Elevation

### 1A. Color & Typography Foundation (`src/index.css`)

Refine the CSS custom properties and utility classes:
- **Neutrals**: Tighten the dark palette — darker card backgrounds, more contrast between surfaces (`--card` slightly darker, `--muted` more subtle)
- **Status colors**: Add `--syncing`, `--pending-review`, `--disconnected` semantic tokens
- **Typography**: Add `.text-display` (text-4xl font-bold tracking-tight), `.text-headline` (text-xl font-semibold tracking-tight), `.text-caption` (text-[11px] font-medium uppercase tracking-wider text-muted-foreground)
- **Surfaces**: Refine `.surface-raised`, `.surface-inset` (recessed bg for filter bars), `.surface-overlay` (modals/drawers)
- **Borders**: Add `.border-subtle` (border-border/40), `.divider-gradient` (gradient fade separator)
- **Motion**: Add `.transition-premium` (200ms ease-out for all interactive), `.animate-slide-in-right`, `.animate-fade-up`
- Remove/refine `.glow-primary` (too flashy), make `.card-hover` quieter

### 1B. Core Component Refinements

**`button.tsx`** — Add `rounded-lg` default, subtle `shadow-sm` on default variant, `active:scale-[0.98]` micro-press

**`premium-stat-card.tsx`** — Refine hero card: remove blur blob, use cleaner accent bar, add optional sparkline slot, tighter spacing

**`premium-table.tsx`** — Add sticky filter bar slot, row group separators, hover quick-action column support, row expansion support

**`page-header.tsx`** — Add breadcrumb slot, action bar row below title for filters/tabs, stronger divider

**`status-badge.tsx`** — Add `syncing`, `review`, `disconnected` variants. Add size variants (sm/default/lg)

**`health-indicator.tsx`** — Add `syncing` and `pending` states with animated indicators

**New: `src/components/ui/action-banner.tsx`** — Dismissible recommendation/warning banner for dashboard pages (icon + message + CTA + dismiss)

**New: `src/components/ui/metric-strip.tsx`** — Horizontal strip of 3-5 compact inline metrics for secondary data rows

**New: `src/components/ui/step-card.tsx`** — Onboarding step card with icon, title, description, status indicator, and expandable content

### 1C. Sidebar & Shell Elevation (`AdminLayout.tsx`)

- Refine sidebar gradient (more subtle, stop at ~60%)
- Group labels: increase top margin to `mt-6` for stronger visual separation
- Active state: make accent bar `2px` (not 3), add `font-semibold` to active text
- Add collapsible mini-sidebar mode (icons only at `w-14`) for larger screens
- Header: add thin bottom-border gradient, remove redundant HealthIndicator (move into dashboard hero)
- Breadcrumb: show parent group > current page

### 1D. Design System Reference Page

**New: `src/pages/admin/DesignSystemPage.tsx`** — Internal style guide showing:
- Color tokens rendered as swatches
- Typography scale examples
- Component gallery (buttons, badges, cards, tables, health indicators)
- Status system reference
- Dashboard pattern examples

Add route at `/admin/design-system` and sidebar entry under Platform group.

---

## Phase 2: Premium Onboarding Flows

### 2A. Onboarding Architecture Overhaul (`OnboardingPage.tsx`)

Restructure into a role-aware router that selects one of three flows:

- **Partner Setup Flow** — for new white-label partners
- **Client Setup Flow** — for adding a client under a partner
- **Legal Connect Activation Flow** — for activating CRM sync under a client

The existing onboarding (org → domain → test → intent → tenant → complete) becomes the foundation for Partner Setup, with the other two as new flows accessible from dashboard CTAs.

### 2B. Partner Setup Flow (enhance existing `OnboardingPage.tsx`)

Upgrade existing steps with premium treatment:
- **Welcome screen**: Full-width hero with outcome messaging, role selection
- **Organization step**: Add "why this matters" contextual helper card alongside form
- **Domain step**: Add credential security messaging, animated connection indicators
- **Testing step**: Bigger status display, animated progress, detailed connection report
- **Intent step**: Richer cards with feature previews
- **Client step**: Add CRM recommendation based on intent, policy preset suggestion
- **Complete screen**: Readiness score (% of setup complete), configured checklist, remaining items, primary CTA + secondary "Continue Setup"

### 2C. Client Setup Flow

**New: `src/components/onboarding/ClientOnboardingFlow.tsx`**

Steps:
1. **Welcome** — "Setting up [Client Name] under [Partner]"
2. **Client Profile** — Name, vertical/industry, team size
3. **CRM Selection** — Card-based picker with capability indicators
4. **Campaign Ownership** — Five9 campaign assignment
5. **Policy Defaults** — AI-recommended presets based on vertical + CRM
6. **Review & Create** — Summary card with readiness indicators

### 2D. Legal Connect Activation Flow

**New: `src/components/onboarding/LegalConnectActivationFlow.tsx`**

Steps:
1. **Welcome** — "Activating Legal Connect for [Client]"
2. **Connect CRM** — OAuth or credential entry with live validation
3. **Map Campaigns** — Five9 campaign ↔ CRM workspace mapping
4. **Configure Variables** — Call variable + disposition mapping with AI suggestions
5. **Set Policies** — Pass-through policy picker with "explain" panel
6. **Run Tests** — Automated test suite with pass/fail results
7. **Review Readiness** — Score, blockers, warnings
8. **Activate** — Confirmation with "what happens next" summary

### 2E. Shared Onboarding Components

**Enhance `OnboardingMilestones.tsx`** — Add completion percentage, estimated time remaining, milestone grouping

**New: `src/components/onboarding/OnboardingContextHelper.tsx`** — Side panel that explains downstream effects of current setup decision

**New: `src/components/onboarding/ReadinessScore.tsx`** — Circular progress with score, configured items list, blocker warnings

**New: `src/components/onboarding/AIRecommendationCard.tsx`** — "AI suggests..." card with reasoning and accept/customize actions

---

## File Summary

**New files (8):**
1. `src/components/ui/action-banner.tsx`
2. `src/components/ui/metric-strip.tsx`
3. `src/components/ui/step-card.tsx`
4. `src/pages/admin/DesignSystemPage.tsx`
5. `src/components/onboarding/ClientOnboardingFlow.tsx`
6. `src/components/onboarding/LegalConnectActivationFlow.tsx`
7. `src/components/onboarding/OnboardingContextHelper.tsx`
8. `src/components/onboarding/ReadinessScore.tsx`
9. `src/components/onboarding/AIRecommendationCard.tsx`

**Modified files (10):**
1. `src/index.css` — refined tokens, new utility classes, motion
2. `src/components/ui/button.tsx` — rounded-lg, micro-press, shadow
3. `src/components/ui/premium-stat-card.tsx` — cleaner hero, sparkline slot
4. `src/components/ui/premium-table.tsx` — filter slot, row expansion
5. `src/components/ui/page-header.tsx` — breadcrumb, action bar
6. `src/components/ui/status-badge.tsx` — new variants, sizes
7. `src/components/ui/health-indicator.tsx` — syncing/pending states
8. `src/components/layout/AdminLayout.tsx` — sidebar refinements, breadcrumb
9. `src/components/onboarding/OnboardingMilestones.tsx` — completion %, grouping
10. `src/pages/onboarding/OnboardingPage.tsx` — premium treatment, role routing
11. `src/pages/admin/UserDashboardPage.tsx` — action banners, metric strip
12. `src/App.tsx` — add design system route

**Execution order:**
1. Design tokens + CSS utilities
2. Core component refinements (button, badges, cards, tables)
3. New shared components (action-banner, metric-strip, step-card)
4. Sidebar & shell elevation
5. Dashboard pages — apply new components
6. Design system reference page
7. Onboarding shared components (context helper, readiness, AI card)
8. Partner setup flow enhancement
9. Client setup flow
10. Legal Connect activation flow

