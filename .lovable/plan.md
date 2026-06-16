# AI-Assisted Script Creation (ASC) — Phase 2

**Data contract and canonical architecture mapping.** No code, no schema changes.

Carries Phase 1 lock-ins:
- Guided is default; one-click switch to manual.
- V1 is campaign-scoped (no guide-only sub-flow).
- One-way handoff into canonical builders.
- Tone implicit from skin + business description.
- Drafts are single-author; workspace admins see metadata read-only.

Phase 1 additions folded in:
- **Campaign destination** is modeled separately from **launch URL / slug**.
- **Operational destination details** (what agents open, deep-link pattern) are first-class.
- **Agent experience preview** is part of the review surface contract.
- **Branch origin** is tracked as `user_stated | inferred_best_practice | unresolved_recommendation`.

---

## 1. Architecture summary

ASC is a thin authoring layer on top of Fabric59's existing canonical entities. It does not introduce a new runtime or storage primitive. The wizard produces a structured **ASC Draft** that is reduced into the canonical `CampaignIntakeData`, `CampaignFlowContent`, and notification/disposition shapes already in the codebase. Handoff into the canonical guide/flow builders is one-way; once forked, the ASC review surface goes read-only for that section.

```
┌────────────────────┐   interview    ┌──────────────────┐
│  Wizard (Screens)  │ ─────────────▶ │  AscDraft (JSON) │
└────────────────────┘                └────────┬─────────┘
                                               │ reducer
                                               ▼
                ┌──────────────────────────────────────────────────┐
                │  Canonical outputs (already exist in the app):   │
                │  - CampaignIntakeData (campaign + dispositions)  │
                │  - CampaignFlowContent (steps + rules + mappings)│
                │  - NotificationTriggerConfig entries             │
                │  - CampaignDestination (new front-end type)      │
                │  - launchSlug (separate from destination)        │
                └──────────────────────────────────────────────────┘
                                               │
                                               ▼
                       canonical guide / flow / campaign builders
                                               │
                                               ▼
                                  campaign_setups + guides + guide_versions
```

**Storage strategy (v1, no schema changes):**
- The ASC Draft is stored as a JSON blob inside the existing `campaign_setups.intake_data` under a new namespaced key `intake_data.ascDraft`. The draft co-locates with the campaign it will become.
- "In-progress" assisted drafts are simply `campaign_setups` rows with `status = 'draft'` and `intake_data.ascDraft.state = 'in_progress'`. No new table.
- Generated, reviewed outputs are written into the *existing* `CampaignIntakeData` fields (decision tree, dispositions, etc.) and into the campaign-flow sentinel guide / `guide_versions.content` already used by `CampaignFlowContent`.
- Launch slug and destination live on `intake_data.launch` (new sub-object on `CampaignIntakeData` — front-end type extension only; JSONB accepts it with no migration).

---

## 2. Input / output contract

### 2.1 Wizard input model (`AscWizardInput`)

Captured progressively, one field per wizard answer. All optional during interview; required-ness is enforced at generation time by the readiness checker (Phase 3).

```ts
interface AscWizardInput {
  business: {
    description: string;
    industryPresetId: string;        // e.g. "legal", "medical", "general"
    hours: AscHours;
    callerPersonas: string[];        // free-text labels
    promisesToAvoid?: string[];
  };
  purpose: {
    primaryOutcome: string;
    secondaryOutcome?: string;
    blockingOutcomes: string[];      // must-be-captured outcomes
    sharedAcrossClients: boolean;
  };
  callerReasons: AscCallerReason[];  // see 2.2
  outcomesDraftEdits?: AscOutcomeEdit[];
  notificationsDraftEdits?: AscNotificationEdit[];
  launch?: AscLaunchInput;           // see 2.5
  destination?: AscDestinationInput; // see 2.5
}
```

### 2.2 Caller-reason mini-interview

```ts
interface AscCallerReason {
  id: string;
  label: string;                     // "New client intake"
  requiredCapture: string[];         // free-text bullets
  opener?: string;
  escalation?: {
    when: string;
    toRole: string;
  };
  variants?: {
    voicemail?: string;
    afterHours?: string;
  };
  branching?: AscBranchHint[];
}

interface AscBranchHint {
  id: string;
  trigger: string;                   // user description of when branch fires
  outcome: string;                   // where it leads (free-text, resolved later)
  origin: "user_stated";             // user-authored hint; AI may add inferred ones
}
```

### 2.3 AI working model (`AscDraft`)

The interview is reduced into a deterministic intermediate shape the Drafter operates on:

