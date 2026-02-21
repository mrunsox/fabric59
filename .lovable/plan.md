

# Phase 7 Implementation: Enhanced Pages, Team Permissions, and Build Outline

## Overview

Three areas of work: (1) enrich Mappings, API Logs, and Test Console with call-phase awareness and richer tooling, (2) add a Team Members permission manager to Settings, and (3) update the build outline with all new features.

---

## 1. Field Mappings Page -- Call Phase Tabs

**File: `src/pages/admin/MappingsPage.tsx`**

Add a top-level `Tabs` component wrapping the entire page content with three tabs:

- **Pre-Call**: Contact lookup rules, CRM data pull configuration, screen pop field selection. Show a card with configurable lookup fields (phone, email, case ID) and which CRM fields to pull back for screen pop display.
- **During Call**: Real-time data capture rules -- disposition mapping, call variable sync configuration. Show a card listing Five9 call variables and which unified fields they map to during the call.
- **Post-Call**: The existing mapping editor and visual builder (current page content moves here). This is where intake/job creation mappings, notification triggers, and CRM record creation live.

Each tab will show contextual guidance text explaining the phase. The existing visual mapping builder and JSON editor remain under Post-Call. Pre-Call and During Call tabs get new card-based configuration UIs with sample field lists and toggle switches.

Also add:
- **Mapping Templates** dropdown: Quick-start buttons for "Clio Legal Intake", "Workiz Job Dispatch", "Salesforce Lead" that pre-populate the JSON editor
- **Import/Export** buttons in the header: Export current mappings as JSON file download, Import from JSON file upload
- **Validation Panel**: A collapsible card at the bottom with a sample payload textarea and "Test Mapping" button that shows the transformed output preview

---

## 2. API Logs Page -- Date Filters, Stats, and Latency Chart

**File: `src/pages/admin/ApiLogsPage.tsx`**

Add these enhancements:

- **Summary Stat Cards** (top of page, 4-column grid): Total Requests, Success Rate (%), Avg Latency (ms), Error Count. Use the existing `useApiLogStats` hook (already in `useApiLogs.ts`) plus compute avg latency from the logs array.

- **Date Range Filter**: Add two date picker buttons (From / To) using the Popover+Calendar pattern from shadcn. Filter logs client-side by `created_at` range. Place alongside existing search and status filters.

- **Latency Chart**: A small `recharts` AreaChart below the stat cards showing response time over the last 24 hours. X-axis = time, Y-axis = response_time_ms. Use the existing `recharts` dependency. Chart height ~150px with gradient fill.

- **Export Button**: Add a "Download CSV" button in the header that converts filtered logs to CSV and triggers browser download.

- **Replay Button**: In the log detail dialog, add a "Replay Request" button that re-sends the same request payload to the same endpoint and shows the new response inline.

---

## 3. Test Console -- Call Phase Simulation Tabs

**File: `src/pages/admin/TestConsolePage.tsx`**

Add a top-level tab bar with three simulation modes:

- **Pre-Call Lookup**: Simplified form with phone/email input. Sends a GET to `/contacts?phone=...`. Shows the screen pop data that would be returned (contact name, CRM ID, open matters/jobs).

- **During Call Capture**: Form with call variable fields (disposition, call duration, agent notes, custom variables). Sends a simulated capture payload showing what would be synced in real-time.

- **Post-Call Intake**: The existing full request builder (current content moves here). Full payload editor with intake and contact sections.

Also add:
- **Request History Panel**: A collapsible sidebar or bottom panel showing recent test requests stored in `localStorage`. Each entry shows timestamp, method, endpoint, status. Clicking replays the request.
- **Save as Template**: Button next to the payload editor that saves the current config (method, endpoint, payload) to `localStorage` with a user-provided name. Templates appear as quick-load buttons.
- **Headers Editor**: An expandable section with key-value inputs for custom headers (e.g., `X-Tenant-Id`, `Authorization`).

---

## 4. Team Members Permission Manager in Settings

**File: `src/pages/admin/SettingsPage.tsx`**

Add a new `Card` section titled "Team Members" between the Integration Status card and API Configuration card. Only visible to org owners/admins.

Content:
- **Hook**: Create `src/hooks/useTeamPermissions.ts` that:
  - Fetches `organization_members` for the current org (with user email from profiles)
  - Fetches `user_permissions` for each member
  - Provides `togglePermission(userId, permission)` mutation that inserts or deletes from `user_permissions`

- **UI Layout**:
  - A table with columns: Member (email/name), Role badge (owner/admin/member), then a checkbox column for each permission key
  - Permission keys: `agents`, `tenants`, `domains`, `integrations`, `mappings`, `logs`, `test_console`, `notifications`, `settings`, `call_flow`
  - Owner/admin rows show all checkboxes checked and disabled (they have all permissions by default)
  - Member rows have interactive checkboxes that toggle permissions via the hook
  - Each permission column header has a tooltip explaining what it grants access to
  - Changes save immediately on toggle (optimistic update with toast confirmation)

- **Empty State**: "No team members yet. Invite members from the organization settings."

**New file: `src/hooks/useTeamPermissions.ts`**

---

## 5. Build Outline Update

**File: `src/data/buildMap.ts`**

Add three new categories and update existing ones:

**New: "User Access Control"**
- Granular Permissions Table -- done
- Permission-Based Sidebar Navigation -- done
- Team Members Permission Manager -- done (after this implementation)
- Security Definer Permission Check -- done

**New: "Profile and Onboarding"**
- Profiles Table -- done
- Profile Settings Page -- done
- Guided Tour Component -- done
- Admin Dashboard Tour -- done
- Master Dashboard Tour -- done
- Scroll to Top on Navigation -- done
- Framer Motion Landing Animations -- done

**New: "Call Flow Builder"**
- AI Chat Edge Function -- done
- Call Flow Builder Page -- done
- Interactive Call Flow Simulator -- done
- Practice Area Scenarios -- done
- Integration Status Indicators -- done

**Update "Branding and Landing"** -- add:
- Terms Page -- done
- Security Page -- done
- Footer with UNSOX Branding -- done
- Heart Animation Link -- done

**Update "Monitoring and Logs"** -- add:
- Date Range Filters -- done (after implementation)
- Latency Chart -- done
- Log Export CSV -- done
- Replay Request -- done

**Update "Field Mapping Builder"** -- add:
- Call Phase Tabs -- done
- Mapping Templates -- done
- Import/Export JSON -- done
- Validation Preview Panel -- done

**Update "Settings and UX"** -- add:
- Profile Page -- done

---

## Technical Details

- No new database tables or migrations needed -- all permission infrastructure already exists
- `useTeamPermissions` hook queries `organization_members` joined with `profiles` and `user_permissions`
- Date pickers use the shadcn Popover+Calendar pattern with `pointer-events-auto` on the Calendar
- Latency chart uses existing `recharts` dependency (AreaChart with gradient)
- Request history and templates in Test Console use `localStorage` (no backend needed)
- CSV export builds a Blob URL client-side from the filtered logs array
- All new UI follows existing dark theme tokens and card patterns
- Checkboxes use the existing `@radix-ui/react-checkbox` component

