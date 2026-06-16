# Vertical Skin System — Rollout Plan

Status: Phase 0 (documentation-only).
Companion to: `docs/vertical-skin-architecture.md`.
Rule: each phase ends with a written report and an approval gate before the next phase starts.

This document is the operational plan. It freezes file targets, risks, and
verification gates so reviewers can compare each phase's PR against the
contract.

---

## 0. Audit evidence (verbatim from Phase 0 audit)

### 0.1 Token infrastructure that already exists

- `tailwind.config.ts`
  - Dark mode strategy: `["class"]`.
  - Font families: `sans: Inter, system-ui`; `mono: JetBrains Mono, monospace`.
  - Semantic color aliases backed by `hsl(var(--*))`: `border`, `input`, `ring`,
    `background`, `foreground`, `primary` (+ foreground), `secondary` (+ fg),
    `destructive` (+ fg), `muted` (+ fg), `accent` (+ fg), `popover` (+ fg),
    `card` (+ fg).
  - Status aliases: `success`, `warning`, `info` (each with foreground variant).
  - Sidebar tokens: 8 (`sidebar-background`, `-foreground`, `-primary`,
    `-primary-foreground`, `-accent`, `-accent-foreground`, `-border`, `-ring`).
  - Node tokens: 12 (`node-start`, `-question`, `-action`, `-condition`, `-end`,
    `-content`, `-data`, `-logic`, `-integration`, `-call`, `-ai`, `-flow`).
  - Radius: `lg: var(--radius)`, `md: calc(var(--radius) - 2px)`,
    `sm: calc(var(--radius) - 4px)`.
  - Custom shadow scale: none.
- `src/index.css`
  - `:root` light theme defines surface, text, primary (`199 89% 48%`),
    secondary, muted, accent, border/input, radius (`0.5rem`), status
    (`success 142 76% 36%`, `warning 38 92% 50%`, `destructive 0 84% 60%`,
    `info 199 89% 48%`) plus foregrounds, extended status (`syncing`,
    `pending-review`, `disconnected`), 8 sidebar variables, 5 chart variables
    (`--chart-1`..`-5`), 12 node variables, and a layout `--header-offset: 72px`.
  - `.dark` mirrors the same set with darker HSLs; node variables unchanged
    across themes.