```ts
interface AscDraft {
  schemaVersion: 1;
  state: "in_progress" | "generated" | "forked" | "published" | "discarded";
  input: AscWizardInput;
  generated?: AscGenerated;          // present after Drafter runs
  confidence: Record<string, AscConfidence>;
  unresolved: AscUnresolvedItem[];
  rationales: Record<string, string>;   // sectionId -> "why this exists"
  forks: AscForkRecord[];               // one-way handoff log
  meta: {
    createdBy: string;                  // single-author v1
    createdAt: string;
    updatedAt: string;
    skinId?: string;                    // implicit tone source
  };
}

type AscConfidence = "high" | "medium" | "low";

interface AscUnresolvedItem {
  id: string;
  area: "guide" | "flow" | "outcomes" | "notifications" | "destination" | "launch";
  message: string;
  severity: "blocker" | "warning";
  dismissed?: { by: string; at: string; reason?: string };
}
```

### 2.4 Generated output (`AscGenerated`)

```ts
interface AscGenerated {
  guideDraft: AscGuideDraft;                // -> canonical guide content
  flowDraft: CampaignFlowContent;           // canonical type, reused as-is
  outcomesDraft: AscOutcomeDraft[];         // -> CampaignIntakeData dispositions + DispositionEmailConfig
  notificationsDraft: AscNotificationDraft[]; // -> notification_trigger steps + DispositionEmailConfig
  destination: AscDestination;              // see 2.5 — operational target
  launch: AscLaunch;                        // see 2.5 — agent-facing URL/slug
  branchProvenance: Record<string, AscBranchProvenance>; // keyed by step id
}

interface AscBranchProvenance {
  origin: "user_stated" | "inferred_best_practice" | "unresolved_recommendation";
  sourceAnswerId?: string;                  // back-reference into input
  rationale: string;                        // for Explainer + review tooltip
  confidence: AscConfidence;
}
```

### 2.5 Destination vs launch (the explicit split)

These are two different things and must never be conflated again:

```ts
// What the agent opens during a call. Operational target.
interface AscDestination {
  kind: "internal_runner" | "external_url" | "deep_link";
  // internal_runner: open Fabric59 campaign runner (default)
  // external_url:    open a partner/client tool in a new tab
  // deep_link:       open a deep-link template per-call
  externalUrl?: string;                     // when kind = external_url
  deepLinkTemplate?: string;                // e.g. "https://crm.example.com/calls/{{ani}}"
  openMode?: "same_tab" | "new_tab" | "side_panel";
  notes?: string;
}

// How the agent reaches Fabric59 to start the call experience.
interface AscLaunch {
  slug: string;                             // user-editable, validated unique per workspace
  resolvedUrl: string;                      // computed: /run/<workspace>/<slug>
  previousSlugs?: string[];                 // history after first publish
  editableUntilPublish: boolean;            // true until first publish
}
```

These map onto `CampaignIntakeData` via a new sub-object `intake_data.launch` and `intake_data.destination` — front-end type extension only, JSONB-compatible, no migration.

---

## 3. Mapping table — ASC → canonical entities

| AscDraft field | Canonical destination | Notes |
| --- | --- | --- |
| `input.business.description` | `CampaignIntakeData.campaignDescription` | Verbatim. |
| `input.business.industryPresetId` | `intake_data.ascDraft.meta.skinId` + preset selection | Implicit tone source. |
| `input.business.hours` | `CampaignIntakeData.coverageType` + weekday/weekend fields | Existing fields. |
| `input.business.callerPersonas` | `intake_data.ascDraft.input` only | Not modeled canonically; feeds flow. |
| `input.purpose.primaryOutcome` | First entry in `newDispositions` + outcome step | Drafter chooses. |
| `input.purpose.blockingOutcomes` | Readiness checker; surfaces as `unresolved` if missing post-generation | Not stored separately. |
| `callerReasons[]` | `CampaignFlowContent.steps` (question_branch + field_capture clusters) | Each reason becomes a branch from an opening question_branch step. |
| `callerReasons[].requiredCapture` | `field_capture` steps with `required: true` | One per bullet. |
| `callerReasons[].escalation` | `escalation_trigger` step + `FlowRule` `enable_escalation` | One per reason that escalates. |
| `callerReasons[].branching[]` | `FlowOption[]` on a `question_branch` step | `origin` tracked in `branchProvenance`. |
| `outcomesDraft[]` | `CampaignIntakeData.newDispositions` + `dispositionEmailConfigs` + `outcome_disposition` step `allowedOutcomes` | Three-way write. |
| `notificationsDraft[]` | `notification_trigger` steps + `DispositionEmailConfig` rows | One config per disposition; one step per channel/target. |
| `destination` | `intake_data.destination` (new sub-object) | New FE type, no migration. |
| `launch` | `intake_data.launch` (new sub-object) | Slug validated against other `intake_data.launch.slug` values in workspace. |
| `branchProvenance` | Stored in `intake_data.ascDraft.generated.branchProvenance` | Read by review surface and Explainer; never read by runtime. |
| `unresolved[]` | Stored in `intake_data.ascDraft.unresolved` | Gates publish. |

