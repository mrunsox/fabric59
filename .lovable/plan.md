

# Phase 1B: Legal Connect UI Shell + Navigation + Hooks

## What This Session Delivers

A fully navigable Legal Connect module with 10 tabs, real data-backed Overview and Connections screens, route/nav integration, and CRUD hooks for all core tables.

## Files to Create

### 1. `src/hooks/useLegalConnect.ts`
CRUD hooks using React Query + Supabase client for:
- **Connections**: list, create, update, delete `legal_connect_connections`
- **Provider capabilities**: list `legal_connect_provider_capabilities`
- **Client capabilities**: list, upsert `legal_connect_client_capabilities`
- **Campaigns**: list, create, update, delete `legal_connect_campaigns`
- **Disposition mappings**: list, create, update, delete `legal_connect_disposition_mappings`
- **Call variable mappings**: list, create, update, delete
- **Policy profiles**: list, create, update, delete
- **Contacts/Matters**: list (read-only for now)
- **Event log**: list with filters
- **Sync jobs**: list with filters
- **Conflicts**: list with filters
- **Review queue**: list, update status
- **AI sessions/checklists**: list, create

All queries scoped by `organization_id` from auth context, following existing `useTenants.ts` patterns.

### 2. `src/pages/admin/LegalConnectPage.tsx`
Main page component with 10 tabs using existing `Tabs` component:

**Overview tab** (real data):
- Stat cards: connected providers count, active campaigns, pending reviews, failed sync jobs, sync success rate, webhook health, processed events (24h)
- Recent conflicts list
- Provider capability summary

**Connections tab** (real data):
- List of connections from `legal_connect_connections`
- Per-connection card showing: provider, status badge, token health, last sync, action buttons (placeholder for Connect/Refresh/Test/Disconnect)
- Provider capability summary per connection
- Separate sections for Five9, Clio, MyCase

**Campaigns tab**: table of `legal_connect_campaigns` with add/edit capability, campaign type badges

**Policies tab**: placeholder with "Coming in Phase 1E" message + policy profiles list

**Mappings tab**: placeholder with sub-tab structure (Dispositions, Call Variables, CRM Fields, Status Mappings)

**Sync Activity tab**: table of `legal_connect_sync_jobs` with status filters

**Review Queue tab**: table of `legal_connect_review_queue` with status badges and action buttons

**AI Setup tab**: placeholder with tool selector UI skeleton

**Testing tab**: placeholder

**Logs tab**: table of `legal_connect_event_log` with filters (client, provider, status, date range, call ID, correlation ID)

### 3. Route + Navigation Updates

**`src/App.tsx`**: Add route `<Route path="legal-connect" element={<LegalConnectPage />} />`

**`src/components/layout/AdminLayout.tsx`**: Add "Legal Connect" nav item under Operations group with `Scale` (or `Briefcase`) icon from lucide-react

## Design Approach

- Follow existing AdminLayout patterns (dark theme, status badges, stat cards)
- Use existing UI components: `Tabs`, `Card`, `StatCard`, `StatusBadge`, `Button`, `Table`
- All data fetched via Supabase client with org scoping
- Empty states with clear messaging per tab
- Loading skeletons for data-backed sections

## Technical Notes

- Hooks use `useAuth()` for `organization?.id` scoping
- React Query keys namespaced as `['legal-connect', 'connections']`, etc.
- No edge functions needed this session — all reads go through Supabase client with RLS
- Types inferred from Supabase generated types where possible, with local interfaces for complex shapes