- No `ThemeProvider`, `useTheme`, `next-themes`, or skin context exists outside
  `src/components/ui/sonner.tsx` (Sonner's own internal hook).
- shadcn/ui primitives in `src/components/ui/` consume the semantic tokens
  correctly; no hardcoded colors there.

### 0.2 Hardcoded design debt (ripgrep totals, excluding `src/components/ui/`)

| Pattern | Total occurrences |
| --- | ---: |
| `bg-destructive` (semantic — safe) | 99 |
| `bg-amber-*` | 22 |
| `bg-emerald-*` | 17 |
| `text-white` | 16 |
| `text-blue-*` | 11 |
| `bg-blue-*` | 9 |
| `bg-red-*` | 4 |
| `bg-gray-*` | 2 |
| `text-gray-*` | 1 |
| `bg-cyan-*` | 1 |
| `text-cyan-*` | 1 |
| `bg-black` | 1 |
| `text-black`, `text-slate-*`, `bg-slate-*`, `bg-white` | 0 |

Hex literals in `src/**/*.{ts,tsx,css}`: ~9 total. Inline `style={{ }}`
usages: ~22, mostly tree-editor SVG canvas.

Hotspot files (combined raw-color usage, top 10):

1. `src/components/legal-connect/ReliabilityPanel.tsx` — `bg-destructive` ×10
2. `src/pages/admin/LegalConnectPage.tsx` — `bg-destructive` ×6
3. `src/pages/admin/DomainDetailPage.tsx` — `bg-destructive` ×5 + hex + inline
4. `src/components/tree-editor/flow/CustomNode.tsx` — `bg-emerald-*` ×3, `text-white` ×2
5. `src/components/call-runner/FlowPanel.tsx` — `bg-amber-*` ×2, `bg-destructive`
6. `src/components/dev-guide/CallLifecycleFlowchart.tsx` — `bg-blue-*` ×2, `bg-emerald-*` ×2, `bg-amber-*` ×2
7. `src/pages/admin/DomainsPage.tsx` — `bg-destructive` ×4
8. `src/components/tree-editor/ScriptTester.tsx` — `bg-blue-*` ×4, `bg-amber-*` ×1
9. `src/components/tree-editor/flow/CustomEdge.tsx` — `bg-emerald-*`, `bg-amber-*`, 6 inline `style` props
10. `src/components/legal-connect/PilotApprovalPanel.tsx` — `bg-destructive` ×3

### 0.3 Branding model that already exists

- `organizations` table: scalar `brand_name`, `brand_logo_url`,
  `brand_primary_color`, `brand_from_email`, `brand_reply_to` plus JSONB
  `integration_configs` (today nullable, unused for branding).
- `partners` table: same scalar `brand_*` shape per hand-typed alias in
  `src/types/database.ts`; auto-gen types expose only `integration_configs` JSONB.
- `five9_domains.workflow_settings.branding` JSONB carries
  `{ logo_url, primary_color, company_name }` for per-domain overrides.
- `WhiteLabelPartnerSelector` already renders previews from `brand_*` scalars.
- No CSS-variable injection of any brand color happens at runtime today.

### 0.4 Workspace plumbing

- `WorkspaceContext` (`src/contexts/WorkspaceContext.tsx`) exposes
  `organizationId`, the bridge to org-level config. No JSONB column on
  `workspaces`. No skin field anywhere.

### 0.5 Existing "vertical" notion

- `src/lib/campaign-flow/templates.ts` and
  `src/lib/workspace-guide/templates.ts` already use a
  `vertical: "generic" | "legal"` discriminator. `generic` will be remapped to
  `general` during Phase 5 binding work.
- `src/lib/legal-connect/` is the only live vertical content layer.

---

## 1. Config carrier decision (locked)

Skin and overrides live in JSONB on existing tables. No schema/RLS/generated-type
changes.

| Layer | Carrier | Required |
| --- | --- | --- |
| Organization | `organizations.integration_configs.theme` | Yes (primary) |
| Partner | `partners.integration_configs.theme` | Optional (secondary) |

Shape (identical at both layers):

```jsonc
{
  "skin_id": "legal",
  "overrides": {
    "brand_name": "Acme Legal",
    "logo_url": "https://cdn.example.com/acme.svg",
    "tokens": {
      "interactive": { "primary": "199 89% 48%", "accent": "172 66% 50%" }
    },
    "typography": { "sans": "Inter, system-ui, sans-serif" },
    "density": "comfortable"
  }
}
```

---

## 2. Override precedence (locked)

```
BASE_THEME
  ← selected skin (from organization.integration_configs.theme.skin_id,
                   fallback "general")
  ← partner.integration_configs.theme.overrides            (optional)
  ← organization.integration_configs.theme.overrides       (required carrier)
  ← runtime mode adjustments                               (future)
= ResolvedTheme
```

Lowest priority first, highest priority last. Organization overrides win against
partner overrides. Runtime adjustments (e.g. user dark toggle) sit on top of
both. This default is system-wide and not configurable per skin.

---

## 3. Phase-by-phase plan

### Phase 1 — Core token foundation

Goal: introduce the token contract and resolver primitives without changing UI.

Files to add (representative):

- `src/lib/theme/types.ts` — `ThemeTokens`, `DeepPartial<ThemeTokens>`.
- `src/lib/theme/baseTheme.ts` — `BASE_THEME` extracted from current `:root`.
- `src/lib/theme/resolver.ts` — `resolveTheme(base, skin, partner, org, runtime)`.
- `src/lib/theme/cssVars.ts` — `toCssVars(theme)` mapping to record of
  `--token` strings; `applyCssVars(record, target)`.
- `src/lib/theme/index.ts` — public surface.
- `src/test/theme/baseTheme.test.ts` — snapshot of base tokens.
- `src/test/theme/resolver.test.ts` — deep-merge + precedence smoke.

Files to read but not yet modify: `src/index.css`, `tailwind.config.ts`.

Risks:

- Drift between `BASE_THEME` and `src/index.css` would surface as visual diffs.
  Mitigation: snapshot test compares to a frozen copy of the current values.
- Type churn from rich token shape. Mitigation: ship a focused `ThemeTokens` type
  that mirrors current variables exactly.

Verification gate:

- `bunx vitest run src/test/theme` green.
- `BASE_THEME` snapshot matches current `:root` HSLs byte-for-byte.
- No file under `src/components/`, `src/pages/`, or `src/shells/` modified.

### Phase 2 — Skin registry + 10 theme packs

Files to add:

- `src/lib/skins/types.ts` — `VerticalSkinId`, `SkinDefinition`.
- `src/lib/skins/registry.ts` — `SKIN_REGISTRY`, `getSkin`, `listSkins`.
- `src/lib/skins/packs/general.ts` (neutral fallback, equal to BASE).
- `src/lib/skins/packs/legal.ts`
- `src/lib/skins/packs/medical.ts`
- `src/lib/skins/packs/financial.ts`
- `src/lib/skins/packs/property_management.ts`
- `src/lib/skins/packs/professional_services.ts`
- `src/lib/skins/packs/home_services.ts`
- `src/lib/skins/packs/ecommerce.ts`
- `src/lib/skins/packs/insurance.ts`
- `src/lib/skins/packs/education.ts`
- `src/test/skins/registry.test.ts` — completeness, fallback, determinism.

Risks:

- Subjective token choices per vertical. Mitigation: each pack starts as a small
  delta from BASE (primary, accent, maybe one status hue). No typography or
  density changes in Phase 2 unless trivially safe.
- Accidental component breakage from overly aggressive overrides. Mitigation:
  token deltas are bounded to `interactive` + optional `chart` groups in this
  phase.

Verification gate:

- All 10 IDs return a valid `SkinDefinition`.
- `getSkin("nonsense")` → `general`.
- Snapshot of resolved theme per skin matches its expected token delta.

### Phase 3 — Workspace/provider override model

Files to add or extend:

- `src/hooks/useResolvedSkin.ts` — reads org (+optional partner)
  `integration_configs.theme`, calls resolver, returns `ResolvedTheme` + meta.
- `src/lib/skins/storage.ts` — pure read/write helpers over the JSONB shape;
  validates schema with zod; tolerates malformed values.
- `src/contexts/WorkspaceContext.tsx` — extend selected value with
  `skinId`, `resolvedSkin` (optional cache), no breaking change.
- `src/hooks/useOrganizations.ts` — include `integration_configs` in select.
- `src/test/skins/storage.test.ts` — shape validation, fallback on malformed.
- `src/test/skins/precedence.test.ts` — locked precedence asserted explicitly.

Risks:

- Hidden coupling between scalar `brand_*` columns and any consumer that
  expects a hex string. Mitigation: do not mutate scalars in Phase 3; only
  read JSONB. Phase 6 UI is the first writer.
- Partner-org config conflicts surprising operators. Mitigation: the resolver
  returns a `meta` object listing which layers contributed which keys; surfaced
  by the admin UI in Phase 6.

Verification gate:

- Round-trip write→read of a sample org config via Supabase client returns the
  same JSONB shape.
- `useResolvedSkin` returns `general` for an org with no theme config.
- No generated-type changes.

### Phase 4 — Theme consumption across core surfaces

Provider mount + targeted hardcoded-color removals from the Phase 0 hotspot
list (full list duplicated in `vertical-skin-architecture.md` §13). The 18-file
target set covers the call runner, legal-connect panels, dev-guide flowchart,
tree-editor, and script-builder nodes.

Files to add:

- `src/lib/theme/SkinProvider.tsx` — mounts once at app root, writes CSS vars
  on `<html>`, sets `data-skin`.
- `src/lib/theme/EmbedSkinProvider.tsx` — standalone provider for `/embed/...`.
- Tests in `src/test/regressions/` covering: runner under each skin smoke,
  embed inherits skin, publish/embed/transfer/external-resources unchanged.

Files to modify (in order of priority — see architecture §13):

1. `src/App.tsx`
2. `src/contexts/WorkspaceContext.tsx`
3. `src/shells/WorkspaceShell.tsx`
4. `src/pages/embed/EmbedCampaignRunnerPage.tsx`
5. `src/components/legal-connect/ReliabilityPanel.tsx`
6. `src/pages/admin/LegalConnectPage.tsx`
7. `src/pages/admin/DomainDetailPage.tsx`
8. `src/pages/admin/DomainsPage.tsx`
9. `src/components/call-runner/FlowPanel.tsx`
10. `src/components/call-runner/GuidePanel.tsx`
11. `src/components/call-runner/CopilotPanel.tsx`
12. `src/components/call-runner/SessionHeader.tsx`
13. `src/components/dev-guide/CallLifecycleFlowchart.tsx`
14. `src/components/tree-editor/flow/CustomNode.tsx`
15. `src/components/tree-editor/flow/CustomEdge.tsx`
16. `src/components/tree-editor/ScriptTester.tsx`
17. `src/components/legal-connect/PilotApprovalPanel.tsx`
18. `src/components/script-builder/StartNode.tsx`
19. `src/components/script-builder/EndNode.tsx`
20. `src/components/script-builder/QuestionNode.tsx`
21. `src/components/script-builder/ActionNode.tsx`
22. `src/components/script-builder/LinkNode.tsx`
23. `src/pages/admin/PartnerOverviewPage.tsx`
24. `src/components/campaigns/WhiteLabelPartnerSelector.tsx`
25. `src/hooks/useOrganizations.ts`
26. `src/lib/campaign-flow/templates.ts`
27. `src/lib/workspace-guide/templates.ts`

Risks:

- Tree-editor canvas (CustomNode/CustomEdge) inline SVG colors. Mitigation:
  keep `--node-*` var bindings; replace only the raw class strings and inline
  fallbacks. If high-risk, defer the canvas-only edits to Phase 7.
- Embed read path requires either anon SELECT on a JSONB slice or a small
  edge function. Decide during Phase 4 design and document in this file.
- Email digest renderer untouched in this phase; keep using legacy scalars.

Verification gate:

- All listed files use semantic tokens; no `bg-amber-*`, `bg-emerald-*`,
  `bg-blue-*`, `text-blue-*`, `bg-red-*`, `text-white` remain in `src/`
  outside `src/components/ui/`.
- Runner, embed runner, and admin shell all reflect the configured skin in
  manual QA and in smoke tests.
- Publish/embed flow, transfer-directory, external-resources tests pass.

### Phase 5 — Skin-aware starter packs + copy presets

Files to add:

- `src/lib/skins/starterPacks.ts` — `getStarterPacks(id)`.
- `src/lib/skins/copyPresets.ts` — `CopyPreset`, `getCopyPreset(id)`.
- `src/test/skins/starterPacks.test.ts` — deterministic lookup + fallback.
- `src/test/skins/copyPresets.test.ts` — lookup + fallback.

Files to modify:

- `src/lib/campaign-flow/templates.ts` — expose `vertical` as `VerticalSkinId`
  via mapping (`generic → general`).
- `src/lib/workspace-guide/templates.ts` — same remap.

Risks:

- Existing campaigns with `vertical: "generic"` must not break. Mitigation:
  reads of legacy strings normalize via a small adapter; writes use the new
  `VerticalSkinId`.
- Copy presets are content; risk is editorial, not technical. Mitigation:
  Phase 5 ships only the bindings; content lives in existing factories.

Verification gate:

- `getStarterPacks("legal")` returns deterministic IDs.
- `getStarterPacks("nonsense")` falls back to `general`.
- No data corruption in existing template lists.

### Phase 6 — Admin skin selector + preview UX

Files to add or extend:

- `src/pages/admin/SettingsPage.tsx` — add a Branding/Skin section.
- `src/components/admin/skin/SkinPicker.tsx` — selector, preview chips, save.
- `src/components/admin/skin/SkinPreview.tsx` — live preview pane showing a
  miniature shell + runner stub under the chosen skin.
- `src/components/admin/skin/OverrideForm.tsx` — supported brand overrides
  (primary, accent, logo, brand_name; optional typography/density).
- `src/test/admin/skin/SkinPicker.test.tsx` — select → save → reflect.
- `src/test/admin/skin/SkinPreview.test.tsx` — preview updates on selection.

Risks:

- UI confusion between scalar `brand_*` columns and JSONB overrides.
  Mitigation: in Phase 6, the form writes both where the scalar exists.
- Preview can drift from real product. Mitigation: preview re-uses real
  shell components in a constrained container under a forced
  `<SkinProvider>`.

Verification gate:

- Admin can choose, preview, and persist a skin.
- Resolved theme updates without page reload.
- No publish/embed regressions.

### Phase 7 — Polish, regression cleanup, docs finalization

Work:

- Sweep `src/` for any remaining raw color classes introduced after Phase 4.
- Consolidate any duplicated theme logic introduced incrementally.
- Add automated contrast checks for the 10 skins.
- Finalize `vertical-skin-architecture.md` and `vertical-skin-rollout-plan.md`
  and add `docs/vertical-skin-runbook.md` (per the prompt).

Files to add:

- `docs/vertical-skin-runbook.md` — operational guide:
  - how to add a new skin
  - how to assign a skin to a workspace
  - how starter-pack mapping works
  - how branding overrides layer
  - troubleshooting and fallback behavior
- `src/test/theme/contrast.test.ts` — automated WCAG AA assertions.

Verification gate:

- Full regression suite green.
- Contrast tests green for all 10 skins.
- Docs final and cross-linked.

End-state report wording:

> Vertical skin system is now implemented across Fabric59 as a tokenized,
> multi-theme, workspace-aware foundation with 10 first-class skins.

---

## 4. Cross-phase rules

- No phase mixes scope. The current phase's PR cannot include the next phase's
  files.
- No component forks per vertical. Shared components consume resolved tokens.
- Prefer registries over conditionals. Skins, starter packs, and copy presets
  are mapped, never branched in component code.
- Preserve compatibility. Publish/embed, transfer-directory, external-resource,
  and runner behavior must remain intact.
- Semantic tokens only. Components refer to purpose, not raw values.
- `general` is always the safe fallback.
- Every phase ends with a report and an approval gate.

---

## 5. Phase 0 verification (this phase)

- [x] `docs/vertical-skin-architecture.md` added.
- [x] `docs/vertical-skin-rollout-plan.md` added.
- [x] 10 canonical skin IDs documented exactly:
      `legal`, `medical`, `financial`, `property_management`,
      `professional_services`, `home_services`, `ecommerce`,
      `general`, `insurance`, `education`.
- [x] `general` documented as the neutral fallback.
- [x] Config carrier documented as `organizations.integration_configs.theme`
      with `partners.integration_configs.theme` as optional secondary.
- [x] Override precedence explicitly documented:
      `BASE_THEME ← skin ← partner overrides ← organization overrides ← runtime`.
- [x] Phase 4 candidate surface list included (27 files prioritized).
- [x] No runtime, schema, RLS, generated-type, component, or test changes.