---

## 4. Reuse vs new front-end types

### Reuse as-is
- `CampaignIntakeData`, `DispositionEmailConfig`, `CampaignConnector`, `CampaignDepartment` (single-department default in v1).
- `CampaignFlowContent`, `FlowStep`, `FlowOption`, `FlowRule`, `FlowOutputMapping`, `NotificationTriggerConfig`, `OutcomeDispositionConfig`, `EscalationTriggerConfig`.
- Existing hooks: `useCampaignSetup`, `useCampaignFlow`, `useGuideVersions`, `useCampaignPublishConfig`, `useDispositions`, `useNotifications`, `useFormCampaignAssignments`.
- Existing screens: `CampaignIntakePage` (manual fallback), `ScriptBuilderPage` (handoff target), canonical flow builder (handoff target).

### New front-end types (no schema changes)
- `AscDraft`, `AscWizardInput`, `AscCallerReason`, `AscBranchHint`.
- `AscGenerated`, `AscGuideDraft`, `AscOutcomeDraft`, `AscNotificationDraft`.
- `AscDestination`, `AscLaunch`.
- `AscBranchProvenance`, `AscConfidence`, `AscUnresolvedItem`, `AscForkRecord`.

### New front-end modules (proposed, not built yet)
- `src/lib/asc/draftSchema.ts` — Zod schema + reducer `wizardInputToDraft`.
- `src/lib/asc/reduceToCanonical.ts` — pure `AscGenerated -> { intake, flow, notifications, dispositions }`.
- `src/lib/asc/validateLaunchSlug.ts` — uniqueness + format checks.
- `src/lib/asc/branchProvenance.ts` — provenance tagging helpers.
- `src/hooks/useAscDraft.ts` — read/write `intake_data.ascDraft` via `useCampaignSetup`.
- `src/hooks/useAscGeneration.ts` — invokes generation edge function (Phase 3 contract).

---

## 5. Editable-after-generation policy

| Section | Editable in review? | Forks to canonical builder? |
| --- | --- | --- |
| Business / purpose summary | Yes (inline) | No |
| Guide content | Yes (inline rich text) | Yes — handoff to guide builder forks the section |
| Flow steps & branches | Yes (limited: rename, reorder, dismiss) | Yes — handoff to flow builder forks the section |
| Outcomes / dispositions | Yes (table) | No |
| Notification rules | Yes (table) | No |
| Destination | Yes (always editable, including post-publish) | No |
| Launch slug | Yes until first publish; previous slugs preserved after | No |
| Branch provenance | Read-only metadata; user can mark an inferred branch as user_stated to reclassify | No |

**Draft-only-until-review:** nothing produced by the Drafter is written to canonical surfaces until the user clicks **Approve & save as draft** or **Publish** on the review screen. Until then, all generated content lives entirely inside `intake_data.ascDraft.generated`.

---

## 6. Agent experience preview (review-surface contract)

The review screen includes a **live agent preview** that:
- Reads `AscGenerated.flowDraft` and renders it through the *existing* canonical runner component (`FlowPanel` + caller-history-free shell) in a sandboxed mode.
- Reads `AscDestination` and shows the exact "open" action the agent will see, including deep-link template resolution against a sample ANI.
- Reads `AscLaunch.resolvedUrl` and renders a copyable URL preview.
- Does not write any session state; the preview runner uses a memory-only session store.

No new runner is built. The preview is a thin wrapper that mounts the canonical runner against an in-memory draft.

---

## 7. Branch origin tracking

Every generated `FlowStep` of type `question_branch`, `escalation_trigger`, or `outcome_disposition` MUST have a corresponding entry in `AscGenerated.branchProvenance[stepId]`:

- `user_stated` — directly derived from an `AscCallerReason.branching[]` entry or explicit user answer. High confidence.
- `inferred_best_practice` — the AI added this branch from preset/skin-level best practice (e.g. "always offer voicemail after-hours"). Medium confidence; expandable rationale in review.
- `unresolved_recommendation` — the AI is uncertain and is asking the user to confirm. Surfaces as an unresolved item; blocks publish unless dismissed or resolved.

The review surface badges each branch with its origin and lets the user reclassify `inferred_best_practice` → `user_stated` after review (acceptance), or delete it.

---

## 8. Versioning and publish boundaries

