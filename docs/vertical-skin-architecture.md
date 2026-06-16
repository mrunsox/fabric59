# Vertical Skin System — Architecture

Status: Phase 0 (architecture decision package, documentation-only).
Owner: Platform / Design Systems.
Scope: Fabric59 web app (internal admin, canonical runner, embed runner) and supporting edge functions that render branded surfaces (email digests, etc.).

This document defines the architecture that lets one shared Fabric59 product carry
ten first-class vertical "skins" without forking components, while still letting
workspaces/partners apply branding overrides on top.

It is the contract Phases 1–7 build against. Anything not specified here must be
proposed as an amendment before implementation.

---

## 1. Goals and non-goals

### Goals

- One product, one canonical runner, one embed runtime, one admin surface.
- A token-based, multi-theme architecture where vertical identity is data, not code.
- Ten first-class skin IDs registered up front; new skins added by registering a pack, never by editing components.
- Workspaces (via their organization, with optional partner layer) can pick a skin and apply branding overrides.
- The same skin and overrides are applied consistently to the internal app, the embed runner, and any other branded surface (where feasible).
- Zero schema, RLS, or generated-type changes. Reuse existing JSONB carriers.

### Non-goals

- Component forks per vertical. There are no `LegalRunner`, `MedicalRunner` components.
- Per-vertical `if (vertical === "X")` styling sprinkled through the UI.
- Dynamic per-user themes outside the org/partner/runtime axes.
- A full marketing-site rebrand engine. Marketing surfaces stay on the platform brand.

---

## 2. Canonical skin registry

The system supports exactly these ten first-class skin IDs in Phase 2:

```ts
export type VerticalSkinId =
  | "legal"
  | "medical"
  | "financial"
  | "property_management"
  | "professional_services"
  | "home_services"
  | "ecommerce"
  | "general"
  | "insurance"
  | "education";
```

- `general` is the neutral fallback. Unknown, missing, or invalid skin IDs resolve to `general`.
- The string `general_bpo` is not used anywhere in the new system. References found during audit must be migrated to `general` during Phase 4.
- IDs are stable and treated as a public contract; renaming an ID is a breaking change.

---

## 3. Token model

### 3.1 Token philosophy

- Semantic-only naming. Components refer to purpose (`primary`, `card`, `warning`), never raw colors (`cyan-500`, `slate-200`).
- HSL triplet strings (`"199 89% 48%"`) — matches the existing `src/index.css` convention so Tailwind's `hsl(var(--token))` consumption continues to work unchanged.
- One flat catalogue grouped by purpose. No nested objects in CSS-var output; nesting only exists in the TypeScript type for ergonomics.

### 3.2 Token groups (Phase 1 contract)

