

# Five9 Deep Audit: Connectors, Worksheets, Dispositions & Service Provider Architecture

## Research Findings

### Five9 Web Connectors — What They Actually Are

Five9 "Web Connectors" are **not** what our `CampaignConnector` component models. In Five9, a Web Connector is a **server-side HTTP callback** tied to call lifecycle events. Key properties from the API:

```text
WebConnector {
  name:           string       -- Connector name
  url:            string       -- Endpoint URL (e.g., Fabric59 webhook)
  trigger:        enum         -- OnCallAccepted | OnCallDisconnected | OnCallDispositioned | ManuallyStarted | OnPreview | OnWarmTransferInitiation | OnChatArrival | ...
  postMethod:     boolean      -- GET vs POST
  executeInBrowser: boolean    -- Open in agent browser vs server-side
  agentApplication: enum       -- EmbeddedBrowser | ExternalBrowser
  addWorksheet:   boolean      -- Include worksheet answers in POST payload
  variables:      KeyValuePair[] -- e.g. ANI=@Call.ANI@, DNIS=@Call.DNIS@
  constants:      KeyValuePair[] -- Static params
  triggerDispositions: Disposition[] -- Filter: fire only on these dispositions
}
```

**What this means for Fabric59:** We can programmatically register Fabric59's webhook endpoints (`five9-main`) as Web Connectors inside the customer's Five9 domain using `createWebConnector`. This replaces the manual setup step where 24H Virtual admins must go into Five9 VCC Admin and manually add connector URLs. The connector variables like `@Call.ANI@`, `@Call.DNIS@`, `@Call.campaign_name@` are Five9's built-in variable substitution — they inject live call data into the POST body automatically.

### Five9 Worksheets — What They Actually Are

Worksheets are **question-and-answer forms** presented to agents during calls. The data is stored in Five9's database and accessible via Worksheet Reports. Worksheets support:
- Multiple question types (text, dropdown, checkbox, radio)
- HTML content in questions
- Contact record field value interpolation (e.g., `@first_name@`)
- Export/import between campaigns
- Per-campaign assignment

**The link between Worksheets and Web Connectors**: When `addWorksheet=true` on a Web Connector, Five9 automatically includes the agent's worksheet answers as POST parameters in the HTTP request. This is how data flows from the agent's form → Five9 → Fabric59's webhook → CRM.

Our **ScriptFlow tree editor** is essentially a more powerful, programmable replacement for Five9's native worksheets. But the worksheet data bridge matters because:
1. Some clients may already have Five9 worksheets configured
2. Worksheet data appears in Five9's native reporting
3. Our Web Connector integration should support both our ScriptFlow data AND native worksheet data

### Five9 Dispositions — Deep Dive

Disposition types from the API:
- `FinalApplyToCampaigns` — Final, applies to campaign-level records
- `FinalApplyToContact` — Final, applies to the contact record
- `AddActiveNumber` — Adds a number to the active dialing list
- `DoNotDial` — Adds number to DNC list
- `NoneApplyToCampaigns` — Non-final, campaign-scoped
- `NoneApplyToContact` — Non-final, contact-scoped

Disposition properties we should be using but aren't:
- `agentMustCompleteWorksheet` — Forces worksheet completion before dispositioning (we should set this on the Five9 side when a ScriptFlow script requires all nodes complete)
- `sendEmailNotification` — Five9's native email on disposition (we replace this with our Disposition Email Engine, but should be aware it exists to avoid duplicates)
- `resetAttemptsCounter` — Relevant for outbound/callback campaigns
- `typeParameters.useTimer` / `.timer` — Redial timer settings for non-final dispositions
- `trackAsFirstCallResolution` — FCR tracking for inbound

