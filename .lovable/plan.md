
# Four Features: Login Improvements, Dev Mode, and Build Outline Page

## Overview

This plan covers four distinct features:
1. Back button on the login page (to a home/landing page)
2. Forgot password flow on the login page
3. Dev Mode button in the header that bypasses auth
4. /outline page with a living build map

---

## Feature 1: Back Button on Login Page

### Current State
The `LoginPage.tsx` has no back navigation — users are stuck with only a "Sign up" link.

### Implementation
Add a back button at the top of the card that navigates to `/` (which currently redirects to `/admin`). Since there is no public landing/home page, we will create a minimal public `/home` route as the back destination, OR simply use `navigate(-1)` to go back in history, which is the simplest and most flexible approach.

We'll add a ghost button with an `ArrowLeft` icon above the card header.

**File: `src/pages/auth/LoginPage.tsx`**
- Import `useNavigate` from `react-router-dom`
- Add an arrow-left button above the card using `navigate(-1)` or linking to a `/` public landing

---

## Feature 2: Forgot Password Flow

### How It Works
The password reset flow requires two steps:
1. **Request reset**: User enters email → system sends reset email
2. **Set new password**: User clicks link in email → lands on `/reset-password` page → enters new password

### New Files
- `src/pages/auth/ForgotPasswordPage.tsx` — form to request reset email
- `src/pages/auth/ResetPasswordPage.tsx` — form to set new password (handles `type=recovery` in URL hash)

### Changes to Existing Files
**`src/pages/auth/LoginPage.tsx`**
- Add "Forgot your password?" link below the password field that navigates to `/forgot-password`

**`src/App.tsx`**
- Add two new public routes:
  - `/forgot-password` → `ForgotPasswordPage`
  - `/reset-password` → `ResetPasswordPage`

### Key Logic

```typescript
// ForgotPasswordPage.tsx
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`
});

// ResetPasswordPage.tsx — must detect recovery session
useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      // show the new password form
    }
  });
}, []);

const { error } = await supabase.auth.updateUser({ password: newPassword });
```

---

## Feature 3: Dev Mode Button

### What It Does
A **DEV MODE** toggle button visible only in development (`import.meta.env.DEV`) that bypasses the auth check entirely. When active, the app skips the `ProtectedRoute` redirect and treats the user as authenticated with full dashboard access, without actually signing in.

### Implementation Strategy
- Add a `devMode` boolean state to `AuthContext` (only settable in dev)
- When `devMode` is true, `isAuthenticated` returns `true` and a mock organization/user is provided
- A floating button (or header button) toggles dev mode on/off
- A dismissible banner shows when dev mode is active

**Files to modify:**
- `src/contexts/AuthContext.tsx` — add `devMode` state and `toggleDevMode` function; when devMode is active, override `isAuthenticated`, provide mock `user`, `organization`, `membership`
- `src/components/layout/AdminLayout.tsx` — add dev mode indicator badge in header (only when `import.meta.env.DEV`)
- `src/components/auth/ProtectedRoute.tsx` — check `devMode` flag to bypass redirect

### Dev Mode Mock Data
```typescript
const DEV_USER = { id: "dev-user", email: "dev@fabric59.com" };
const DEV_ORG = { id: "dev-org", name: "Dev Organization", plan: "pro", status: "active" };
```

### UI
In the AdminLayout top bar header, add a yellow "DEV MODE" badge button that is only rendered when `import.meta.env.DEV === true`. Clicking it shows a confirmation or toggles off dev mode.

---

## Feature 4: /outline Build Map Page

### Architecture

```text
src/data/buildMap.ts        ← single source of truth (array of categories + items)
src/pages/OutlinePage.tsx   ← reads buildMap, renders progress + grouped items
App.tsx                     ← adds /outline route (public, no auth required)
AdminLayout.tsx             ← adds "Outline" link in sidebar navigation
```

### Data Structure (`src/data/buildMap.ts`)

```typescript
export type ItemStatus = "done" | "in-progress" | "planned";

export interface BuildItem {
  name: string;
  description: string;
  status: ItemStatus;
}

export interface BuildCategory {
  name: string;
  items: BuildItem[];
}

