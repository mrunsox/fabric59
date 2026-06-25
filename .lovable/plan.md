## Phase 11 — Streamlined Build IA + Workspace Guide AI Assembler

Two tracks. Track A is the IA cleanup approved last turn. Track B wires the existing `generate-script` AI into the Workspace Guide so you can drop a doc and get a full call program out the other end.

---

## Track A — IA alignment (unchanged from approved plan)

Model: `Workspace → Client → Campaign(s)`. Forms live inside a Campaign.

1. **Assureway becomes real** — `SeedAssurewayButton` creates a `tenants` (Client) row "Assureway" + one Campaign "Assureway – Main reception" under it. Drop the word "sample".
2. **Sidebar Build group reordered** — `Clients → Campaigns → Workspace guide → Library`. Library demoted visually.
3. **Forms moved into Campaign detail** as a tab; top-level Forms route redirects to a campaign picker.
4. **Settings absorbs** workspace-wide knobs currently buried in Campaign Builder (Five9 domain, branding, default callback policy).
5. **Empty-state copy** explains what each surface is and what creates a row in it.
6. **Setup checklist** swaps "First campaign created" for "First client added" + "First campaign created under that client".
7. **Tests** for sidebar order, Forms redirect, campaign-requires-client.

---

## Track B — Workspace Guide as the AI assembler

### What you'll be able to do

Open Workspace Guide → "Assemble from document" → drop a PDF/DOCX/TXT (or paste text) → AI produces a draft that fills:

- Guide sections (greeting, business overview, hours, escalation, FAQs, etc.)
- **Dispositions** (labels + routing + post-call action per disposition)
- **Call flow** decision tree (greeting → identify caller type → branch by reason → resolution)
- **ANI / DNIS routing rules** (numbers → campaign/skill mapping inferred from the doc)
- **Variables** the script references (caller name, matter type, etc.)
- **Post-call automations** suggested per disposition (email template, CRM push, callback)

Everything lands as a **draft** the user reviews, edits, and publishes. Nothing auto-applies.

### Where it lives

- Workspace Guide page gets two new actions next to "Apply template":
  - **Assemble from document** (primary CTA when guide is empty)
  - **Re-assemble** (when guide already has content — opens a diff view)
- A right-side drawer hosts the assembly run: upload area → status stream → section-by-section accept/reject.

### Plumbing reuse

| Need | Reuse |
|---|---|
| Document parse | `document--parse_document` capability already in the platform; for in-app use, mirror logic from `supabase/functions/parse-blueprint-doc/index.ts` |
| LLM call | Existing `supabase/functions/generate-script/index.ts` — extend, do not fork |
| Frontend trigger | Pattern from `src/components/script-builder/AIScriptGenerator.tsx` — port to a workspace-shell component `WorkspaceGuideAssembler.tsx` |
| Guide write surface | Existing Workspace Guide draft store (sections + version history already supported) |
| Disposition / flow writes | Existing `useDispositions`, `useCampaignFlow`, `useCampaignScripts` hooks |

### New edge function: `assemble-workspace-program`

One function, server-side, orchestrates the whole assembly so the client only uploads once:

```text
input:  { workspaceId, sourceText, sourceFilename? }
steps:
  1. (if upload) parse-blueprint-doc → normalized text
  2. Lovable AI Gateway, google/gemini-3-flash-preview, structured Output schema:
       {
         guideSections[], dispositions[], callFlow{nodes,edges},
         routing{ani[],dnis[]}, variables[], postCallSuggestions[]
       }
  3. Persist as a single "assembly_draft" row (reuses campaign_builder_drafts table — no schema change; payload kind = "workspace_assembly")
  4. Return draft_id
client polls/streams draft_id → renders the diff drawer
```

- Uses AI SDK `Output.object` with a deliberately compact schema (per `ai-sdk-agent-patterns` guidance on Gemini state limits).
- System prompt extracted to `prompts/workspace-assembler.txt`; reuses tone and structure of `prompts/script-generator.txt`.
- `verify_jwt` true, scoped to workspace member.

### UI

- `src/components/workspace/guide/WorkspaceGuideAssembler.tsx` — drawer with upload, progress, and per-section apply.
- Section diff view: existing value (left) | proposed value (right) | Accept / Skip.
- "Apply all" button at the bottom; writes accepted pieces to Guide, Dispositions, Campaign flow draft.
- Surfaces 429/402 errors per AI gateway guidance.

### Test plan (end-to-end, after wiring)

Single happy-path test you can run live:

1. Click **Assemble from document** in Workspace Guide.
2. Upload a one-page intake brief (we'll keep a sample at `docs/sample-intake.md`).
3. Verify the drawer shows: ≥5 Guide sections, ≥3 Dispositions, a 1-screen Call Flow, at least one DNIS rule, at least one variable.
4. Accept all → confirm Guide draft has sections; Dispositions list shows new rows; Campaign flow draft visible in Campaigns.
5. Publish Guide v1; re-run cockpit smoke test (existing Phase 9 telemetry) to confirm the agent runner reads the new guide.

### Out of scope for Phase 11 (still deferred)

- DB renames (`tenants` → `clients`).
- Auto-applying assembly output without user review.
- Multi-doc assembly in one pass (one source per run; users can re-run).
- Telephony provisioning of the DNIS/ANI rules — assembler produces routing config only; pushing to Five9 stays manual.
- Auto-scoring, new dashboards, Phase 10 observation window stays open in parallel.

---

## Suggested implementation order

1. Track A steps 1–3 (the visible IA win) → ship.
2. Track B `assemble-workspace-program` edge function + `WorkspaceGuideAssembler` drawer (text-paste only first) → ship.
3. Track B document upload + diff/accept UI → ship.
4. Track A steps 4–7 (polish) + full live test.

Each step gets a regression test and a row in the Phase 10 Fixes table.