### Service Provider (24H Virtual) ↔ End Client Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                    FIVE9 DOMAIN                          │
│  (Owned by 24H Virtual / the BPO)                       │
│                                                          │
│  ┌─────────┐  ┌──────────┐  ┌──────────────────────┐    │
│  │ Campaigns│  │ Skills   │  │ Web Connectors       │    │
│  │ (per     │  │ (per     │  │                      │    │
│  │  client) │  │  client) │  │ "Fabric59-Webhook"   │    │
│  │          │  │          │  │ URL: five9-main       │    │
│  │ Client A │  │ Skill-A  │  │ Trigger: OnCallDisp  │    │
│  │ Client B │  │ Skill-B  │  │ Variables:            │    │
│  │ Client C │  │ Skill-C  │  │  ANI=@Call.ANI@       │    │
│  └─────────┘  └──────────┘  │  DNIS=@Call.DNIS@     │    │
│                              │  Campaign=@campaign@  │    │
│  ┌─────────┐  ┌──────────┐  │  Disposition=@dispo@  │    │
│  │ Profiles │  │ Dispos   │  │  addWorksheet=true    │    │
│  │ (shared) │  │ (shared) │  └──────────────────────┘    │
│  └─────────┘  └──────────┘                               │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                      │
│  │ Worksheets   │  │ IVR Scripts  │                      │
│  │ (per campaign)│  │ (per campaign)│                     │
│  └──────────────┘  └──────────────┘                      │
└──────────────────────────────────────────────────────────┘
            │
            │ HTTP POST (OnCallDispositioned)
            ▼
