

# Premium Clients Page + Sidebar Refinement

Redesign the Clients list page (`TenantsPage.tsx`) into a premium integration command center and refine the app shell for consistency.

---

## Current State

The `TenantsPage.tsx` uses the old `StatCard` and `DataTable` components — flat, generic, template-level. The sidebar was already elevated in the previous pass but can be tightened further. The premium design system components (`PremiumStatCard`, `PremiumTable`, `PageHeader`, `ActionBanner`, `MetricStrip`, `HealthIndicator`) already exist and are underused on this page.

---

## Changes

### 1. Clients Page Redesign (`src/pages/admin/TenantsPage.tsx`)

**Header**: Replace inline title/buttons with `PageHeader` component. Add icon, subtitle with live client count, and grouped action buttons (Add Client primary, Sync from Five9 outline, Export ghost).

**Metrics**: Replace 4x `StatCard` grid with:
- 1 `PremiumStatCard` hero (2-col span) showing "Integration Health" — active clients / total, with success variant
- 3 standard `PremiumStatCard`: Active Clients, API Calls (24h), Errors (24h)

**Operational Focus**: Add a "Needs Attention" section using `ActionBanner` when errors > 0 or inactive clients exist. Show webhook renewals due, failed syncs, pending CRM connections.

**Metric Strip**: Add `MetricStrip` below hero cards showing: CRM breakdown counts, partner count, sync volume.

**Filter Bar**: Redesign using `surface-inset` container with:
- Search input with icon
- Partner dropdown (styled select)
- CRM type filter (new)
- Status filter (new: active/inactive/pending)
- Clear filters button

**Table**: Replace `DataTable` with `PremiumTable`. Redesign columns:
- Client: avatar circle + name + truncated ID
- Partner: partner name or "Direct" badge
- CRM: `StatusBadge` with CRM variant
- Health: `HealthIndicator` component
- Status: `StatusBadge` with dot
- Integrations: tooltip icon badges (existing pattern, refined)
- Last Activity: relative timestamp
- Actions: ghost icon buttons (open, edit, test, delete)

**Empty State**: Use `PremiumEmptyState` with Building2 icon, premium copy and CTA.

**Loading State**: Use `PremiumTable` built-in skeleton loading.

### 2. Sidebar Minor Refinement (`src/components/layout/AdminLayout.tsx`)

- Reorganize navigation groups to align with the prompt's suggested IA: rename/reorder groups to Overview, Operations, Integrations, Agent Tools, Configuration, Monitoring, Platform
- Move Legal Connect from Operations into its own "Integrations" group alongside Field Mappings and general Integrations
- Add `Command` (search/command palette placeholder) icon button in the header next to health indicator

### 3. Client Overview Page Enhancement (`src/pages/admin/ClientOverviewPage.tsx`)

- Replace inline header with `PageHeader` component
- Add `HealthIndicator` to header showing connection status
- Use `PremiumStatCard` instead of current stat cards with better variants

---

## Files

**Modified (3):**
1. `src/pages/admin/TenantsPage.tsx` — full redesign using premium components
2. `src/components/layout/AdminLayout.tsx` — navigation group refinement, command palette button
3. `src/pages/admin/ClientOverviewPage.tsx` — header and stat card upgrade

**No new files needed** — all premium components already exist.

## Execution Order
1. TenantsPage redesign (biggest impact)
2. AdminLayout sidebar group refinement
3. ClientOverviewPage header upgrade

