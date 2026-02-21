

# Comprehensive Platform Upgrade Plan

## Overview

This plan covers 9 major feature areas: navigation fixes, new pages, animations, AI onboarding, scroll-to-top, user dashboard with granular permissions, super admin dashboard switching, profile settings, and an AI-assisted call flow builder with interactive demo.

---

## Phase 1: Quick Fixes and Foundation

### 1.1 Back Button Goes to Landing Page

**File: `src/pages/auth/LoginPage.tsx`**
- Change the back button `onClick={() => navigate(-1)}` to `onClick={() => navigate("/")}`

### 1.2 Scroll to Top on Navigation

**File: `src/components/layout/ScrollToTop.tsx`** (new)
- Create a component that listens to `useLocation()` changes and calls `window.scrollTo(0, 0)` on every route change

**File: `src/App.tsx`**
- Add `<ScrollToTop />` inside `<BrowserRouter>` above `<Routes>`

### 1.3 Terms and Security Pages

**File: `src/pages/TermsPage.tsx`** (new)
- Placeholder legal page with standard terms layout, dark theme, back-to-home link

**File: `src/pages/SecurityPage.tsx`** (new)
- Placeholder security page covering data encryption, SOC compliance placeholders, contact info

**File: `src/App.tsx`**
- Add public routes: `/terms` and `/security`

**File: `src/pages/LandingPage.tsx`**
- Update footer links from `href="#"` to `<Link to="/terms">` and `<Link to="/security">`

---

## Phase 2: Animations with Framer Motion

### 2.1 Install framer-motion

Add `framer-motion` as a dependency.

### 2.2 Landing Page Entrance Animations

**File: `src/pages/LandingPage.tsx`**
- Wrap the hero badge, heading, subtitle, and CTA buttons in `motion.div` with `initial={{ opacity: 0, y: 20 }}` and `animate={{ opacity: 1, y: 0 }}` with staggered delays
- Wrap each feature card in `motion.div` with `whileInView` animation for scroll-triggered reveals
- Wrap platform feature cards similarly with staggered `whileInView` animations

---

## Phase 3: User Dashboard with Granular Access Control

### 3.1 Database: User Permissions Table

**New migration:**

```text
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  permission text NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
```

Permissions will be string keys like: `agents`, `tenants`, `domains`, `integrations`, `mappings`, `logs`, `test_console`, `notifications`, `settings`

**RLS Policies:**
- Org owners/admins can CRUD permissions for their org
- Users can SELECT their own permissions
- Master admins have full access

**Security definer function:**
```text
CREATE OR REPLACE FUNCTION public.user_has_permission(
  _user_id uuid, _org_id uuid, _permission text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND permission = _permission
  )
$$;
```

### 3.2 Auth Context Updates

**File: `src/contexts/AuthContext.tsx`**
- Add `permissions: string[]` to context
- After loading organization membership, fetch user_permissions for the current org
- Expose a helper: `hasPermission(permission: string): boolean`
- Org owners and admins automatically have all permissions (bypass check)

### 3.3 Admin Layout with Permission-Based Nav

**File: `src/components/layout/AdminLayout.tsx`**
- Each nav item gets a `permission` key (e.g., `{ name: "Agents", href: "/admin/agents", icon: Users, permission: "agents" }`)
- Filter navigation items based on `hasPermission()` -- owners/admins see everything
- Non-permitted routes also get a guard redirect in case of direct URL access

### 3.4 User Permissions Management UI

**File: `src/pages/admin/SettingsPage.tsx`** (extend)
- Add a "Team Members" section where org owners/admins can:
  - See list of org members
  - Toggle permission checkboxes per member (agents, tenants, domains, etc.)
  - Save permission changes

---

## Phase 4: Super Admin Dashboard Switching

### 4.1 Extend Dashboard Switcher

**File: `src/components/layout/DashboardSwitcher.tsx`**
- Add a third option for "User Dashboard" pointing to `/admin` (when master admin is viewing)
- Master admin gets all three: System Admin, Admin Dashboard, User Dashboard (all three use the same `/admin` layout but the switcher shows context)

Since user dashboard is the same layout with restricted nav, the switcher just needs Master + Admin. The existing implementation already handles this. We just need to ensure the master admin can also switch into any org's context and see the admin dashboard as that org.

### 4.2 Org Context Selector for Master Admin

**File: `src/components/layout/AdminLayout.tsx`**
- Already has org switcher dropdown for multi-org users
- Master admin already loads all orgs -- this works as-is
- Ensure the master admin can pick any org and the data filters accordingly

---

## Phase 5: Profile Settings

### 5.1 Database: Profiles Table

**New migration:**

```text
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  phone text,
  timezone text DEFAULT 'America/New_York',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**RLS Policies:**
- Users can SELECT and UPDATE their own profile
- Master admins can view all profiles

### 5.2 Profile Settings Page

**File: `src/pages/admin/ProfilePage.tsx`** (new)
- Display name, phone, timezone selector
- Avatar upload (using storage bucket or URL input)
- Change password section (calls `supabase.auth.updateUser`)
- Email display (read-only)

### 5.3 Navigation and Routing

**File: `src/components/layout/AdminLayout.tsx`**
- Add profile link in the user footer section (clicking on the user avatar area)

**File: `src/App.tsx`**
- Add route `/admin/profile` inside admin layout

---

## Phase 6: AI Onboarding and Guided Feature Reveal

### 6.1 Onboarding State Tracking

**New migration:**

```text
ALTER TABLE public.profiles
  ADD COLUMN onboarding_completed jsonb DEFAULT '{}'::jsonb;
