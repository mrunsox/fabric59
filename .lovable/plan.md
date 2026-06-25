# Knowledge Base: Campaign-scoped cards

Restructure the **Business Brain → Knowledge Base** tab so sources are organized by campaign instead of a single flat table. Each campaign gets its own card; clicking a card opens that campaign's isolated Knowledge Base where the user adds/manages docs scoped only to it.

## UX

**Knowledge Base index (default view)**
- Grid of cards, one per workspace campaign + a "Workspace-wide" card (for sources with no `campaign_id`).
- Each card shows: campaign name, source count, last-updated timestamp, small status badge (e.g. "3 ready / 1 processing"), and a `→` affordance.
- Header keeps "Add source" button (opens dialog with no pre-selected campaign).
- Remove the existing "All campaigns / Workspace-wide / per-campaign" filter dropdown and the flat sources table — replaced by the card grid.

**Campaign drill-in**
- Clicking a card switches the panel to a per-campaign view (in-page state, no route change needed; back button at top).
- Shows: campaign name as heading, "Add source" button pre-scoped to that campaign, and the sources table filtered to `campaign_id === <thisCampaign>` (or `null` for the Workspace-wide card).
- "Add source" dialog opens with the campaign locked (campaign select hidden or disabled showing the current campaign).

**Auto-card on campaign creation**
- No DB work needed: cards are derived live from `useWorkspaceCampaigns()`. Any new campaign created elsewhere in the app instantly shows up as an empty card in Knowledge Base (0 sources). Confirmed `bb_sources.campaign_id` already exists.

## Technical

Files touched (UI only, no schema changes):

- **`src/pages/workspace/brain/KnowledgeBinPage.tsx`**
  - Add local state `selectedCampaignId: string | null | undefined` (`undefined` = index view, `null` = Workspace-wide, string = specific campaign).
  - When `undefined`: render new `<KnowledgeBaseCampaignGrid />` component. Compute per-campaign source counts and latest `updated_at` from existing `sources` array grouped by `campaign_id`.
  - When defined: render existing sources table filtered to that campaign + a back button ("← All campaigns"). Reuse current row rendering.
  - Drop the campaign filter `Select` from the header (replaced by cards).
  - Pass `defaultCampaignId` and `lockCampaign` props to `AddSourceDialog` when adding from inside a drilled-in card.

- **`AddSourceDialog`** (same file, ~line 230+)
  - Accept new optional `lockCampaign?: boolean`. When true, hide the campaign `Select` and render a read-only line "Attaching to: <campaign name>".

- **New component (inline or extracted)**: `KnowledgeBaseCampaignGrid`
  - Props: `campaigns`, `sources`, `onSelect(campaignId | null)`.
  - Renders Workspace-wide card first, then one card per campaign sorted by name.
  - Card markup uses existing shadcn `Card`/`CardHeader`/`CardContent` for consistency with the rest of the workspace.

No edge-function, hook, or migration changes — `useBusinessBrain` / `useBbSources` / `useWorkspaceCampaigns` already provide everything needed.

## Out of scope
- Renaming routes or DB tables.
- Bulk reassigning existing sources between campaigns.
- Suggested Facts / Approved Knowledge / Search / Governance / Health tabs (Knowledge Base tab only).
