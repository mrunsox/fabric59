

# Smart Agent Provisioning: Auto-Generate Everything from a Name

## Overview

Replace the current manual-fill provisioning form with an intelligent "Quick Provision" mode. The user types just the agent's full name (e.g. "John Smith"), selects a role, and the system auto-derives every field using your company's naming conventions. The user reviews a pre-populated summary, picks skills, chooses where to send credentials, and hits go.

## How It Works

**Step 1 -- Enter Name**
A single input: "John Smith"

**Step 2 -- Select Platforms**
Checkboxes: Google Workspace, Five9, Slack (default: all checked)

**Step 3 -- Select Role**
Dropdown from the existing AGENT_ROLES list

**Step 4 -- System Auto-Generates Everything**
Using your naming conventions:
- **Email**: First name + last initial, lowercase = `johns@businessname.com`
- **Five9 Username**: First name + space + last initial uppercase = `John S`
- **Extension**: Finds the next available extension in the role's range by querying Five9 for used extensions
- **Password**: Auto-generated (existing logic)
- **Slack Channels**: Derived from the selected role's `slackChannels` array

**Step 5 -- Select Skills**
Multi-select from live Five9 skills list (already fetched)

**Step 6 -- Review and Send**
All fields shown in a summary card, fully editable if the user wants to override anything. External email field with:
- Dropdown of recently used external emails
- Manual entry option
- The user confirms and clicks "Provision"

## Similarly for Offboarding

Add a "Quick Offboard" button: user types or selects an agent name, system looks up all their accounts, shows a confirmation summary, and runs the full deprovisioning workflow with one click (defaulting to immediate, no grace period, no data transfer -- but overridable).

---

## Technical Changes

### 1. Update ProvisioningForm with Quick Mode

**File: `src/components/agents/onboarding/ProvisioningForm.tsx`**

Add a "Quick Provision" toggle at the top of the form:
- **Quick Mode (default)**: Shows only Full Name, Role selector, Skills multi-select, and External Email
- **Advanced Mode**: Shows all existing fields for manual override

When Quick Mode is active:
- On name input, auto-derive `emailHandle`, `five9Username` using naming convention functions
- On role selection, auto-query Five9 for the next available extension in that role's range
- Show a live preview card below the form with all derived values
- User can click any derived value to override it

### 2. Add Naming Convention Utilities

**New file: `src/lib/agent-naming.ts`**

```
deriveEmailHandle(fullName: string): string
  // "John Smith" -> "johns"
  // "Mary Jane Watson" -> "maryjanew"  (first + middle + last initial)

deriveFive9Username(fullName: string): string
  // "John Smith" -> "John S"

deriveDisplayName(fullName: string): string
  // "John Smith" -> "John S." (for privacy)
```

### 3. Auto-Find Next Available Extension

**Update: `src/hooks/useProvisioning.ts`**

Add a `findNextExtension(role: AgentRole)` function that:
1. Calls `five9-provisioning` with `action: 'getExtensions'` to get used extensions
2. Also queries local `agents` table for extensions in the role's range
3. Returns the first unused number in `extensionRangeStart..extensionRangeEnd`

### 4. Skills Multi-Select Component

**New file: `src/components/agents/onboarding/SkillsMultiSelect.tsx`**

Replace the current comma-separated text input with a proper multi-select dropdown:
- Fetches available skills from Five9
- Shows checkboxes with search/filter
- Selected skills shown as removable badges

### 5. Derived Values Preview Card

**New file: `src/components/agents/onboarding/DerivedValuesPreview.tsx`**

Shows a summary card with all auto-generated values:
- Email: `johns@businessname.com` (editable)
- Five9 Username: `John S` (editable)
- Extension: `1042` (auto-found, editable)
- Password: `xK9#mP2...` (regeneratable)
- Slack Channels: `#english-support, #all-agents`

Each value has an edit icon to allow override.

### 6. Quick Offboard Mode

**Update: `src/components/agents/offboarding/AgentSearchList.tsx`**

Add a "Quick Offboard" button at the top that:
- Opens a name search/autocomplete against the agents list
- Selecting an agent immediately opens the DeprovisioningModal pre-filled with that agent's data
- Defaults to "Offboard Now" with no grace period

### 7. External Email Dropdown

**Update: `src/components/agents/onboarding/ProvisioningForm.tsx`**

Replace the plain text input with a combobox that:
- Shows recently used external emails (from previous provisions in the `agents` table -- not stored, but could query audit logs)
- Allows manual entry
- Validates email format

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/lib/agent-naming.ts` | New -- naming convention utilities |
| `src/components/agents/onboarding/ProvisioningForm.tsx` | Add Quick/Advanced mode toggle, auto-derive fields, preview card |
| `src/components/agents/onboarding/SkillsMultiSelect.tsx` | New -- multi-select skills component |
| `src/components/agents/onboarding/DerivedValuesPreview.tsx` | New -- auto-generated values preview with edit |
| `src/hooks/useProvisioning.ts` | Add `findNextExtension()` helper |
| `src/components/agents/offboarding/AgentSearchList.tsx` | Add Quick Offboard button with name search |
| `src/types/provisioning.ts` | No changes needed (existing types sufficient) |