```

This stores which dashboards the user has completed onboarding for, e.g.: `{ "admin": true, "master": false }`

### 6.2 Onboarding Overlay Component

**File: `src/components/onboarding/GuidedTour.tsx`** (new)
- A step-by-step overlay component using framer-motion
- Each step highlights a sidebar nav item or page area with a tooltip/popover
- Steps for admin dashboard: Welcome, Domains, Agents, Clients, Integrations, Mappings, Settings
- "Next" / "Skip" / "Done" buttons
- On completion, updates the profiles.onboarding_completed JSON

### 6.3 Dashboard-Specific Tours

**File: `src/components/onboarding/AdminTour.tsx`** (new)
- Admin dashboard tour steps highlighting each nav section with brief descriptions

**File: `src/components/onboarding/MasterTour.tsx`** (new)
- Master dashboard tour: Organizations, Users, System Health

### 6.4 Integration Points

**File: `src/components/layout/AdminLayout.tsx`**
- Check if onboarding is completed for admin dashboard
- If not, show `<AdminTour />` overlay on first visit

**File: `src/components/layout/MasterLayout.tsx`**
- Same pattern with `<MasterTour />`

---

## Phase 7: Enhanced Field Mappings, API Logs, and Test Console

### 7.1 Field Mappings Enhancements

**File: `src/pages/admin/MappingsPage.tsx`**
- Add call phase tabs: "Pre-Call", "During Call", "Post-Call"
- Pre-Call mappings: contact lookup rules, CRM data pull, screen pop configuration
- During Call: real-time data capture rules, disposition mapping, call variable sync
- Post-Call: intake/job creation mappings, notification triggers, CRM record creation
- Add mapping templates: quick-start templates for common CRM setups (Clio legal intake, Workiz job dispatch, Salesforce lead creation)
- Add validation panel: test a mapping against sample data and preview the output
- Import/export mappings as JSON

### 7.2 API Logs Enhancements

**File: `src/pages/admin/ApiLogsPage.tsx`**
- Add date range filter with calendar picker
- Add request/response size column
- Add "Replay" button to re-execute a logged request
- Add log export (CSV/JSON download)
- Add summary stats at top: total requests, success rate, avg latency, error count (stat cards)
- Add simple latency chart (using recharts) showing response times over time

### 7.3 Test Console Enhancements

**File: `src/pages/admin/TestConsolePage.tsx`**
- Add call phase simulation tabs: "Pre-Call Lookup", "During Call Capture", "Post-Call Intake"
- Pre-Call: simulate contact lookup by phone/email, see screen pop data
- During Call: simulate call variable capture and disposition selection
- Post-Call: simulate full intake creation with mapped fields
- Add request history panel (recent test requests saved locally)
- Add "Save as Template" for frequently used test payloads
- Add headers editor for custom authentication testing
- Connect to real edge functions instead of simulated responses

---

## Phase 8: AI-Assisted Call Flow Builder

### 8.1 AI Chat Edge Function

**File: `supabase/functions/ai-call-flow/index.ts`** (new)
- Uses Lovable AI (google/gemini-3-flash-preview) via the gateway
- System prompt specialized for Five9 integration configuration
- Accepts user description of desired call flow and returns:
  - Structured call flow configuration (pre-call, during-call, post-call actions)
  - Field mapping suggestions
  - Integration recommendations
  - Notification setup

### 8.2 Call Flow Builder Page

**File: `src/pages/admin/CallFlowBuilderPage.tsx`** (new)
- Split layout: AI chat panel on the left, visual preview on the right
- Chat panel: user describes what they want ("I need a personal injury intake that creates a Clio contact and matter, sends a Slack notification, and books a follow-up")
- AI responds with a structured configuration and explanation
- "Apply" button to save the generated config to the tenant's settings

### 8.3 Interactive Call Flow Simulator

**File: `src/components/call-flow/CallFlowSimulator.tsx`** (new)
- Similar to the Vicky Virtual interactive demo
- Three-panel layout:
  - Left: "Caller's Experience" - simulated phone conversation with typed messages
  - Right: "Behind the Scenes" - live action feed showing integrations firing
  - Bottom: Integration status indicators (CRM, Calendar, Slack, etc.)
- Plays through a call scenario step by step:
  1. Call comes in, ANI lookup triggers
  2. Contact found/created in CRM
  3. Agent greets caller with screen pop data
  4. Intake questions asked, fields captured
  5. Disposition selected
  6. Post-call: CRM record created, Slack notification sent, appointment booked
- Uses practice area selector (like Vicky) to show different flow types
- "With Integrations" / "Without Integrations" toggle
- Play/Pause/Restart controls
- Counter showing captured data points

### 8.4 Routing

**File: `src/App.tsx`**
- Add route `/admin/call-flow` for the builder
- Add route `/admin/call-flow/simulate` for the simulator

**File: `src/components/layout/AdminLayout.tsx`**
- Add "Call Flow Builder" nav item with a `Workflow` icon, permission key: `call_flow`

---

## Phase 9: Build Outline Updates

**File: `src/data/buildMap.ts`**
- Add new categories and items for all features built:
  - "User Access Control" category
  - "Profile & Onboarding" category
  - "Call Flow Builder" category
  - Update existing categories with new items

---

## Technical Notes

- framer-motion is the only new dependency needed
- All AI features use Lovable AI gateway (no additional API keys needed since LOVABLE_API_KEY is already configured)
- User permissions use a separate table (not stored on profiles) per security requirements
- The call flow simulator is purely client-side animation/state (no backend needed for the demo)
- AI chat uses streaming SSE for real-time token rendering
- All new pages follow existing dark theme design tokens
- Database changes: 2 new tables (profiles, user_permissions), 1 column addition (profiles.onboarding_completed)