export const buildMap: BuildCategory[] = [
  {
    name: "Authentication & Access",
    items: [
      { name: "Login Page", description: "Email/password authentication", status: "done" },
      { name: "Signup Page", description: "New organization registration", status: "done" },
      { name: "Forgot Password", description: "Email-based password reset flow", status: "in-progress" },
      { name: "Dev Mode Bypass", description: "Development auth bypass for faster building", status: "in-progress" },
      { name: "Master Admin Access", description: "Hidden /system-access route for platform admins", status: "done" },
    ]
  },
  {
    name: "Tenant Management",
    items: [
      { name: "Tenants List", description: "View and manage all tenants/clients", status: "done" },
      { name: "Add/Edit Tenant", description: "Form to create and update tenant records", status: "done" },
      { name: "Delete Tenant", description: "Remove tenant with confirmation dialog", status: "done" },
      { name: "Tenant CRM Type", description: "Tag tenants by CRM system (Clio, Workiz, etc.)", status: "done" },
    ]
  },
  {
    name: "Five9 Domain Management",
    items: [
      { name: "Domains List", description: "View all connected Five9 domains", status: "done" },
      { name: "Domain Detail Page", description: "Per-domain settings with tabbed UI", status: "done" },
      { name: "API Credentials Tab", description: "Securely store Five9 username and password", status: "done" },
      { name: "Test Connection", description: "Validate Five9 API credentials via SOAP", status: "done" },
      { name: "Workflow Settings", description: "Configure IVR, callback, and queue behavior", status: "done" },
      { name: "Branding Settings", description: "Per-domain greeting, company name, colors", status: "done" },
    ]
  },
  {
    name: "Field Mapping Builder",
    items: [
      { name: "Mappings List", description: "View all field mapping configurations", status: "done" },
      { name: "Visual Mapping Canvas", description: "Drag-and-drop field mapping interface using React Flow", status: "done" },
      { name: "Source Fields Panel", description: "Five9 contact fields and call variables", status: "done" },
      { name: "Target Fields Panel", description: "CRM destination fields", status: "done" },
      { name: "Transform Dialog", description: "Add transformation logic to field mappings", status: "done" },
      { name: "Live Five9 Schema", description: "Dynamically fetch real fields from connected Five9 domain", status: "done" },
    ]
  },
  {
    name: "API & Integrations",
    items: [
      { name: "Contacts Edge Function", description: "Handle incoming contact sync requests", status: "done" },
      { name: "Intakes Edge Function", description: "Process intake form submissions from Five9", status: "done" },
      { name: "Five9 Schema Function", description: "Fetch fields/dispositions via SOAP API", status: "done" },
      { name: "CRM Push Logic", description: "Send mapped data to tenant CRM systems", status: "planned" },
      { name: "Webhook Support", description: "Receive real-time events from Five9", status: "planned" },
    ]
  },
  {
    name: "Monitoring & Logs",
    items: [
      { name: "API Logs Page", description: "View inbound/outbound API request history", status: "done" },
      { name: "Notifications Page", description: "System alerts and event notifications", status: "done" },
      { name: "Test Console", description: "Send test API requests and view responses", status: "done" },
      { name: "Real-time Log Streaming", description: "Live log updates via websockets", status: "planned" },
      { name: "Error Alerting", description: "Email/Slack alerts for critical failures", status: "planned" },
    ]
  },
  {
    name: "Master Admin (Platform)",
    items: [
      { name: "Master Dashboard", description: "Platform-wide stats and health overview", status: "done" },
      { name: "Organizations Overview", description: "View all tenant organizations on the platform", status: "done" },
      { name: "Users Management", description: "Manage platform users and roles", status: "done" },
    ]
  },
  {
    name: "Settings & UX",
    items: [
      { name: "Settings Page", description: "Organization-level configuration", status: "done" },
      { name: "Dark Mode UI", description: "Consistent dark theme throughout the app", status: "done" },
      { name: "Responsive Sidebar", description: "Mobile-friendly collapsible navigation", status: "done" },
      { name: "Onboarding Flow", description: "New user org creation wizard", status: "done" },
      { name: "Build Outline Page", description: "Living build map showing feature progress", status: "in-progress" },
    ]
  },
];
```

### OutlinePage UI

```text
+----------------------------------------------------------+
|  Fabric59 Build Outline                                   |
|  Living map of all planned and built features             |
|                                                           |
|  [████████████░░░░░░░░░░] 28 of 38 features complete      |
+----------------------------------------------------------+
|                                                           |
|  Authentication & Access          [4 / 5]                 |
|  +-------------------------------------------------+      |
|  | ✅ Login Page           Email/password auth     |      |
|  | ✅ Signup Page          New org registration    |      |
|  | 🔄 Forgot Password      Email reset flow        |      |
|  | ⬜ Dev Mode Bypass      Build-time auth bypass  |      |
|  +-------------------------------------------------+      |
|                                                           |
|  ... (all other categories)                               |
+----------------------------------------------------------+
```

### Status Icons
- `done` → `CheckCircle2` (green, `text-success`)
- `in-progress` → `Loader2` with `animate-spin` (yellow, `text-warning`)
- `planned` → `Circle` (muted, `text-muted-foreground`)

### Route
The `/outline` page will be added as a **public route** in `App.tsx` (no auth required — it's a dev/reference tool). It will also appear in the `AdminLayout` sidebar navigation as the last item with a `Map` icon.

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/auth/ForgotPasswordPage.tsx` | Create | Request password reset email |
| `src/pages/auth/ResetPasswordPage.tsx` | Create | Set new password after reset link click |
| `src/data/buildMap.ts` | Create | Single source of truth for build outline |
| `src/pages/OutlinePage.tsx` | Create | Render the build map visually |
| `src/pages/auth/LoginPage.tsx` | Modify | Add back button + forgot password link |
| `src/contexts/AuthContext.tsx` | Modify | Add `devMode` state and `toggleDevMode` |
| `src/components/auth/ProtectedRoute.tsx` | Modify | Bypass auth check when devMode is active |
| `src/components/layout/AdminLayout.tsx` | Modify | Add Outline nav link + DEV MODE indicator badge in header |
| `src/App.tsx` | Modify | Add `/forgot-password`, `/reset-password`, `/outline` routes |

---

## Implementation Notes

- The "back button" on login will use `navigate(-1)` to go back in history — this is simpler than hardcoding a home URL since there is no dedicated public landing page yet.
- Dev mode is only available when `import.meta.env.DEV` is `true`, so it cannot be accidentally enabled in production.
- The `/outline` page is accessible without auth so it can be viewed before logging in during development.
- The build map status changes require only editing `src/data/buildMap.ts` — no database, no backend calls.
- Password reset emails are sent by the auth system automatically; no custom email template setup is needed for this to work.
