
# Fix: Uneditable Fields + Ghost Button Contrast

## Issue 1 — Domain Settings fields are disabled for master admin users

### Root Cause

In `DomainDetailPage.tsx` line 59:
```typescript
const canManage = orgRole === "owner" || orgRole === "admin";
```

Master admin users have no `organization_members` row, so `orgRole` is always `null` for them. This makes `canManage = false` — every field and button in the entire detail page is disabled.

The same page's list view (`DomainsPage.tsx` line 76) already handles this correctly:
```typescript
const canManage = isAuthLoading ? false : (orgRole === "owner" || orgRole === "admin" || isMasterAdmin);
```

`DomainDetailPage.tsx` simply forgot to include `isMasterAdmin`.

### Fix

Update `DomainDetailPage.tsx` line 39 to also pull `isMasterAdmin` and `isLoading` from `useAuth()`, then update the `canManage` expression to match `DomainsPage.tsx`.

```typescript
// Before
const { orgRole } = useAuth();
const canManage = orgRole === "owner" || orgRole === "admin";

// After
const { orgRole, isMasterAdmin, isLoading: isAuthLoading } = useAuth();
const canManage = isAuthLoading ? false : (orgRole === "owner" || orgRole === "admin" || isMasterAdmin);
```

### The "gate before editing" requirement

Per the request: once the API connection is established (`api_connection_status === "connected"`), there should be a confirmation step before allowing edits to credentials. We'll add a small "unlock" state for the API Credentials tab — when `connected`, show a locked state with an "Edit Credentials" button that toggles editable mode on. General settings (display name, status, workflow, branding) remain freely editable at all times.

---

## Issue 2 — Settings icon invisible until hover (contrast bug)

### Root Cause

Ghost buttons (`variant="ghost"`) have no default foreground color. The button component defines:
```
ghost: "hover:bg-accent hover:text-accent-foreground"
```

With no default text color, the icon inherits the transparent background color — invisible on the dark card surface until hover applies `text-accent-foreground`. This is the exact behavior shown in the screenshot.

### Fix

Add `text-muted-foreground` to ghost icon buttons in all table action columns so they're always visible, then brighten to `text-foreground` on hover:

```tsx
// Before
<Button variant="ghost" size="icon" asChild>
  <Link to={`/admin/domains/${domain.id}`}>
    <Settings className="h-4 w-4" />
  </Link>
</Button>

// After
<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" asChild>
  <Link to={`/admin/domains/${domain.id}`}>
    <Settings className="h-4 w-4" />
  </Link>
</Button>
```

### Breadth of the fix — all affected files

The same pattern (ghost icon button with no default color in action columns) exists in:

| File | Location |
|---|---|
| `src/pages/admin/DomainsPage.tsx` | Settings + Trash icon buttons in table rows |
| `src/pages/admin/TenantsPage.tsx` | Action buttons in table rows |
| `src/pages/admin/AgentsPage.tsx` | Action buttons in table rows |
| `src/pages/admin/ApiLogsPage.tsx` | Copy/expand icon buttons |
| `src/pages/admin/NotificationsPage.tsx` | Icon buttons |
| `src/components/agents/offboarding/AgentSearchList.tsx` | Row action buttons |
| `src/components/agents/onboarding/WorkflowPanel.tsx` | Step action buttons |

Each will get `text-muted-foreground hover:text-foreground` on all ghost icon buttons that render icons without explicit color classes.

---

## Files to Modify

| File | Change |
|---|---|
| `src/pages/admin/DomainDetailPage.tsx` | Fix `canManage` to include `isMasterAdmin`; add credential lock/unlock gate when connected |
| `src/pages/admin/DomainsPage.tsx` | Add `text-muted-foreground hover:text-foreground` to ghost icon buttons |
| `src/pages/admin/TenantsPage.tsx` | Same ghost button fix |
| `src/pages/admin/AgentsPage.tsx` | Same ghost button fix |
| `src/pages/admin/ApiLogsPage.tsx` | Same ghost button fix |
| `src/pages/admin/NotificationsPage.tsx` | Same ghost button fix |
| `src/components/agents/offboarding/AgentSearchList.tsx` | Same ghost button fix |

No database changes. No new secrets. No migrations.
