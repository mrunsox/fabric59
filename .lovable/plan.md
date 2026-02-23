

# White-Label Partner Branding for Campaign Setup

## Overview

When the **White-Label Partner** toggle is turned on, the campaign form will show a partner selector dropdown, a branding preview card, and store the selected partner's organization_id. All outgoing disposition emails will use the partner's branding (logo, colors, from/reply-to addresses) pulled from the organizations table. A new **email template depository** (storage bucket + database table) allows uploading HTML email templates per partner for disposition emails.

---

## What Changes

### 1. New Database Table: `email_templates`

Stores HTML disposition email templates per organization (white-label partner).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK to organizations |
| name | text | e.g. "Default Disposition Email" |
| html_content | text | Full HTML template with placeholders |
| is_default | boolean | Default template for this org |
| created_by | uuid | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: Org members can view, org admins can manage, master/platform admins full access.

### 2. Type Changes (`src/types/campaign.ts`)

Add to `CampaignIntakeData`:
```
whiteLabelOrgId?: string;        // selected partner org ID
whiteLabelEmailTemplateId?: string; // selected HTML template from depository
```

### 3. UI Changes (`CampaignIntakePage.tsx` -- Section 1)

When White-Label toggle is ON:
- Show a **Partner dropdown** (fetches from `organizations` table)
- Once selected, show a read-only **Branding Preview Card** displaying:
  - Brand Name
  - Logo (thumbnail)
  - Primary Color (color swatch)
  - From Email
  - Reply-To Email
- Show an **Email Template selector** dropdown (fetches from `email_templates` where `organization_id` matches selected partner)
- Store `whiteLabelOrgId` and `whiteLabelEmailTemplateId` in intake data

### 4. New Component: `WhiteLabelPartnerSelector.tsx`

Located at `src/components/campaigns/WhiteLabelPartnerSelector.tsx`. Contains:
- Organization/partner select dropdown
- Branding preview card (read-only)
- Email template selector

### 5. Email Template Management Page

Add a simple template management UI accessible from Settings or a new route. Users can:
- Upload/paste HTML templates per organization
- Mark one as default
- Preview the template

This could be a sub-section on the Settings page or a dedicated route like `/admin/settings/email-templates`.

### 6. Provisioning & Email Flow Impact

- When `whiteLabelOrgId` is set, the disposition email sending logic (in edge functions or future email dispatch) will:
  - Use the partner's `brand_from_email` as the From address
  - Use the partner's `brand_reply_to` as the Reply-To address
  - Fetch the selected HTML template from `email_templates` and inject disposition data
  - Apply partner's `brand_logo_url` and `brand_primary_color` into the template
- The `DispositionEmailConfig.emailFrom` and `emailReplyTo` fields per-disposition will **default** to the partner's branding but can be overridden per disposition

### 7. Hooks

- `useOrganizations()` -- fetch all organizations for the partner dropdown (already may exist partially)
- `useEmailTemplates(orgId)` -- fetch templates for a given org
- `useSaveEmailTemplate()` -- create/update templates

---

## Technical Details

### Database Migration SQL

```sql
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  html_content text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Org members can view email templates"
  ON public.email_templates FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Org admins can manage email templates"
  ON public.email_templates FOR ALL
  USING (is_org_owner_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Platform admins can manage all email templates"
  ON public.email_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master admin can manage all email templates"
  ON public.email_templates FOR ALL
  USING (is_master_admin(auth.uid()))
  WITH CHECK (is_master_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/types/campaign.ts` | Add `whiteLabelOrgId`, `whiteLabelEmailTemplateId` to `CampaignIntakeData` |
| `src/components/campaigns/WhiteLabelPartnerSelector.tsx` | **New** -- partner dropdown + branding preview + template selector |
| `src/hooks/useEmailTemplates.ts` | **New** -- CRUD hooks for email_templates table |
| `src/pages/admin/CampaignIntakePage.tsx` | Import and render `WhiteLabelPartnerSelector` when whiteLabel is toggled on |
| `src/pages/admin/CampaignIntakePage.tsx` (emptyIntake) | Add default values for new fields |
| `src/pages/admin/SettingsPage.tsx` | Add "Email Templates" tab/section for template management |

### Implementation Order

1. Database migration (create `email_templates` table)
2. Types update (`campaign.ts`)
3. `useEmailTemplates` hook
4. `WhiteLabelPartnerSelector` component
5. Integrate into `CampaignIntakePage.tsx` Section 1
6. Email template management UI in Settings
7. Update `emptyIntake` defaults