| Group | Tokens |
| --- | --- |
| Surface | `background`, `card`, `popover` |
| Text | `foreground`, `muted-foreground`, `card-foreground`, `popover-foreground`, `primary-foreground`, `secondary-foreground`, `accent-foreground`, `destructive-foreground` |
| Interactive | `primary`, `secondary`, `accent`, `muted`, `border`, `input`, `ring` |
| Status (semantic) | `success` + `success-foreground`, `warning` + `warning-foreground`, `destructive` + `destructive-foreground`, `info` + `info-foreground` |
| Status (extended) | `syncing`, `pending-review`, `disconnected` |
| Sidebar | `sidebar-background`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring` |
| Canvas / nodes | `node-start`, `node-question`, `node-action`, `node-condition`, `node-end`, `node-content`, `node-data`, `node-logic`, `node-integration`, `node-call`, `node-ai`, `node-flow` |
| Chart | `chart-1` … `chart-5` |
| Typography | `font-sans`, `font-mono` (CSS font-family stacks, not HSL) |
| Geometry | `radius` (rem), `density` (`comfortable` | `compact`, drives spacing scale), `header-offset` (px) |
| Elevation | `shadow-elevated` (CSS box-shadow string) |

This set is a strict superset of the variables already defined in
`src/index.css`. Phase 1 extracts the current `:root` values into a typed
`BASE_THEME` so the default app is byte-for-byte unchanged.

### 3.3 TypeScript contract (Phase 1 will land this verbatim)

```ts
export interface ThemeTokens {
  surface: { background: string; card: string; popover: string };
  text: {
    foreground: string;
    mutedForeground: string;
    cardForeground: string;
    popoverForeground: string;
    primaryForeground: string;
    secondaryForeground: string;
    accentForeground: string;
    destructiveForeground: string;
  };
  interactive: {
    primary: string; secondary: string; accent: string;
    muted: string; border: string; input: string; ring: string;
  };
  status: {
    success: string; successForeground: string;
    warning: string; warningForeground: string;
    destructive: string; destructiveForeground: string;
    info: string; infoForeground: string;
    syncing: string; pendingReview: string; disconnected: string;
  };
  sidebar: Record<
    | "background" | "foreground" | "primary" | "primaryForeground"
    | "accent" | "accentForeground" | "border" | "ring", string>;
  nodes: Record<
    | "start" | "question" | "action" | "condition" | "end"
    | "content" | "data" | "logic" | "integration"
    | "call" | "ai" | "flow", string>;
  chart: { c1: string; c2: string; c3: string; c4: string; c5: string };
  typography: { sans: string; mono: string };
  geometry: {
    radius: string;
    density: "comfortable" | "compact";
    headerOffset: string;
  };
  elevation: { shadowElevated: string };
}
```

A `Partial<DeepPartial<ThemeTokens>>` is the shape every skin and every override
declares. The resolver deep-merges and validates completeness before writing CSS.

---

## 4. Skin registry model

### 4.1 SkinDefinition

```ts
export interface SkinDefinition {
  id: VerticalSkinId;
  label: string;                       // human-readable
  description?: string;
  tokens: DeepPartial<ThemeTokens>;    // overrides on top of BASE_THEME
  typography?: { sans?: string; mono?: string };
  density?: "comfortable" | "compact";
  starterPacks: {
    guide?: string;
    campaign?: string;
    transferDirectory?: string;
    externalResources?: string;
    outcomes?: string;
  };
  copyPresetId?: string;
  brandHints?: {
    recommendedAccent?: string;
    suggestedLogo?: string;
    artDirection?: string;
  };
}
```

### 4.2 Registry shape

```ts
export const SKIN_REGISTRY: Record<VerticalSkinId, SkinDefinition>;
export function getSkin(id: string | null | undefined): SkinDefinition; // → general on miss
export function listSkins(): SkinDefinition[];                          // stable order
```

- Registry is a static object; no async lookup, no network at resolution time.
- `getSkin` always returns a valid `SkinDefinition`. There is no nullable return.
- Skin packs live at `src/lib/skins/packs/<id>.ts` and are re-exported by `src/lib/skins/registry.ts`.

---

## 5. Workspace / organization / partner override model

### 5.1 Config carrier

Skin selection and branding overrides live in JSONB on existing tables:

| Layer | Carrier | Required |
| --- | --- | --- |
| Organization | `organizations.integration_configs.theme` | yes (primary carrier) |
| Partner | `partners.integration_configs.theme` | optional (secondary carrier) |

Workspace itself has no JSONB column. Skin is resolved per workspace by walking up
to its organization (and optionally to the relevant partner). This avoids a
migration on `workspaces`.

### 5.2 JSONB shape (same at both layers)

```jsonc
// organizations.integration_configs.theme  /  partners.integration_configs.theme
{
  "skin_id": "legal",                  // VerticalSkinId | undefined → general
  "overrides": {
    "brand_name": "Acme Legal",
    "logo_url": "https://cdn.example.com/acme.svg",
    "tokens": {                        // DeepPartial<ThemeTokens>
      "interactive": { "primary": "199 89% 48%", "accent": "172 66% 50%" }
    },
    "typography": { "sans": "Inter, system-ui, sans-serif" },
    "density": "comfortable"
  }
}
```

Legacy scalar columns (`organizations.brand_name`, `brand_logo_url`,
`brand_primary_color`, `brand_from_email`, `brand_reply_to` and the
`partners.brand_*` equivalents) remain authoritative for email rendering. The
resolver mirrors `brand_primary_color` into `overrides.tokens.interactive.primary`
if and only if no JSONB-level override is set. Writing the new admin UI updates
both the JSONB and the legacy scalar where the scalar already exists, so
nothing breaks.

### 5.3 Override precedence (locked)

The final resolution order, lowest priority to highest, is:

```
BASE_THEME
  ← selected skin (from organization.integration_configs.theme.skin_id, fallback general)
  ← partner.integration_configs.theme.overrides            (optional)
  ← organization.integration_configs.theme.overrides       (required carrier)
  ← runtime mode adjustments                               (future: dark, density toggle)
