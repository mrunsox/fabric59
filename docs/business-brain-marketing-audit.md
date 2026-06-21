# Business Brain — Marketing Messaging Audit (Phase 3, Slice 1)

Status: **Draft for approval — no `.tsx` files edited yet.**

This document is deliverable 1 of Phase 3. It captures the proposed copy
rewrite for every public marketing page in scope, with a compact
**claim → shipped surface** mapping so every public statement is traceable
to a real product surface that already ships in the Business Brain refresh
(Phases 1 and 2).

Positioning rule applied throughout: **Business Brain is the governed
knowledge layer inside Fabric59.** Not a separate brand. Not a separate
product. When public copy names it, the framing is always
"Fabric59 ships with Business Brain — the governed knowledge layer that…"

Buyer-first rule applied throughout: every page leads with the outcome a
buyer gets, then names the surface. Internal phrases like
"outcome write-back" are translated to public language
("send the result into the firm's case file", "push the answer to the
right system") unless a technical surface specifically benefits from the
implementation wording.

---

## 0. Shared claim vocabulary (used across all pages)

| Public phrase | Shipped surface(s) it refers to |
|---|---|
| "Governed knowledge layer" | `bb_*` schema + `/w/:wid/brain` shell (Knowledge Bin, Suggested Facts, Approved Knowledge, Governance, Health) |
| "Add what you know — paste, upload, CSV, FAQ" | Knowledge Bin tabs: Paste, Upload, Team CSV, FAQ (`useBbIngestCsv`, `useBbIngestFaq`, `bb-ingest` edge function) |
| "Review before it goes live" | Suggested Facts page + `bb-approve-fact` (explicit reviewer merge, no silent dedupe) |
| "One approved source of truth per client" | Approved Knowledge page + duplicate-key merge UX |
| "Surface the right answer on the call" | ASC Suggestion Tray (`AscSidePanel.tsx`, `BbSuggestionTray.tsx`) + live Assist panel (`BbAssistPanel.tsx`) |
| "Catch gaps, conflicts, and stale facts" | Governance page + gap / conflict / stale-fact drawers |
| "See coverage and freshness at a glance" | Brain Health page (`BrainStatCard` grid, coverage block) |
| "Send the result into the right system" | Existing disposition + integration pipeline (Five9, Clio, MyCase, Slack, Zapier, Make) — unchanged from Phase H |

Anything **not** in this table does not appear as a Brain claim in public
copy. No retrieval-grade search promise. No "AI writes your scripts" claim.
No transcript ingestion. No auto-approve.

---

## 1. Home (`src/pages/marketing/HomePage.tsx`)

### Before (today, abbreviated)

- Hero eyebrow: "Multi-tenant guided call workspace · For outsourced answering & virtual receptionists"
- Hero title: "Five9 handles the call. **Fabric59 is the brain.**"
- Hero lede: "Your client's system of record holds the outcome. Fabric59 is the multi-tenant guided call workspace platform for outsourced answering services and virtual receptionist providers — multi-vertical by design, with a deep legal practice management pack shipping first."
- Section 2 ("Every call, structured"): four-question card grid (Who called / What happened / What was the outcome / Who needs to be notified).
- Section 3 ("Operating motions"): five motions list, unchanged.
- Section 4 ("Built for"): four personas, surface-agnostic copy.
- Section 5 ("Integrations posture"): Five9, legal pack, Slack, Zapier/Make.
- Section 6 ("Proof"): one anonymized quote.
- Section 7 ("Questions"): six FAQs, none name Business Brain.

### After (proposed)

- **Hero eyebrow:** "Guided call workspace for outsourced answering & virtual receptionist providers"
- **Hero title:** unchanged — "Five9 handles the call. **Fabric59 is the brain.**"
- **Hero lede:** "Fabric59 gives your team one workspace per client, the answers your agents need on every call, and a clean handoff into the system the client already runs. Powered by Business Brain — the governed knowledge layer that learns what each client wants you to say, and keeps it accurate."
- **Section 2 — replace "Every call, structured" with "How Business Brain helps your team":** four cards, buyer-value first, surface named second.
  - "Capture what each client wants" — *Paste it, upload it, drop in a CSV, or import an FAQ. Your team turns documents into facts your agents can actually use.*
  - "Review before it goes live" — *Suggested answers wait for a human approval. Nothing reaches a live call until a supervisor signs off.*
  - "Right answer, right call" — *Approved knowledge shows up on screen the moment the call connects — tied to the client and the question being asked.*
  - "Keep it honest" — *Gaps, conflicts, and stale answers surface in one queue, so the brain stays current without anyone chasing it.*
- **Section 3 — Operating motions:** keep the five-motion list; tighten outcome lines so each names what the agent gets, not the plumbing. (Detailed motion rewrites in Solutions section below; Home just inherits the new strings.)
- **Section 4 — Personas:** keep four roles; each `jobs[]` gets one item that names what they do *inside* the product (see Personas page below).
- **Section 5 — Integrations posture:** unchanged factual content. Add one sentence at the end of the lede: "Every integration feeds the same Business Brain, so the answers your agents read and the records you write back stay in sync."
- **Section 6 — Proof:** unchanged.
- **Section 7 — FAQ:** keep six entries. Rewrite Q1, Q3, Q4 to name Business Brain in plain language. Add one new Q at position 4:
  - **Q (new):** "What does Business Brain actually do during a call?"
  - **A:** "It puts the approved answer for that client in front of the agent the moment the call connects, and follows the conversation as the agent moves through the guide. Supervisors curate the answers; agents see them, they do not write them."
- **CTA banner / hero CTAs:** unchanged.

### Rationale

The site already earns trust on "Five9-native, multi-tenant, legal pack live." It does not yet tell visitors *what the product feels like once they log in.* Naming Business Brain in plain buyer language closes that gap without inventing capability. The four-card "How Business Brain helps your team" block mirrors the order of the Brain tabs visitors will see on day one (Knowledge Bin → Suggested Facts → Approved Knowledge / Assist → Governance), so marketing and product narrate the same lifecycle.

### Claim → shipped surface mapping

| Home claim | Shipped surface |
|---|---|
| "Powered by Business Brain — the governed knowledge layer" | `/w/:wid/brain` shell + `bb_*` schema |
| "Paste it, upload it, drop in a CSV, or import an FAQ" | Knowledge Bin tabs (Paste, Upload, Team CSV, FAQ) |
| "Suggested answers wait for a human approval" | Suggested Facts page + `bb-approve-fact` explicit merge |
| "Approved knowledge shows up on screen the moment the call connects" | `BbAssistPanel.tsx` + `AscSidePanel.tsx` + pre-call ANI lookup |
| "Gaps, conflicts, and stale answers surface in one queue" | Governance page + `BbGapDrawer`, `BbConflictDrawer`, `BbStaleFactDrawer` |
| "Every integration feeds the same Business Brain" | Existing CSV / FAQ / paste / upload ingestion + downstream adapters unchanged |
| FAQ Q4 "puts the approved answer in front of the agent" | `BbAssistPanel.tsx` (Knowledge Assist host) |

---

## 2. Solutions (`src/pages/marketing/SolutionsPage.tsx`)

### Before

- Hero: "Built for outsourced answering services and virtual receptionists" / lede about Five9, Fabric59 brain, system of record.
- "Four questions" spine: Who called / What happened / Outcome / Notification.
- Legal answering services section: three capability cards (legal intake, case management write-back, notify the attorney).
- Virtual receptionists section: four capability cards (multi-tenant, coverage, per-client SoR, ops visibility) + vertical chip strip.
- Five motion blocks, each with eyebrow / title / body / bullets / `surfacedIn` strip.

### After (proposed)

- **Hero subhead:** "Five9 handles the call. Fabric59 runs the workspace. Business Brain — the governed knowledge layer inside Fabric59 — gives your agents the right answer for each client, every time."
- **Section "Four questions" → keep title, refresh card bodies** so each card names the Brain surface that answers it, in buyer language:
  - Who called? → "Caller matched to the right client workspace before screen pop, with prior history and account context already on screen."
  - What happened? — *adds:* "Agents follow a per-client guide and read from approved knowledge — not free-text notes."
  - What was the outcome? — unchanged.
  - Who needs to be notified? — unchanged.
- **Legal answering services section:** keep three cards. Update the first card body to: "Per-firm intake guides backed by Business Brain — conflict-check prompts, matter context, and the firm's approved language all surface inline." Other two cards unchanged.
- **Virtual receptionists section:** keep four cards. Add a fifth card (still inside the existing 4-up grid layout — accepts 5 cells without component changes):
  - **"Per-client knowledge, governed centrally"** — *Each client's answers live in their own Business Brain. Supervisors curate; agents read. Gaps and stale answers surface in one queue across every account you run.*
- **Five motion blocks:** structure unchanged. Refresh `surfacedIn` lines so each mentions the Brain surface where relevant, in addition to the existing app surfaces:
  - Inbound intake → add "Brain · Approved Knowledge on screen pop"
  - QA and review → add "Brain · Governance (stale facts, gaps)"
  - System-of-record sync → unchanged
  - Outbound reactivation → unchanged
  - Monitoring and readiness → add "Brain · Health"
- **CTA banner:** unchanged.

### Rationale

Solutions is where buyers validate fit. Today it sells motions in the abstract. Naming Business Brain in the spine and tagging it onto the motions makes the buyer see *how* the motion holds together — without restructuring the page or inventing motions.

### Claim → shipped surface mapping

| Solutions claim | Shipped surface |
|---|---|
| "Governed knowledge layer inside Fabric59" | `/w/:wid/brain` shell |
| "Approved knowledge on screen pop" | `BbAssistPanel.tsx` + Approved Knowledge facts |
| "Agents read from approved knowledge — not free-text notes" | Approved Knowledge page + Assist panel |
| "Conflict-check prompts, matter context, approved language all surface inline" | Legal pack guides + Approved Knowledge facts |
| "Per-client knowledge, governed centrally" | Multi-workspace `bb_*` data + Governance page |
| "Gaps and stale answers surface in one queue across every account" | Governance page + gap / stale-fact queues |
| Motion `surfacedIn` Brain tags | Existing Approved Knowledge, Governance, Health pages |

---

## 3. Personas (`src/pages/marketing/PersonasPage.tsx`)

### Before

- Hero: "Built for the four roles that own a Five9 program."
- Four personas (Ops leader, Supervisor, Implementation/admin, Intake owner), each with three abstract `jobs[]` lines and a "Maps to <motion>" link.

### After (proposed)

- **Hero subhead:** "Fabric59 is opinionated about who runs guided calls across many clients. Each role lands in a workspace surface — and a slice of Business Brain — mapped to their day."
- **Persona job lists — replace exactly one bullet per persona** with a Brain-surface bullet (others unchanged):
  - **Operations leader** → replace bullet 3 with: "Watch coverage, freshness, and gaps across every client from one Business Brain Health view."
  - **Supervisor** → replace bullet 2 with: "Review suggested answers before they reach a live call, and resolve stale facts from the same queue."
  - **Implementation / admin** → replace bullet 2 with: "Load each client's knowledge into Business Brain — paste, upload, CSV, FAQ — and approve it once."
  - **Intake / service-ops owner** → replace bullet 3 with: "Approved Business Brain answers and per-disposition routing surface on screen pop, every call."
- **`motionLabel` and `motionHref`:** unchanged.
- **CTA banner:** unchanged.

### Rationale

Personas are currently surface-agnostic. Replacing one bullet per role with the Brain surface they actually live in (Health, Suggested Facts, Knowledge Bin, Assist) makes the page operational and gives each role a single page to land on after sign-in.

### Claim → shipped surface mapping

| Persona claim | Shipped surface |
|---|---|
| Ops leader → "coverage, freshness, gaps across every client from one Business Brain Health view" | `BrainHealthPage.tsx` |
| Supervisor → "review suggested answers… resolve stale facts from the same queue" | `SuggestedFactsPage.tsx` + `BbStaleFactDrawer.tsx` |
| Implementation → "load each client's knowledge… paste, upload, CSV, FAQ — and approve it once" | `KnowledgeBinPage.tsx` (4 tabs) + `ApprovedKnowledgePage.tsx` |
| Intake → "Approved Business Brain answers… surface on screen pop" | `BbAssistPanel.tsx` + Approved Knowledge |

---

## 4. Customers (`src/pages/marketing/CustomersPage.tsx`)

### Before

- Hero: "Real teams. Real workspaces. Real Five9." / design-partner lede.
- One anonymized ProofQuote.
- Three story cards (Legal intake / BPO operations / Platform partner) with `sector / headline / body / outcome`.

### After (proposed)

- **Hero subhead:** "Fabric59 is in active design-partner mode. The stories below describe how teams use Fabric59 today, including the Business Brain that ships inside it. No fabricated logos, no inflated metrics."
- **ProofQuote:** unchanged.
- **Story 1 (Legal intake) — body rewrite:** "First Fabric59 design partner running live MyCase intake. Agents work from a per-firm guide with Business Brain answers on screen — conflict prompts, matter context, the firm's own language. Outcomes route per disposition into the right matter, with telephony reconciliation against Five9 logs."
  - `outcome` line unchanged.
- **Story 2 (BPO operations) — body rewrite:** "Workspace-per-client isolation with row-level data separation, per-tenant rate limits, and tenant health replaced spreadsheet-driven client management. Business Brain gave supervisors one place to curate each client's answers and one Governance queue to keep them current."
  - `outcome` line unchanged.
- **Story 3 (Platform partner) — body rewrite:** "Design-partner flag, rollout status, GA readiness checklist, feedback drawer, and What's New release notes coordinate every pilot from kickoff through go-live. Business Brain Health gives the partner and the pilot team the same view of coverage and freshness."
  - `outcome` line unchanged.
- **CTA banner:** unchanged.

### Rationale

Customers page already does the hardest job — staying honest in design-partner mode. The rewrite only adds the Brain layer into stories where it is already true today; no new logos, no new metrics, no new stories.

### Claim → shipped surface mapping

| Customers claim | Shipped surface |
|---|---|
| "Per-firm guide with Business Brain answers on screen — conflict prompts, matter context, the firm's own language" | Legal pack guides + Approved Knowledge + Assist panel |
| "One place to curate each client's answers" | `KnowledgeBinPage.tsx` + `SuggestedFactsPage.tsx` |
| "One Governance queue to keep them current" | `BrainGovernancePage.tsx` + sub-sections |
| "Business Brain Health gives the partner and the pilot team the same view of coverage and freshness" | `BrainHealthPage.tsx` |

---

## 5. Pricing (`src/pages/marketing/PricingPage.tsx`)

### Before

- Hero: "Priced for providers, not for end clients." / lede about workspaces, agents, vertical packs.
- Three tiers (Starter operation, Growing provider, Network operator). Each with `features[]` array. No Brain mention.

### After (proposed)

- **Hero subhead:** "Fabric59 is purchased by outsourced answering services and virtual receptionist providers. Every tier includes Business Brain — the governed knowledge layer that powers your agents on every call. Tiers scale with workspaces, concurrent agents, and the vertical packs you need."
- **Tier features[] — add exactly one new line per tier, no other changes:**
  - **Starter operation** → append: `"Business Brain included — knowledge ingestion, review, approved answers, governance, health"`
  - **Growing provider** → append: `"Business Brain included across every workspace"`
  - **Network operator** → append: `"Business Brain included across every workspace and brand"`
- **Tier order, prices, cadences, highlight, CTAs, footnote:** all unchanged.
- **CTA banner:** unchanged.

### Rationale

Buyers should not have to infer what they get. One line per tier is enough. No pricing model changes, no feature bloat — the guardrail is enforced literally (exactly one line, identical surface naming).

### Claim → shipped surface mapping

| Pricing claim | Shipped surface |
|---|---|
| "Every tier includes Business Brain" | `/w/:wid/brain` shell available to every workspace (feature flag is per-workspace; pricing claim aligns with shipped default) |
| "knowledge ingestion, review, approved answers, governance, health" | Knowledge Bin / Suggested Facts / Approved Knowledge / Governance / Health pages |

---

## 6. Marketing header (`src/components/shells/marketing/CanonicalMarketingHeader.tsx`)

### Before / After

No copy changes proposed. Nav labels are driven by `MARKETING_NAV` and remain accurate. CTAs ("Sign in", "Start a pilot") unchanged. **No edit needed.**

### Rationale

The guardrail forbids route or nav-structure changes. The existing header is already on-brand and on-message.

---

## 7. Marketing footer (`src/components/shells/marketing/CanonicalMarketingFooter.tsx`)

### Before

- Brand blurb (lines 42–45): "Five9-native operational intelligence connecting telephony to CRM, workflow, QA, and downstream service systems."

### After (proposed)

- **Brand blurb:** "Fabric59 is the multi-tenant guided call workspace for outsourced answering and virtual receptionist providers. Business Brain — the governed knowledge layer inside Fabric59 — gives your agents the right answer for every client. Five9-native. Multi-vertical."
- **Resources list:** unchanged.
- **Company list:** unchanged.
- **Trust block copy:** unchanged.

### Rationale

The footer is the consistent product tagline across every public page. Updating it once aligns every page with the new positioning without touching layout or links.

---

## 8. SEO metadata (`src/seo/marketingMetadata.ts`)

### Before

- `CANONICAL_TAGLINE` = "The brain between Five9 and your client's system of record"
- `canonicalSiteDescription()` = long-form description with no Business Brain naming.
- `organizationLD.description` = "Multi-tenant operational-intelligence platform for Five9 contact centers and legal-intake operations."
- `productOverviewDescription()`, `integrationsIndexDescription()` = no Brain naming.

### After (proposed)

- **`CANONICAL_TAGLINE`:** unchanged. The metaphor still holds and is now reinforced by the new copy explicitly naming Business Brain.
- **`canonicalSiteDescription()`:** append one sentence at the end: "Fabric59 ships with Business Brain — the governed knowledge layer that turns each client's documents, FAQs, and team directories into approved answers your agents see on every call."
- **`organizationLD.description`:** update to: "Multi-tenant guided call workspace for outsourced answering services and virtual receptionist providers. Includes Business Brain, the governed knowledge layer that powers agent answers on every call."
- **`productOverviewDescription()`:** append: "Powered by Business Brain — paste, upload, CSV, or FAQ becomes approved knowledge your agents read on the call."
- **`integrationsIndexDescription()`:** unchanged (integration facts are out of scope per guardrails).
- **`softwareApplicationLD()`:** picks up the new `canonicalSiteDescription()` automatically — no change to the function.
- **`buildFaqLD()`:** unchanged (consumed by Home FAQ array, which gets the new Q4).

### Rationale

SEO/OG copy is the version every share, every preview, and every search snippet sees. Adding Business Brain language here is the highest-leverage place to anchor the new positioning without changing keys, schemas, or any consumer.

### Claim → shipped surface mapping

| Metadata claim | Shipped surface |
|---|---|
| "Governed knowledge layer that turns each client's documents, FAQs, and team directories into approved answers" | Knowledge Bin (Paste / Upload / Team CSV / FAQ) → Suggested Facts → Approved Knowledge |
| "Powers agent answers on every call" | `BbAssistPanel.tsx` + Approved Knowledge facts |

---

## 9. Out of scope (explicit)

- `src/pages/marketing/IntegrationsIndexPage.tsx` — integration facts unchanged per guardrail.
- `src/pages/TrustPage.tsx`, `src/pages/SecurityPage.tsx`, `src/pages/ResponsibleDisclosurePage.tsx`, privacy/terms pages — out of scope.
- `src/config/canonicalNav.ts` (nav structure / labels) — no edits.
- Marketing components under `src/components/marketing/**` — no structural or visual changes.
- `OUTLINE.md` and `.lovable/plan.md` will be updated **after** the page edits ship, not in this slice.

---

## Stop / approval gate

This document is the entire output of Slice 1.

**Next action requires explicit approval:** apply the per-page rewrites
above into the eight files listed (Home, Solutions, Personas, Customers,
Pricing, Footer, `marketingMetadata.ts`, and the new FAQ entry on Home).
No `.tsx` page file will be edited until that approval lands.
