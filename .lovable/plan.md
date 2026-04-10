

# Build, Finish & Test — Legal Connect

Complete the Legal Connect module by building the missing Mappings editors, upgrading the page to premium design, and wiring all CRUD operations end-to-end.

---

## Current State

**Working:** Overview, Connections, Campaigns, Policies, Sync Activity, Review Queue, Reliability, AI Setup, Testing, Logs tabs — all render with real data hooks. Client setup wizard works. Agent context panel exists.

**Incomplete:**
1. **Mappings tab** — all 4 sub-tabs (Dispositions, Call Variables, CRM Fields, Status Mappings) show "coming in Phase 1E" placeholder
2. **Missing CRUD hooks** — no create/update/delete for call variable mappings or field policies
3. **Premium design** — page still uses old `StatCard` and plain tables, not the premium components
4. **Review Queue actions** — Approve/Reject buttons are wired but missing mutation calls with proper payload
5. **Campaign CRUD UI** — "Add Campaign" button exists but no form/dialog
6. **Policy CRUD UI** — "New Profile" button exists but no form/dialog

---

## Plan

### 1. Add missing CRUD hooks (`src/hooks/useLegalConnect.ts`)
- `useCreateLegalCallVariableMapping`, `useUpdateLegalCallVariableMapping`, `useDeleteLegalCallVariableMapping`
- `useCreateLegalFieldPolicy`, `useUpdateLegalFieldPolicy`, `useDeleteLegalFieldPolicy`
- `useUpdateLegalDispositionMapping`, `useDeleteLegalDispositionMapping`
- `useUpdateLegalPolicyProfile`, `useDeleteLegalPolicyProfile`

### 2. Build Disposition Mapping Editor (`src/components/legal-connect/DispositionMappingEditor.tsx`)
- Table showing disposition_code, label, action flags (create_contact, create_matter, etc.), priority
- Add row dialog with full field set
- Inline toggle for boolean flags
- Delete with confirmation
- Filtered by selected campaign

### 3. Build Call Variable Mapping Editor (`src/components/legal-connect/CallVariableMappingEditor.tsx`)
- Table: variable_name, source_location, pass_through_mode, target_entity, provider_field_path, sensitive flag
- Add/edit dialog
- Delete
- Campaign filter

### 4. Build Field Policy Editor (`src/components/legal-connect/FieldPolicyEditor.tsx`)
- Table: entity_name, direction, mode (allow/block/review/redact/hash), sensitivity_level, provider
- Add/edit dialog with mode selector
- Delete

### 5. Build Campaign Form Dialog (`src/components/legal-connect/CampaignFormDialog.tsx`)
- Dialog for add/edit campaign: five9_campaign_name, campaign_type, dnis, provider_connection_id
- Used by Campaigns tab "Add Campaign" button

### 6. Build Policy Profile Form Dialog (`src/components/legal-connect/PolicyProfileFormDialog.tsx`)
- Dialog for add/edit policy profile: name, is_default, allow_contact_create, allow_matter_create, ambiguous_match_mode, duplicate_prevention_mode
- Used by Policies tab "New Profile" button

### 7. Wire Review Queue actions
- Approve button calls `useUpdateReviewItem` with `{ status: "approved", reviewed_by: userId, reviewed_at: now }`
- Reject button calls same with `{ status: "rejected" }`

### 8. Upgrade to premium design (`src/pages/admin/LegalConnectPage.tsx`)
- Replace header with `PageHeader` component
- Replace `StatCard` with `PremiumStatCard` (hero for sync health)
- Replace inline tables with `PremiumTable` or at minimum better styling
- Replace Mappings placeholder with the 4 new editor components

### 9. Wire Mappings tab
- Replace the 4 "coming in Phase 1E" placeholders with the new editor components
- Each sub-tab renders its editor, filtered by `clientId`

---

## Files

**New (5):**
1. `src/components/legal-connect/DispositionMappingEditor.tsx`
2. `src/components/legal-connect/CallVariableMappingEditor.tsx`
3. `src/components/legal-connect/FieldPolicyEditor.tsx`
4. `src/components/legal-connect/CampaignFormDialog.tsx`
5. `src/components/legal-connect/PolicyProfileFormDialog.tsx`

**Modified (2):**
1. `src/hooks/useLegalConnect.ts` — add missing CRUD hooks
2. `src/pages/admin/LegalConnectPage.tsx` — premium upgrade, wire new editors, wire review actions, wire campaign/policy dialogs

**Execution order:**
1. CRUD hooks
2. Form dialogs (Campaign, Policy Profile)
3. Mapping editors (Dispositions, Call Variables, Field Policies)
4. Wire everything into LegalConnectPage + premium upgrade

