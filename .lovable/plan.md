

# Org → Partners → Clients Hierarchy

## Current State

- `organizations` table exists with branding fields; scoped via `organization_id` FK on `five9_domains`, `tenants`, etc.
- `tenants` table serves as "Clients" in the UI today, with `organization_id` and `five9_domain_id` FKs
- No `partners` table exists
- Current flow: Org → Clients (tenants). No intermediate partner layer.
- `ClientOverviewPage` at `/admin/clients/:id` reads from `tenants` table
- `TenantsPage` is the Clients list at `/admin`
- Five9 domains already scoped to org level — correct

## What Changes

### 1. Database: New `partners` table

```sql
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  integration_configs jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
```

RLS policies matching existing org-scoped pattern (master_admin ALL, platform admin ALL, org owner/admin ALL, org members SELECT).

Add `partner_id uuid REFERENCES public.partners(id)` column to `tenants` table (nullable initially for migration).

Add trigger for `updated_at` on partners.

### 2. Database: Add `integration_configs` to `organizations`

```sql
ALTER TABLE public.organizations ADD COLUMN integration_configs jsonb DEFAULT '{}'::jsonb;
```

This enables org-level default configs that cascade down.

### 3. Types

Update `src/types/database.ts`:
- Add `Partner` interface with `id`, `organization_id`, `name`, `slug`, `status`, `integration_configs`, timestamps
- Add `partner_id` to `Tenant` interface
- Add `integration_configs` to `Organization` interface

### 4. New hooks

**`src/hooks/usePartners.ts`** — CRUD for partners table scoped to current org. Mirrors `useTenants` pattern:
- `usePartners()` — list all partners for current org
- `usePartner(id)` — single partner
- `useCreatePartner()`, `useUpdatePartner()`, `useDeletePartner()`

### 5. New pages

**`src/pages/admin/PartnersPage.tsx`** — List of partners under the org
- Stats cards: total partners, total clients across partners
- Table: Partner name, slug, status, client count, actions
- "Add Partner" button with dialog form
- Row click → Partner Overview

**`src/pages/admin/PartnerOverviewPage.tsx`** — Single partner detail
- Header: partner name, status, slug
- Partner-level default integration configs (same CRM wizard cards)
- Clients table filtered to this partner
- "Add Client" button

### 6. Update existing pages

**`TenantsPage.tsx` (Clients list)**:
- Add "Partner" column showing which partner each client belongs to
- Add partner filter dropdown
- When creating a new client, require selecting a partner

**`ClientOverviewPage.tsx`**:
- Show "Partner: {name}" badge in header
- Config merging display: show inherited vs overridden settings

**`AdminLayout.tsx`**:
- Add "Partners" nav item under Operations group (between "Clients" and "Domains")

**`App.tsx`**:
- Add routes: `/admin/partners` and `/admin/partners/:id`

### 7. Config merging utility

Create `src/lib/config-merge.ts`:
```ts
export function mergeIntegrationConfigs(
  org: IntegrationConfigs,
  partner: IntegrationConfigs,
  client: IntegrationConfigs
): IntegrationConfigs
```
Deep merge with client > partner > org precedence. Used in UI to show "effective config" and in edge functions for runtime resolution.

### 8. Seed "Direct" partner

Migration includes inserting a default partner for each existing org:
```sql
INSERT INTO public.partners (organization_id, name, slug, status)
SELECT id, name || ' (Direct)', 'direct', 'active' FROM public.organizations;
```

Then update existing tenants to point to their org's direct partner.

## File Changes

| File | Change |
|---|---|
| Migration SQL | Create `partners` table, add `partner_id` to `tenants`, add `integration_configs` to `organizations`, seed direct partners |
| `src/types/database.ts` | Add `Partner` type, update `Tenant` and `Organization` |
| `src/hooks/usePartners.ts` | New — CRUD hook for partners |
| `src/lib/config-merge.ts` | New — deep merge utility |
| `src/pages/admin/PartnersPage.tsx` | New — partners list page |
| `src/pages/admin/PartnerOverviewPage.tsx` | New — partner detail page |
| `src/pages/admin/TenantsPage.tsx` | Add partner column + filter |
| `src/pages/admin/ClientOverviewPage.tsx` | Show partner badge, effective config |
| `src/components/layout/AdminLayout.tsx` | Add Partners nav item |
| `src/App.tsx` | Add partner routes |
| `src/components/tenants/TenantForm.tsx` | Add partner_id selector |