- **Draft writes** target `campaign_setups.intake_data.ascDraft` only. No version row created.
- **Approve & save as draft** writes the reduced canonical outputs into `CampaignIntakeData` fields and creates a *new* `guide_versions` row for the campaign-flow sentinel guide (`schemaVersion: 1`), marked `is_published = false`. The ASC draft transitions to `state: 'generated'`.
- **Publish** reuses the existing campaign publish path; the ASC draft transitions to `state: 'published'` and `intake_data.launch.editableUntilPublish` flips to false.
- **Fork to canonical builder** creates an `AscForkRecord` and marks the relevant section read-only in ASC review. Subsequent edits live in the canonical builder and `guide_versions` history; ASC does not attempt to merge them back.

No new version schema, no new publish path, no new RLS.

---

## 9. Integration with existing assistant infrastructure

- Reuses the existing `generate-script` edge function pattern (Lovable AI Gateway via `@/integrations/supabase`) for the Drafter role.
- A new edge function `asc-interview` (proposed for Phase 3, not built here) handles adaptive question generation per step; the existing assistant prompt registry under `prompts/` gets new entries `asc-interviewer.txt`, `asc-drafter.txt`, `asc-explainer.txt`.
- Reuses `useWorkspaceAi` hooks for conversation persistence during the interview (each draft has at most one persisted conversation, keyed by `ascDraft.id`).
- Knowledge sources from `useWorkspaceKnowledgeSources` are passed through as Drafter context when enabled.

---

## 10. Deferred schema ideas (do NOT implement in v1)

These are noted so future phases can recognise the boundary:

| Idea | Why deferred | Proposed phase |
| --- | --- | --- |
| Dedicated `asc_drafts` table with proper RLS, status enum, and history | Co-locating with `campaign_setups.intake_data` is sufficient for v1 and avoids migration risk | V2 hardening |
| `campaign_launch_slugs` uniqueness table with DB constraint | V1 enforces uniqueness in the validator + edge-function check; race is acceptable for single-author drafts | V2 |
| `campaign_destinations` first-class table | V1 carries the sub-object on `intake_data`; promotion only if destination logic grows beyond three kinds | V2/V3 |
| `flow_branch_provenance` table | Co-locating in `intake_data.ascDraft` keeps the runtime untouched | V2 if we want cross-campaign analytics on AI-vs-human branch retention |
| Multi-author draft locking | Single-author v1 makes this unnecessary | V2 |

---

## 11. Risks of overloading existing types

- **`CampaignIntakeData` is already large.** Adding `launch`, `destination`, and `ascDraft` sub-objects keeps it as the single JSON carrier, but raises the bar for keeping `CampaignIntakePage` and the reducer in sync. Mitigation: schema-validate `intake_data` on read in `useCampaignSetup` with a Zod parser that allows unknown keys but typechecks the known ones.
- **`CampaignFlowContent` already supports branching and rules.** Risk is the Drafter producing flows with rule combinations the canonical runner has not been stress-tested on. Mitigation: the Drafter is constrained (Phase 3) to a documented subset of `FlowRule.action` types — `show_step`, `jump_to`, `enable_escalation`, `enable_notification` only in v1.
- **Disposition writes are three-place** (`newDispositions`, `dispositionEmailConfigs`, `outcome_disposition.allowedOutcomes`). Risk of drift. Mitigation: a single reducer `reduceOutcomesToCanonical()` is the only writer; review surface reads from the same source.
- **Skin coupling.** ASC must work when no skin is set. Mitigation: the `general` skin pack (already shipped in the Vertical Skin System) is the fallback for tone and preset seeding.

---

## 12. Implementation recommendation (order)

This is the order Phases 5–8 should follow; nothing here is being built in Phase 2.

1. **Types + reducer** — land `AscDraft` types, Zod schema, `wizardInputToDraft`, `reduceToCanonical`, slug validator. Unit-tested in isolation. (Phase 5.)
2. **Wizard shell + chooser route + business/purpose/reasons steps** — drives `AscWizardInput`. Persists to `intake_data.ascDraft`. No AI yet; placeholder Drafter returns a deterministic skeleton. (Phase 5.)
3. **Adaptive interview** — wire `asc-interview` edge function + interviewer prompt; gap-finder runs after each step. (Phase 6.)
4. **Drafter** — `asc-drafter` edge function produces `AscGenerated` including branch provenance and confidence; review surface lights up. (Phase 7.)
5. **Review + fork + agent preview + publish** — review tabs, agent-experience preview, fork records, publish gating on unresolved blockers. (Phase 8.)
6. **Launch-readiness, analytics, observability, UAT** — folded into the broader rollout plan. (Phase 9.)

---

**End of Phase 2 deliverable.** Awaiting approval before producing the Phase 3 AI orchestration design (roles, prompt stack, validation strategy, confidence/review strategy, first implementation scope).
