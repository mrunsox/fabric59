
# SaaS Architecture Transformation Plan

## Current vs. Target Architecture

### What We Have Now
A flat structure where ops team manages tenants directly:
```text
Admin Dashboard
     └── Tenants (end-clients like law firms)
           └── CRM configs, notifications, mappings
```

### What We Need for SaaS
A multi-level hierarchy where agencies sign up and manage their own Five9 domains and clients:

```text
SaaS Platform
  └── Agency Account (your paying customer)
        └── Five9 Domain 1 (agency's Five9 account)
        │     ├── Workflow Settings (scripts, branding, etc.)
        │     ├── Tenant A (Law Firm Alpha)
        │     ├── Tenant B (Law Firm Beta)
        │     └── Tenant C (Medical Practice)
        │
        └── Five9 Domain 2 (another Five9 account they manage)
              ├── Workflow Settings
              └── Tenant D (Plumber Inc)
```

---

## New Entity Hierarchy

| Entity | Description | Example |
|--------|-------------|---------|
| **Organization** | The paying SaaS customer (call center agency) | "ABC Answering Services" |
| **Five9 Domain** | A Five9 account connected to an organization | "abc-main.five9.com" |
| **Tenant** | An end-client that receives calls via a domain | "Law Firm Alpha" |

---

## Database Changes

### New Tables

**1. `organizations`** - SaaS customer accounts
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| name | text | Organization display name |
| billing_email | text | For subscription management |
| plan | text | 'free', 'starter', 'pro', 'enterprise' |
| status | text | 'active', 'suspended', 'cancelled' |
| created_at | timestamptz | When they signed up |

**2. `organization_members`** - Users belonging to an organization
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| organization_id | uuid | FK to organizations |
| user_id | uuid | FK to auth.users |
| role | text | 'owner', 'admin', 'member' |
| created_at | timestamptz | When added |

**3. `five9_domains`** - Connected Five9 accounts
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| organization_id | uuid | FK to organizations |
| domain | text | Five9 domain (e.g., "abc.five9.com") |
| display_name | text | Friendly name for the domain |
| api_key_hash | text | Encrypted Five9 API credentials |
| workflow_settings | jsonb | Scripts, branding, custom fields |
| status | text | 'active', 'inactive', 'pending_verification' |
| created_at | timestamptz | When connected |

### Modified Tables

**Update `tenants`** - Add Five9 domain relationship
| Column | Change |
|--------|--------|
| five9_domain_id | NEW: FK to five9_domains (replaces flat structure) |
| organization_id | NEW: FK to organizations (denormalized for RLS efficiency) |

**Update `user_roles`** - Expand for SaaS roles
- Keep existing `app_role` enum for platform admin
- Add organization-scoped roles via `organization_members`

---

## RLS Security Model

### Platform Admin Access
- Platform admins (your ops team) can see everything across all organizations
- Uses existing `has_role()` function with `admin` / `ops_team` roles

### Organization Member Access  
- Organization members can only see their own organization's data
- New helper function: `is_org_member(_user_id, _org_id) → boolean`

### Example Policy for `tenants`
```sql
-- Org members can view their own tenants
CREATE POLICY "Org members can view own tenants"
ON tenants FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);
```

---

## UI Changes

### New Pages

**1. Onboarding Flow** (`/onboarding`)
- Create organization
- Connect first Five9 domain
- Add first tenant

**2. Organization Settings** (`/settings/organization`)
- Organization profile
- Billing (future: Stripe integration)
- Team member management

**3. Five9 Domains Page** (`/domains`)
- List all connected Five9 domains
- Add/edit domain connections
- Configure per-domain workflow settings

**4. Domain Detail Page** (`/domains/:id`)
- Workflow configuration (scripts, branding)
- List of tenants under this domain
- Domain-specific API logs

### Modified Pages

**Tenants Page** (`/admin`)
- Add "Domain" column showing which Five9 domain each tenant belongs to
- Add domain filter dropdown
- "Add Tenant" now requires selecting a Five9 domain first

**Navigation**
- New top-level "Domains" nav item
- Update breadcrumbs to show domain context

---

## Authentication Flow

### Sign Up
1. User signs up (email/password)
2. Redirect to onboarding
3. Create organization
4. Connect first Five9 domain
5. Add first tenant
6. Land on dashboard

### Login
1. User logs in
2. Load their organization(s) from `organization_members`
3. If they belong to multiple orgs, show org switcher
4. Redirect to dashboard with org context

---

## API Changes

### Header Updates
Incoming Five9 calls will now use:
- `X-Five9-Domain: abc.five9.com` (identifies the Five9 domain)
- `X-Tenant-Id: uuid` (identifies the specific client)

Edge functions will:
1. Look up domain → find organization
2. Validate tenant belongs to that domain
3. Process the request

### New Edge Functions
- `POST /domains/verify` - Verify Five9 domain connection
- `GET /domains/:id/workflow` - Fetch workflow settings for agent desktop

---

## Build Order

### Phase A: Foundation (Database + Auth)
1. Database migration: Create `organizations`, `organization_members`, `five9_domains`
2. Update `tenants` with `five9_domain_id` and `organization_id`
3. Add new RLS policies with organization scoping
4. Create `is_org_member()` helper function

### Phase B: Authentication
5. Sign up page with organization creation
6. Login page
7. Auth context provider
8. Protected route wrapper
9. Onboarding flow

### Phase C: Domain Management
10. Five9 Domains page (list/add/edit)
11. Domain detail page with workflow settings
12. Update navigation

### Phase D: Tenant Updates
13. Update Tenant form to require domain selection
14. Update Tenants page with domain filtering
15. Update edge functions to validate domain context

### Phase E: Polish
16. Organization settings page
17. Team member management
18. Org switcher (for users in multiple orgs)

---

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Migrate | Database | New tables + RLS |
| Create | `src/types/database.ts` | Add Organization, Domain types |
| Create | `src/contexts/AuthContext.tsx` | Auth + org context |
| Create | `src/pages/auth/LoginPage.tsx` | Login form |
| Create | `src/pages/auth/SignupPage.tsx` | Sign up + create org |
| Create | `src/pages/onboarding/OnboardingPage.tsx` | First-time setup |
| Create | `src/pages/admin/DomainsPage.tsx` | List Five9 domains |
| Create | `src/pages/admin/DomainDetailPage.tsx` | Domain settings |
| Create | `src/hooks/useOrganization.ts` | Org context hook |
| Create | `src/hooks/useDomains.ts` | Five9 domains CRUD |
| Create | `src/components/domains/DomainForm.tsx` | Add/edit domain |
| Modify | `src/components/tenants/TenantForm.tsx` | Add domain selector |
| Modify | `src/pages/admin/TenantsPage.tsx` | Add domain column/filter |
| Modify | `src/components/layout/AdminLayout.tsx` | Add domains nav |
| Modify | `src/App.tsx` | Add routes + auth wrapper |
| Modify | `supabase/functions/intakes/index.ts` | Validate domain context |

---

## Security Considerations

1. **Organization isolation**: All queries automatically scoped to user's org via RLS
2. **Role hierarchy**: Platform admin → Org owner → Org admin → Org member
3. **API key per domain**: Each Five9 domain connection has its own encrypted API key
4. **Audit logging**: Track who made changes within each organization