= ResolvedTheme
```

Rationale: the organization is the top-level tenant and operator identity in
Fabric59 (`SaaS hierarchy: Organization > Partner > Client`). Partner branding is
secondary and intentionally overridable by the operator. Runtime adjustments
(e.g. user-toggled dark mode in a future phase) sit on top so they win against
all stored values.

This precedence is the system-wide default and is not configurable per skin.

### 5.4 Validation

- Unknown skin_id → `general` (silently, with `console.warn` in dev).
- Malformed `overrides.tokens` (wrong type, unknown group) → drop the offending
  branch only, keep the rest. Never throw at render time.
- HSL strings must match `/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/`. Otherwise dropped.

---

## 6. Theme resolution lifecycle

```
[ AuthContext / WorkspaceContext ]
        │
        ▼
+----------------------------------+
| useResolvedSkin(workspaceId?)    |   reads org (+partner) integration_configs.theme
+----------------------------------+
        │
        ▼
+----------------------------------+
| resolveTheme(base, skin, p, o)   |   deep-merge with locked precedence
+----------------------------------+
        │
        ▼
+----------------------------------+
| <SkinProvider>                   |   sets data-skin on <html>, injects CSS vars
+----------------------------------+
        │
        ▼
   document.documentElement.style.setProperty("--primary", "199 89% 48%")
   document.documentElement.style.setProperty("--background", "...")
   ... (all tokens)
        │
        ▼
   Tailwind utilities (`bg-primary`, `bg-card`, `border-border`, ...)
   automatically pick up the new CSS variables. No component changes needed.
```

### 6.1 Embed runner

`/embed/...` routes mount outside the authenticated app shell and outside
`WorkspaceContext`. A parallel lightweight `<EmbedSkinProvider>` resolves the
theme from a workspace/campaign identifier in the URL. The data source is the
same JSONB carrier; the loader is a small read-only fetch. RLS must allow either
anonymous read of the relevant JSONB slice or a dedicated edge function — to be
confirmed in Phase 4 design.

### 6.2 No runtime mode UI yet

The "runtime mode adjustments" slot is reserved. Phase 1–7 do not ship a dark
toggle or density picker. The slot exists so adding them later does not require
re-plumbing the resolver.

---

## 7. Starter-pack mapping model

Each skin can map to operational starter packs so onboarding picks the right
content without component code branching on `vertical`.

```ts
// src/lib/skins/starterPacks.ts
export interface StarterPackBindings {
  guide?: string;                  // → key in src/lib/workspace-guide/templates.ts
  campaign?: string;               // → key in src/lib/campaign-flow/templates.ts
  transferDirectory?: string;      // → key in src/components/transfer-directory
  externalResources?: string;      // → key in src/components/external-resources
  outcomes?: string;               // → key in disposition/outcome preset registry
}

