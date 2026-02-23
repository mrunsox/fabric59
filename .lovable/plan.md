

# Campaign Setup Enhancements: Per-Disposition Email, Multi-Connectors, Skip Logic, and Multi-Department Support

## Context: The AssureWay Pattern

The uploaded AssureWay worksheets reveal a common real-world pattern: **one business with multiple departments**, each needing its own IVR prompt, decision tree/worksheet, and dispatch (email) rules. Currently, this requires building 5 separate campaigns in Five9 with 5 different DIDs. The enhancements below aim to handle this more elegantly.

AssureWay's structure:
- **Prompt 1:1** -- New Claim (complex branching: YES/NO, policy number validation, claim vs. non-claim paths)
- **Prompt 1:3** -- Other Coverage Request (similar branching with policy number gate)
- **Prompt 2** -- Dealership (simpler: dealership YES/NO, collect info, dispatch)
- **Prompt 3** -- Sales Rep (dropdown-based: rep found vs. not found, different closings based on time of day)
- **Prompt 4** -- General Inquiry (linear: collect name, phone, email, message)

Each has different dispatch instructions (different email recipients, subject line formats, and data fields).

---

## Enhancement 1: Per-Disposition Email Routing

**Problem:** Currently there's one global set of email fields (template, recipients, reply-to, from) for the entire campaign. In reality, different dispositions need to go to different people/departments.

**Solution:** Replace the single email config with a per-disposition email mapping table.

### Type Changes (`src/types/campaign.ts`)

Add a new interface and update `CampaignIntakeData`:

```
interface DispositionEmailConfig {
  dispositionName: string;
  emailRecipients: string;   // comma-separated
  emailReplyTo?: string;
  emailFrom?: string;
  emailSubjectTemplate?: string;  // e.g. "CALL from CUSTOMER: NEW CLAIM - {caller_name}"
}
```

Replace the flat email fields with:
```
dispositionEmailConfigs: DispositionEmailConfig[];
```

Keep `enableDispositionEmail` as a master toggle.

### UI Changes (`CampaignIntakePage.tsx` -- Section 5)

When "Enable Disposition Email" is toggled on, show a table/card list where each selected disposition (both existing and new) gets its own row with Recipients, Reply-To, From, and Subject Template fields. A "Copy settings to all" button lets users apply one disposition's email config to all others for the common case.

---

## Enhancement 2: Multiple Connectors

**Problem:** Currently there are only 3 fixed connector slots (backend doc, website, script). Real campaigns often need multiple connectors of the same type.

**Solution:** Replace the 3 fixed fields with a dynamic list of connector entries.

### Type Changes (`src/types/campaign.ts`)

Add:
```
interface CampaignConnector {
  id: string;
  type: "backend_doc" | "website" | "script" | "custom";
  name: string;
  url: string;
}
```

Replace the flat connector fields in `CampaignIntakeData` with:
```
connectors: CampaignConnector[];
```

### UI Changes (`CampaignIntakePage.tsx` -- Section 6)

Replace the 3 fixed inputs with a dynamic list. Each row has:
- Type dropdown (Backend Document, Website, Script, Custom)
- Name input
- URL input
- Remove button

"Add Connector" button at the bottom. Similar pattern to the existing `MultiInput` component but with structured rows.

---

## Enhancement 3: Decision Tree Skip/Jump Logic

**Problem:** The current decision tree only supports linear "Go to Q" routing. The AssureWay worksheets show patterns like:
- "If YES go to 3:1, if NO skip to 3:2" (conditional branching)
- "If Mon-Fri before 3:30pm say X, after 3:30pm say Y" (time-based conditions)
- "If caller is in the list go to 3:1, if not go to 3:2" (data-dependent routing)
- Required field gates ("MUST HAVE a number -- if not provided, end call")

**Solution:** Enhance `DecisionTreeOption` with richer routing capabilities.

### Type Changes (`src/types/campaign.ts`)

Expand `DecisionTreeOption`:
```
interface DecisionTreeOption {
  label: string;
  nextNodeId: string | null;
  action?: "transfer" | "disposition" | "escalate" | "end_call" | "skip" | null;
  actionValue?: string;
  condition?: string;          // e.g. "before 3:30pm EST", "caller in rep list"
  skipToNodeId?: string | null; // for skip/jump action
  isRequired?: boolean;         // gate: must collect data before proceeding
  fallbackScript?: string;      // optional script for the agent if caller persists
}
```

Add `isGate` and `gateFailMessage` to `DecisionTreeNode` for required-field validation gates:
```
interface DecisionTreeNode {
  id: string;
  question: string;
  notes?: string;
  dataToCapture?: string;
  options: DecisionTreeOption[];
  isGate?: boolean;               // If true, data must be collected to proceed
  gateFailMessage?: string;       // Script to read if data not provided
  closingScript?: string;         // Closing statement for this node
  conditionalClosings?: Array<{   // Time/condition-based closings
    condition: string;
    script: string;
  }>;
}
```

