

# Premium Dashboard & Onboarding Redesign

## What changes

This is a comprehensive UI/UX elevation across the dashboard shell, KPI components, tables, sidebar, and onboarding flow. No database changes. No new edge functions. Pure frontend refinement.

---

## Part 1: Design System Foundation

**`src/index.css`** — Add premium utility classes:
- `.card-elevated` — subtle shadow + border gradient for hero cards
- `.card-glass` — frosted glass with faint border highlight
- `.metric-hero` — large metric card with gradient accent bar
- `.metric-secondary` — medium metric with trend sparkline area
- `.surface-raised` — elevated content surface with refined shadow
- Refine `.card-hover` to be subtler (softer shadow, no border color shift)
- Add `.header-gradient` — faint top-border gradient for page headers
- Premium skeleton/loading classes with smoother pulse

**`tailwind.config.ts`** — No structural changes needed, existing color system is solid.

---

## Part 2: Premium Shared Components

### New: `src/components/ui/premium-stat-card.tsx`
Three tiers of stat cards:
- **Hero**: Large card spanning 2 cols, gradient accent top-border, large value, trend chart area, status indicator
- **Standard**: Current size but with refined spacing, micro trend indicator, subtle icon treatment
- **Compact**: Small inline metric for secondary data

### New: `src/components/ui/page-header.tsx`
Premium page header component:
- Title with stronger typography (text-3xl font-bold tracking-tight)
- Subtitle text
- Right-side slot for status chips and action buttons
- Optional gradient top-border accent
- System health indicators inline

### New: `src/components/ui/premium-table.tsx`
Wrapper around existing Table with:
- Sticky header with refined background
- Better row hover (bg-muted/30 not bg-muted/50)
- Row click handler with subtle scale micro-animation
- Quick action buttons on hover (visible on row hover)
- Premium empty state with illustration placeholder
- Better loading skeleton rows

### New: `src/components/ui/health-indicator.tsx`
Reusable system health component:
- Dot + label format
- Variants: healthy, degraded, critical, offline
- Optional pulse animation for healthy state
- Used in headers, cards, and tables

### Update: `src/components/ui/status-badge.tsx`
- Slightly larger padding
- Smoother border-radius
- Add subtle inner shadow for depth

---

## Part 3: Sidebar Elevation

**`src/components/layout/AdminLayout.tsx`**:
- Sidebar background: slightly darker with subtle gradient (top to bottom)
- Logo area: add faint bottom separator with gradient fade
- Group labels: slightly more spacing above, letter-spacing increase
- Active state: replace solid bg with left-accent-bar (3px primary bar on left) + subtle bg tint
- Hover state: softer, bg-sidebar-accent/30 instead of /50
- User card at bottom: refined with subtle top border, avatar ring on hover
- Breadcrumb in header: add page icon before current page name
- System status chip in header: more refined pill with icon

---

## Part 4: Dashboard Pages Redesign

### `src/pages/admin/UserDashboardPage.tsx` (Main Admin Dashboard)
Transform from flat 4-card grid + table to:
- **Premium PageHeader** with org name, system health chip, quick actions
- **Hero Integration Health card** (2-col span): sync success rate, webhook health, failures count, review pending — with gradient accent
- **Secondary metric strip**: 3 standard cards (Agents, Clients, Domains)
- **"Needs Attention" section**: condensed alert list for webhook renewals, failed syncs, pending reviews
- **Recent Activity table**: premium table treatment with avatars, status badges, quick actions
- Right-side compact panel: onboarding progress (if incomplete), AI recommendations

### `src/pages/admin/ClientOverviewPage.tsx`
- Replace header with PageHeader component
- Upgrade StatCard row to use PremiumStatCard (hero for CRM connection status)
- Tab bar: refined with bottom-border indicator instead of pill background
- Tables: use PremiumTable wrapper
- Cards: use surface-raised class, refined spacing

### `src/pages/admin/AgentDashboardPage.tsx`
- PageHeader with agent name and shift status
- Hero card for today's call performance
- Refined task list and training progress sections

---

## Part 5: Onboarding Redesign

**`src/pages/onboarding/OnboardingPage.tsx`** — Major restructure:

**Layout**: Split-screen on desktop. Left: progress rail with activation milestones. Right: current step content.

**Progress rail** (new left panel):
- Vertical stepper with milestone labels
- Completed steps get checkmark + green
- Current step highlighted with primary accent
- Future steps dimmed
- Milestones: Organization → Five9 Domain → Connection Test → Setup Intent → Client Config → Go Live

**Step content improvements**:
- Each step gets a header with step title + "why this matters" subtitle
- Contextual helper card on right explaining downstream effects
- Smoother transitions between steps (fade + slide)
- Success states with confetti-style check animation
- Connection test: bigger status display with animated indicators

**New completion screen**:
- Readiness score (percentage)
- Checklist of configured vs remaining items
- "Launch Dashboard" primary CTA
- "Continue Setup" secondary for remaining items

**Role-aware behavior**:
- If partner admin: show partner-specific language and hierarchy setup
- If client admin: streamlined client-only flow

---

## Part 6: Premium Empty & Loading States

### New: `src/components/ui/premium-empty-state.tsx`
- Icon + title + description + CTA button
- Subtle background pattern or gradient
- Used across all pages

### Loading skeletons
- Update existing skeleton usage to use smoother animation
- Add card-shaped skeleton presets
- Table skeleton with realistic row shapes

---

## Files to create (6):
1. `src/components/ui/premium-stat-card.tsx`
2. `src/components/ui/page-header.tsx`
3. `src/components/ui/premium-table.tsx`
4. `src/components/ui/health-indicator.tsx`
5. `src/components/ui/premium-empty-state.tsx`
6. `src/components/onboarding/OnboardingMilestones.tsx`

## Files to modify (7):
1. `src/index.css` — premium utility classes
2. `src/components/ui/status-badge.tsx` — refined styling
3. `src/components/layout/AdminLayout.tsx` — sidebar + header elevation
4. `src/pages/admin/UserDashboardPage.tsx` — premium dashboard layout
5. `src/pages/admin/ClientOverviewPage.tsx` — premium page treatment
6. `src/pages/admin/AgentDashboardPage.tsx` — premium page treatment
7. `src/pages/onboarding/OnboardingPage.tsx` — concierge onboarding redesign

## Execution order:
1. Design system foundation (CSS + new shared components)
2. Sidebar and header elevation
3. Dashboard pages redesign
4. Onboarding redesign
5. Apply premium treatment to remaining pages