export function getStarterPacks(id: VerticalSkinId): StarterPackBindings;
```

- The mapping registry is the single source of truth. Components never look up
  by `skin.id`; they call `getStarterPacks(skinId)`.
- Missing mappings fall back to `general`. Missing `general` mapping for a key
  is allowed (returns undefined) and consumers must handle gracefully.
- Phase 5 lands the mapping skeleton and wires it to existing template
  factories. Detailed per-vertical content lives in those factories, not here.

### 7.1 Copy presets

```ts
// src/lib/skins/copyPresets.ts
export interface CopyPreset {
  id: string;
  greetings?: string[];
  callOpeners?: string[];
  transferLines?: Record<string, string>;
}
export function getCopyPreset(id: string | undefined): CopyPreset | null;
```

Skins reference a `copyPresetId`. Consumers resolve through `getCopyPreset()`.

---

## 8. Consumption strategy

- Components stay shared. They use Tailwind semantic classes (`bg-card`,
  `text-foreground`, `border-border`, `bg-primary`, `bg-warning`, …) which already
  bind to CSS variables.
- The shell mounts `<SkinProvider>` once. Deep components do not import skin code.
- Vertical behavior moves into registries (starter packs, copy presets) not into
  conditional render paths.
- Hardcoded color classes (`bg-amber-*`, `bg-emerald-*`, `text-white`, raw
  hex literals, inline `style={{ color: '#xxx' }}`) are migrated to semantic
  tokens during Phase 4. Phase 0 enumerates the targets (see §13).

---

## 9. Testing strategy

Per phase, at minimum:

- **Tokens (Phase 1)**: snapshot of `BASE_THEME` matches current `:root` HSL
  values byte-for-byte; type-level test that every required token group is
  present; resolver merges partials without losing required keys.
- **Registry (Phase 2)**: all 10 IDs registered; `getSkin("nonsense")` returns
  `general`; deterministic order from `listSkins()`.
- **Overrides (Phase 3)**: precedence test asserting org beats partner beats
  skin beats base; malformed overrides dropped; round-trip read after write.
- **Consumption (Phase 4)**: smoke-render runner, embed runner, admin shell
  under each of the 10 skins via React Testing Library; no thrown errors;
  publish/embed/transfer-directory/external-resources flows intact.
- **Starter packs (Phase 5)**: `getStarterPacks(id)` deterministic per id;
  fallback to `general` for missing keys.
- **Admin UI (Phase 6)**: selection persists; preview updates; resolved theme
  changes after save.
- **Polish (Phase 7)**: contrast checks on `primary`/`background`,
  `foreground`/`background`, `destructive`/`destructive-foreground` for all
  10 skins meet WCAG AA for body text; regression suite green.

---

## 10. Extension strategy (adding the 11th skin)

1. Create `src/lib/skins/packs/<new_id>.ts` exporting a `SkinDefinition`.
2. Add `<new_id>` to the `VerticalSkinId` union in `src/lib/skins/types.ts`.
3. Register the pack in `src/lib/skins/registry.ts`.
4. Add a `getStarterPacks` entry if non-fallback behavior is needed.
5. Add a test row to the registry-completeness test.

Zero component changes are required. Zero schema changes are required.

---

## 11. Accessibility and contrast

- Every skin must meet WCAG AA (4.5:1) for body text against `background` and
  for `primary-foreground` against `primary`.
- Status tokens (`destructive`, `warning`, `success`) must remain visually
  distinct from `primary` after a skin is applied.
- Phase 7 introduces an automated contrast check that fails CI if a skin
  regresses below threshold.

---

## 12. Compatibility guarantees

- Publish/embed flow unchanged.
- Transfer-directory and external-resources behavior unchanged.
- Runner state machine, autosave, copilot, agent workspace behavior unchanged.
- Email rendering keeps reading legacy `brand_*` scalar columns until a future
  phase migrates them; the new JSONB carrier does not replace them in this
  rollout.

---

## 13. Phase 4 candidate migration targets (from audit)

This list freezes the Phase 4 scope. Numbers are ripgrep counts from the
Phase 0 audit (full evidence in `vertical-skin-rollout-plan.md`).

Priority 1 — provider mount and resolver wiring (no styling debt yet):

1. `src/App.tsx` — mount `<SkinProvider>` once at the route tree root.
2. `src/contexts/WorkspaceContext.tsx` — extend the resolved value with
   `skinId` and optionally cached overrides (read-through, no schema change).
3. `src/shells/WorkspaceShell.tsx` — ensure `<SkinProvider>` wraps the shell
   for all authenticated routes.
4. `src/pages/embed/EmbedCampaignRunnerPage.tsx` — standalone
   `<EmbedSkinProvider>` mount; fetch skin by workspace/campaign id.
5. `src/index.css` — keep file authoritative for fallback values; extract
   `:root` HSLs into `BASE_THEME` source of truth, leave file in place for
   first-paint defaults.

Priority 2 — hottest hardcoded-color files (already-token-aware components
nearby; mechanical replacements):

6. `src/components/legal-connect/ReliabilityPanel.tsx` — `bg-destructive` ×10.
7. `src/pages/admin/LegalConnectPage.tsx` — `bg-destructive` ×6.
8. `src/pages/admin/DomainDetailPage.tsx` — `bg-destructive` ×5 + hex + inline.
9. `src/pages/admin/DomainsPage.tsx` — `bg-destructive` ×4.
10. `src/components/call-runner/FlowPanel.tsx` — `bg-amber-*` ×2 +
    `bg-destructive`. Replace amber with `bg-warning`/`text-warning-foreground`.
11. `src/components/call-runner/GuidePanel.tsx` — audit; expected light touch.
12. `src/components/call-runner/CopilotPanel.tsx` — audit; expected light touch.
13. `src/components/call-runner/SessionHeader.tsx` — audit; expected light touch.
14. `src/components/dev-guide/CallLifecycleFlowchart.tsx` — `bg-blue-*` ×2,
    `bg-emerald-*` ×2, `bg-amber-*` ×2 → `node-*` / status tokens.
15. `src/components/tree-editor/flow/CustomNode.tsx` — `bg-emerald-*` ×3,
    `text-white` ×2, inline styles bound to `--node-*` (keep var bindings,
    drop raw classes).
16. `src/components/tree-editor/flow/CustomEdge.tsx` — 6 inline `style` props
    on SVG; bind to `hsl(var(--node-*))`.
17. `src/components/tree-editor/ScriptTester.tsx` — `bg-blue-*` ×4,
    `bg-amber-*` ×1.
18. `src/components/legal-connect/PilotApprovalPanel.tsx` — `bg-destructive` ×3.
19. `src/components/script-builder/StartNode.tsx` — `text-white`.
20. `src/components/script-builder/EndNode.tsx` — `text-white`.
21. `src/components/script-builder/QuestionNode.tsx` — `text-white`.
22. `src/components/script-builder/ActionNode.tsx` — `text-white`.
23. `src/components/script-builder/LinkNode.tsx` — `text-white`, `bg-red-*`.

Priority 3 — branding integration (no styling debt; integration work):

24. `src/pages/admin/PartnerOverviewPage.tsx` — wire inline
    `style={{ backgroundColor: partner.brand_primary_color }}` swatch through
    the skin resolver preview helper.
25. `src/components/campaigns/WhiteLabelPartnerSelector.tsx` — render preview
    via resolver instead of raw hex.
26. `src/hooks/useOrganizations.ts` — include `integration_configs` in the
    select so skin/overrides are available without an extra query.
27. `src/lib/campaign-flow/templates.ts` and
    `src/lib/workspace-guide/templates.ts` — expose existing
    `vertical: "generic" | "legal"` discriminator as `VerticalSkinId`
    (with `generic` mapped to `general`) so starter-pack lookup is uniform.

Phase 4 acceptance is met when:

- `<SkinProvider>` is mounted in app + embed.
- The 18 hardcoded-color files above are migrated to semantic tokens.
- No new occurrences of raw `bg-amber-*`, `bg-emerald-*`, `bg-blue-*`,
  `text-white` appear in `src/` outside `src/components/ui/`.

---

## 14. Open questions for later phases (not blocking)

- Embed read path: anon SELECT on a JSONB slice vs. a tiny edge function.
  Decide in Phase 4 design.
- Per-partner branding write UI vs. read-only inheritance. Decide in Phase 6.
- Email digest renderer adopting the same token catalogue. Out of scope
  through Phase 7; tracked separately.

---

## 15. Glossary

- **Skin**: a `SkinDefinition` keyed by `VerticalSkinId`. Bundles tokens,
  optional typography/density, and starter-pack/copy-preset bindings.
- **Override**: a `DeepPartial<ThemeTokens>` plus optional brand metadata
  stored on org or partner.
- **Resolved theme**: the final `ThemeTokens` after applying precedence.
- **Token**: a single semantic CSS variable (`--primary`, `--warning`, ...).
- **Starter pack**: a curated content bundle (guide, campaign, transfer
  directory, external resources, outcomes) selected by skin.
