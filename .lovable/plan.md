

# Reorganize Settings Page with Tabbed Navigation + Embed Profile

## Overview

Replace the long scrolling Settings page with a horizontal tab bar at the top. Move the Profile page content into a "Profile" tab within Settings, and remove the standalone `/admin/profile` route.

## Tab Structure

The Settings page will have these tabs:

| Tab | Contents |
|-----|----------|
| **Profile** | Personal info (name, phone, timezone, avatar) + Change Password (moved from ProfilePage) |
| **Team** | Integration Status card + Team Members table with Invite button (admin-only) |
| **Credentials** | API Configuration + Integration Credentials (Five9, Resend, Google, Slack) |
| **Security** | Security toggles (API key auth, encryption, CORS) |
| **Notifications** | Email/Slack alerting, HR notifications, webhook URL |
| **Data** | Data Retention settings |

## Changes

### 1. Settings Page Rewrite (`src/pages/admin/SettingsPage.tsx`)

- Wrap entire content in a `<Tabs>` component with a horizontal `<TabsList>` at the top
- Each current card section becomes a `<TabsContent>` panel
- The "Profile" tab renders the profile form inline (display name, phone, timezone, avatar, password change) -- same logic currently in `ProfilePage.tsx`
- Default active tab: "Profile"
- Remove the standalone "Save All Settings" button at the bottom (each section saves independently)

### 2. Remove Standalone Profile Route

- **`src/App.tsx`**: Remove the `/admin/profile` route since profile is now under Settings
- **`src/components/layout/AdminLayout.tsx`**: Update the sidebar footer avatar click to navigate to `/admin/settings` instead of `/admin/profile`
- **`src/pages/admin/ProfilePage.tsx`**: Can be deleted or kept as a redirect

### 3. Sidebar Navigation Update

- The sidebar "Settings" link already exists at `/admin/settings` -- no change needed there
- The avatar click in the sidebar footer changes from `/admin/profile` to `/admin/settings`

## Technical Details

### Tabs Implementation

Uses the existing `@radix-ui/react-tabs` component already in the project at `src/components/ui/tabs.tsx`.

```
Tabs (defaultValue="profile")
  TabsList (horizontal, sticky below header)
    TabsTrigger value="profile" -- Profile
    TabsTrigger value="team" -- Team (admin only)
    TabsTrigger value="credentials" -- Credentials
    TabsTrigger value="security" -- Security
    TabsTrigger value="notifications" -- Notifications
    TabsTrigger value="data" -- Data
  TabsContent value="profile" -- profile form + password
  TabsContent value="team" -- status card + members table
  TabsContent value="credentials" -- API config + creds
  TabsContent value="security" -- security toggles
  TabsContent value="notifications" -- alerting config
  TabsContent value="data" -- retention settings
```

### Profile Tab Content

Inline the profile loading/saving logic from `ProfilePage.tsx` directly into the Settings component:
- `useEffect` to load profile from `profiles` table
- `handleSaveProfile` using `supabase.from("profiles").upsert(...)`
- `handleChangePassword` using `supabase.auth.updateUser(...)`
- Same form fields: email (disabled), display name, phone, timezone select, avatar URL, password change

### Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/SettingsPage.tsx` | Reorganize into tabbed layout, embed profile form |
| `src/App.tsx` | Remove `/admin/profile` route |
| `src/components/layout/AdminLayout.tsx` | Change avatar click to navigate to `/admin/settings` |

