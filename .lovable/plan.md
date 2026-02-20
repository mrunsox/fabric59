
# Add Five9 Admin Credentials to Onboarding Domain Step

## What the User Wants

The "Connect your Five9 Domain" step in the onboarding flow (currently at `/onboarding`) needs two additional fields:
- **Five9 Admin Username** (label: "Five9 Admin Username")
- **Admin Password** (label: "Admin Password", with show/hide toggle)

These credentials should be saved directly to the `five9_domains` table when the domain is created, so the system is ready for API calls immediately without needing to go to the Domain Detail page afterward.

## Current State

The `handleCreateDomain` function in `OnboardingPage.tsx` only inserts:
```typescript
{ organization_id: orgId, domain, display_name: domainDisplayName }
```

The `five9_domains` table already has `five9_username` and `five9_password_encrypted` columns — they just aren't used in the onboarding form.

## What Changes

### `src/pages/onboarding/OnboardingPage.tsx`

**State additions** (alongside existing `domain` and `domainDisplayName` state):
```typescript
const [five9Username, setFive9Username] = useState("");
const [five9Password, setFive9Password] = useState("");
const [showPassword, setShowPassword] = useState(false);
```

**Domain insert update** — include credentials in the insert:
```typescript
const { data, error } = await supabase
  .from("five9_domains")
  .insert({
    organization_id: orgId,
    domain,
    display_name: domainDisplayName,
    five9_username: five9Username || null,
    five9_password_encrypted: five9Password || null,
  })
  .select()
  .single();
```

**Form fields added** to the domain step card, between "Display Name" and the "Connect Domain" button:
- A `<Separator />` or visual divider with label "API Credentials (optional)"
- `Five9 Admin Username` — text input with placeholder `admin@yourcompany.com`
- `Admin Password` — password input with show/hide eye toggle (same pattern as `DomainDetailPage.tsx`)
- Helper text: "Used to sync agent skills, call variables, and dispositions from your Five9 domain"

The fields are marked as **optional** so users can proceed without them and add credentials later from the Domain Detail settings page.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/onboarding/OnboardingPage.tsx` | Add username/password state, show/hide toggle, two new form fields in the domain step, and include credentials in the insert |

No database migration needed — `five9_username` and `five9_password_encrypted` columns already exist on the `five9_domains` table.

## Visual Layout of Updated Domain Step

```text
┌─────────────────────────────────────────┐
│  🌐  Connect your Five9 Domain          │
│  Enter your Five9 domain to start...    │
│                                         │
│  Five9 Domain                           │
│  [yourcompany.five9.com              ]  │
│                                         │
│  Display Name                           │
│  [Main Call Center                   ]  │
│  A friendly name to identify this domain│
│                                         │
│  ── API Credentials (optional) ─────── │
│                                         │
│  Five9 Admin Username                   │
│  [admin@yourcompany.com              ]  │
│                                         │
│  Admin Password                         │
│  [••••••••••••••••••••••••         👁] │
│  Used to sync skills and call variables │
│                                         │
│  [→  Connect Domain                  ]  │
└─────────────────────────────────────────┘
```
