
# White-Label Branding + Data Model Clarification

## Summary of What You Told Me

- **24H Virtual** is the only agency operating the platform (single operator, not a SaaS yet)
- They have **white-label partners** — businesses that resell 24H Virtual's services under their own brand
- Each white-label partner has their own **clients** (the end-businesses being served)
- Any email, notification, or outbound communication to a partner's client must carry **the partner's brand** — not 24H Virtual's name, logo, or colors
- Future: multi-agency SaaS with multi-domain, multi-admin, and full white-label — but the architecture must be designed now to support that transition cleanly

---

## Current Terminology Map (Clarified)

```text
24H Virtual (the operator — single, today)
  └─ White-Label Partners  ← currently called "Organizations" in the DB
       └─ Clients           ← currently called "Tenants" in the DB
            └─ Agents       ← individual call center reps
```

The existing three-tier structure is **exactly right** — just the names and branding need to catch up. No structural database redesign is needed now.

---

## What Needs to Change

### 1. Add Branding Fields to the `organizations` Table (White-Label Partners)

The `organizations` table currently only has `name`, `billing_email`, `plan`, and `status`. To support white-label branding, each partner needs:

| New Column | Type | Purpose |
|---|---|---|
| `brand_name` | text | Display name on emails (e.g. "Acme Services") |
| `brand_logo_url` | text | Logo URL for email headers |
| `brand_primary_color` | text | Hex color for email button/accent |
| `brand_from_email` | text | Override "from" address (e.g. noreply@acme.com) |
| `brand_reply_to` | text | Reply-to address for outbound emails |

This is a database migration — 5 nullable columns added to `organizations`.

### 2. Rename "Tenants" → "Clients" in the UI

The word "Tenant" is a developer SaaS term that doesn't mean anything to 24H Virtual staff. Every label on the Clients/Tenants page, forms, dialogs, and stat cards will be updated to say "Client" instead. The database table stays named `tenants` — only the displayed labels change.

### 3. Link Clients to White-Label Partners on Creation

The `TenantForm` (`TenantForm.tsx`) currently has no way to associate a client with a white-label partner (organization). When creating or editing a client, there needs to be a dropdown that says "Which partner does this client belong to?" — populated from the `organizations` table. This linkage already exists as `organization_id` on the `tenants` table — it just isn't exposed in the form.

### 4. White-Label Branded Credential Emails

The `send-credentials` edge function currently sends emails with hardcoded styling — no partner name, no logo, no custom color. It needs to:

1. Accept an optional `organizationId` in the request body
2. Look up that organization's branding fields (`brand_name`, `brand_logo_url`, `brand_primary_color`, `brand_from_email`, `brand_reply_to`) from the database
3. Use the partner's `brand_from_email` as the "from" address (falling back to the default Resend from address)
4. Render the email with the partner's `brand_name` in the header instead of a generic greeting
5. Use the partner's `brand_primary_color` for button/accent colors
6. Show the partner's logo in the email header if `brand_logo_url` is set

The provisioning hook (`useProvisioning.ts`) will pass the `organizationId` when invoking `send-credentials`.

### 5. Add "White-Label Partners" Section to Settings / Organizations Management

Currently the Organizations page (under Master admin) exists but doesn't expose branding fields. A new branding sub-section needs to be added to the organization edit form with fields for: brand name, logo URL, primary color, from email, and reply-to. This is where 24H Virtual admins configure each partner's white-label identity.

---

## Files to Create / Modify

| File | Action | Change |
|---|---|---|
| DB Migration | Create | Add 5 branding columns to `organizations` table |
| `src/pages/admin/TenantsPage.tsx` | Modify | Rename all "Tenant" labels to "Client" throughout |
| `src/components/tenants/TenantForm.tsx` | Modify | Add partner (organization) dropdown; rename labels |
| `supabase/functions/send-credentials/index.ts` | Modify | Accept `organizationId`, fetch branding, render white-labeled email |
| `src/hooks/useProvisioning.ts` | Modify | Pass `organizationId` to `send-credentials` invoke |
| `src/pages/master/OrganizationsOverviewPage.tsx` | Modify | Add branding fields section to org edit UI |
| `src/types/database.ts` | Modify | Add branding fields to `Organization` interface |

---

## Future SaaS Migration Notes (No Work Now)

When you're ready to go multi-agency SaaS, the architecture already supports it because:
- `organizations` table = agency accounts (just need auth + billing)
- `tenants.organization_id` = already links clients to partners
- RLS policies = already isolate by organization
- Branding fields added now = each org already has their own brand identity

The only things needed later are: per-org login domains, per-org admin user management, and Stripe billing — none of which require changing the data model.

---

## Sequence of Changes

1. Run DB migration (add branding columns to organizations)
2. Update Organization type in TypeScript
3. Add branding fields to the Organizations management page (where admins set up partners)
4. Update TenantForm to show partner dropdown + rename "Tenant" → "Client"
5. Update TenantsPage labels
6. Update send-credentials edge function to fetch and apply partner branding
7. Update useProvisioning to pass organizationId when sending credentials

---

## Data Cleanup (From Previous Discussion)

The SQL to delete test data was identified in the previous session. Once this plan is approved and implemented, you'll have a clean slate: 1 real organization (24H Virtual), 1 real Five9 domain, and 0 clients — ready to add your actual white-label partners and their real clients.