┌──────────────────────────────────────────────────────────┐
│                   FABRIC59 CLOUD                         │
│                                                          │
│  five9-main (webhook receiver)                           │
│    ├── Route A: x-tenant-id → direct tenant              │
│    └── Route B: x-five9-domain → resolve all tenants     │
│         ├── Match campaign name → tenant                  │
│         ├── Dispatch to CRM adapter (Clio/MyCase/generic)│
│         ├── Dispatch notifications (Slack/Teams/email)    │
│         └── Log call_sessions + call_outcomes             │
│                                                          │
│  ┌──────────────────────────────────────────────┐        │
│  │ Tenant Hierarchy                             │        │
│  │  Organization: "24H Virtual"                 │        │
│  │    Partner: "Direct" / "White-Label Partner"  │        │
│  │      Client A → Clio (law firm)              │        │
│  │      Client B → Workiz (home services)       │        │
│  │      Client C → Generic CRM                  │        │
│  └──────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────┘
```

### API Methods We Should Add to `five9-provisioning`

Based on the full API audit, these methods are directly relevant to features we already have or are building:

| Priority | Method | Use Case |
|---|---|---|
| **High** | `createWebConnector` | Auto-register Fabric59 webhook in Five9 during campaign setup |
| **High** | `getWebConnectors` | Verify connector registration, show status in UI |
| **High** | `modifyWebConnector` | Update webhook URL if environment changes |
| **High** | `deleteWebConnector` | Clean up during campaign archiving |
| **High** | `startCampaign` | Start campaigns from Campaign Setup page |
| **High** | `forceStopCampaign` | Fallback when `stopCampaign` hangs |
| **High** | `modifyUser` | Update agent role/extension without recreating |
| **High** | `deleteUser` | Hard-delete during offboarding |
| **Medium** | `getDNISList(selectUnassigned=true)` | Show available DNIS in campaign setup |
| **Medium** | `createList` / `deleteList` | Manage dialing lists for web callbacks |
| **Medium** | `getListsInfo` | Show existing lists in UI |
| **Medium** | `getCampaignState` | Real-time campaign status in supervisor panel |
| **Medium** | `getCallCountersState` | Live call volume metrics |
| **Medium** | `createReasonCode` / `getReasonCode` | Not-ready reason codes for agent status tracking |
| **Medium** | `modifyDisposition` | Update disposition properties (email notification, worksheet requirement) |
| **Medium** | `getIVRScripts` | List IVR scripts in call flow builder |
| **Medium** | `runReport` / `isReportRunning` / `getReportResultCsv` | Pull Five9 native reports into analytics |
| **Low** | `checkDncForNumbers` | Pre-validate callback numbers |
| **Low** | `createAgentGroup` / `modifyAgentGroup` | Team-based provisioning |
| **Low** | `modifySkill` | Abandon Rate Engine — queue callback settings |
| **Low** | `createCallVariable` / `createCallVariablesGroup` | Custom call variables for CRM mapping |
| **Low** | `getContactRecords` | Contact lookup from Five9 CRM |

### Current Gaps Identified

1. **Our `CampaignConnector` type is wrong** — It models internal document links (backend_doc, website, script, custom). Five9 Web Connectors are HTTP callback endpoints with call-event triggers. These are two different concepts. Our `ConnectorList.tsx` is for internal reference links; Five9 connectors are for automated webhook registration.

2. **No auto-registration of Fabric59 webhook** — Currently, 24H Virtual admins must manually create a Web Connector in Five9 VCC Admin pointing to `five9-main`. We should automate this during campaign setup or domain connection.

3. **Missing `agentMustCompleteWorksheet`** — When creating dispositions, we don't set this flag. For ScriptFlow-driven campaigns where agents must complete the decision tree before dispositioning, this should be set to `true`.

4. **No campaign start/stop from UI** — We have `stopCampaign` but no `startCampaign`. The Campaigns page should have both.

5. **No `modifyUser`/`deleteUser`** — Agent updates and hard-delete during offboarding are missing. We only have `deactivate` (soft-disable).

6. **No `modifyDisposition`** — Can't update disposition properties after creation (email notification settings, redial timers).

7. **No Five9 reporting integration** — `runReport` / `getReportResultCsv` would feed real Five9 data into our analytics dashboards instead of relying solely on our local `call_sessions` table.

---

## Implementation Plan

### Part 1: Add Web Connector Management to `five9-provisioning`

Add 4 new actions to `five9-provisioning/index.ts`:

- `createWebConnector` — Registers Fabric59's webhook URL as a Five9 connector with variables (ANI, DNIS, campaign, disposition, etc.), trigger `OnCallDispositioned`, and `addWorksheet=true`
- `getWebConnectors` — Lists existing connectors to check registration status
- `modifyWebConnector` — Updates connector URL/variables
- `deleteWebConnector` — Removes connector during campaign archiving

### Part 2: Add Missing Campaign Lifecycle Actions

Add to `five9-provisioning/index.ts`:

- `startCampaign` — Start a campaign by name
- `forceStopCampaign` — Force-stop a hung campaign
- `getCampaignState` — Get current campaign state (RUNNING, NOT_RUNNING, etc.)
- `modifyUser` — Update agent generalInfo (role, extension, email) and roles
- `deleteUser` — Hard-delete an agent from Five9
- `modifyDisposition` — Update disposition properties (agentMustCompleteWorksheet, sendEmailNotification, typeParameters)
- `getDNISList` — Get unassigned DNIS numbers
- `getListsInfo` — Get dialing lists

### Part 3: Auto-Register Fabric59 Webhook During Domain Connection

Update `useCampaignSetup` hook to optionally call `createWebConnector` after campaign creation, registering a connector named `Fabric59-{campaignName}` pointing to the `five9-main` function URL.

### Part 4: Update Disposition Creation to Set Worksheet Flags

In `five9-provisioning` `createDispositions` action, add support for `agentMustCompleteWorksheet` flag per disposition, defaulting to `false` but settable from the UI.

### Part 5: Wire UI Components

- **CampaignsPage** — Add "Start Campaign" and "Force Stop" buttons using `startCampaign` / `forceStopCampaign`
- **Campaign Setup** — Add checkbox "Auto-register Fabric59 webhook connector" that calls `createWebConnector`
- **Agent Offboarding** — Add "Permanently Delete from Five9" option using `deleteUser`
- **Disposition Builder** — Add `agentMustCompleteWorksheet` toggle per disposition

### Files Changed

- `supabase/functions/five9-provisioning/index.ts` — Add ~12 new action handlers (~200 lines)
- `src/hooks/useCampaignSetup.ts` — Add webhook connector auto-registration step
- `src/hooks/useDeprovisioning.ts` — Add `deleteUser` support
- `src/hooks/useFive9Dispositions.ts` — Add `agentMustCompleteWorksheet` to payload
- `src/components/domains/DispositionsTab.tsx` — Add worksheet completion toggle
- `src/pages/admin/CampaignsPage.tsx` — Add start/stop campaign buttons
- `.lovable/plan.md` — Update status