### UI Changes (`DecisionTreeBuilder.tsx`)

- Add new action types in the dropdown: "End Call" and "Skip to Q" (skip jumps to a node further ahead, unlike "Go to Q" which is sequential)
- Add a "Condition" text input next to options that appears when any routing is selected -- lets the user describe the condition (e.g., "caller found in rep list", "before 3:30pm EST")
- Add a "Required Gate" toggle on each question node -- when enabled, shows a "Fail message" textarea (the script to read if data isn't provided)
- Add a "Closing Script" textarea on each node for closing statements
- Add a "Conditional Closings" section: add multiple condition+script pairs (e.g., "before 3:30pm" -> one script, "after 3:30pm" -> another)
- Add a "Fallback/Persistence Script" textarea on options for "if caller persists" scripts

---

## Enhancement 4: Multi-Department Campaign Support

**Problem:** Businesses like AssureWay have one main phone number but multiple departments. Currently, this requires creating 5 separate campaigns with 5 separate DIDs. The IVR menu ("Press 1 for claims, 2 for dealerships...") routes to different worksheets and dispatch rules.

**Solution:** Add a "Departments" concept within a single campaign setup that groups IVR prompts, decision trees, and disposition email configs by department.

### Type Changes (`src/types/campaign.ts`)

Add:
```
interface CampaignDepartment {
  id: string;
  name: string;              // e.g. "New Claim", "Dealership", "Sales Rep"
  ivrPromptNumber: number;   // IVR menu number (1, 2, 3...)
  ivrGreeting?: string;      // Department-specific greeting
  skillName?: string;        // Optional separate skill per department
  decisionTree: DecisionTreeNode[];
  dispositionEmailConfigs: DispositionEmailConfig[];
  dispatchInstructions?: string;  // Free-text dispatch notes
}
```

Update `CampaignIntakeData`:
```
isMultiDepartment: boolean;
departments: CampaignDepartment[];
```

When `isMultiDepartment` is false, the form works exactly as it does today (single decision tree, single set of dispositions). When true, Section 7 (Decision Tree) and Section 5 (Dispositions) become department-scoped with tabs.

### UI Changes

**Section 1 (Basics):** Add a "Multi-Department Campaign" toggle.

**When multi-department is ON:**
- A new "Departments" section appears (between Prompts and Dispositions)
- Shows a tabbed interface where each tab is a department
- "Add Department" button creates new tabs
- Each department tab has: Name, IVR Prompt Number, optional Skill override, its own Decision Tree Builder, its own Disposition Email configs, and free-text Dispatch Instructions
- The shared campaign config (phone numbers, schedule, connectors, prompts) remains at the top level since those are common across departments
- Section 7 (Decision Tree) and Section 5 (Dispositions) are hidden at the top level and moved into each department tab

**When multi-department is OFF:**
- Everything works as it does today -- no changes

### Five9 Provisioning Impact

For multi-department campaigns, the auto-provisioning flow would:
1. Create one main campaign (shared)
2. Create one skill per department (or one shared skill)
3. Create one campaign profile
4. The IVR routing (which maps IVR prompt numbers to skills) remains a manual configuration step in Five9

---

## Files to Change

| File | Changes |
|------|---------|
| `src/types/campaign.ts` | Add `DispositionEmailConfig`, `CampaignConnector`, `CampaignDepartment` interfaces. Update `DecisionTreeOption`, `DecisionTreeNode`, and `CampaignIntakeData` |
| `src/components/campaigns/DecisionTreeBuilder.tsx` | Add skip/jump actions, condition inputs, gate toggles, closing scripts, conditional closings, fallback scripts |
| `src/pages/admin/CampaignIntakePage.tsx` | Section 5: per-disposition email table. Section 6: dynamic connector list. Section 1: multi-department toggle. New department tabs UI |
| `src/components/campaigns/ConnectorList.tsx` | New component: dynamic list of typed connectors with add/remove |
| `src/components/campaigns/DispositionEmailTable.tsx` | New component: per-disposition email config table |
| `src/components/campaigns/DepartmentTabs.tsx` | New component: tabbed department editor wrapping decision tree + disposition email configs |
| `src/pages/admin/CampaignIntakePage.tsx` (emptyIntake) | Update defaults for new fields |
| `src/data/buildMap.ts` | Add new items for these 4 enhancements |

---

## Implementation Order

1. **Types first** -- update all interfaces in `campaign.ts` (backward-compatible with defaults)
2. **Per-Disposition Email** -- new `DispositionEmailTable` component + Section 5 UI update
3. **Multiple Connectors** -- new `ConnectorList` component + Section 6 UI update
4. **Skip/Jump Logic** -- enhance `DecisionTreeBuilder` with new fields
5. **Multi-Department** -- new `DepartmentTabs` component + Section 1 toggle + conditional rendering
6. **Build Map** -- update outline with new items

All changes are backward-compatible: existing campaign data (which has the old flat fields) will still load correctly since new fields default to empty arrays/false.

