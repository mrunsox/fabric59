# Vertical Skin System — Runbook

Status: Phase 7 complete. The skin system is the production theming layer.
Companions: `vertical-skin-architecture.md`, `vertical-skin-rollout-plan.md`.

This runbook is the operational guide. It covers how to assign skins, how
overrides layer, how starter packs and copy presets are bound to skins, how
to add a new skin, and how to troubleshoot.

---

## 1. Quick reference

| Concern | Where it lives |
| --- | --- |
| Canonical skin IDs | `src/lib/theme/types.ts` (`SkinId` union) |
| Skin packs (token overrides) | `src/lib/skins/packs/<id>.ts` |
| Skin registry | `src/lib/skins/themeRegistry.ts` |
| Base theme tokens | `src/lib/theme/baseTheme.ts` |
| Resolver (deep merge + precedence) | `src/lib/theme/themeResolver.ts` |
| CSS variable injection | `src/lib/theme/cssVars.ts` |
| App provider mount | `src/lib/skins/SkinProvider.tsx` (mounted in `src/App.tsx`) |
| Embed provider mount | `src/lib/skins/SkinProvider.tsx` → `EmbedSkinProvider` (mounted in `src/pages/embed/EmbedCampaignRunnerPage.tsx`) |
| Org config carrier | `organizations.integration_configs.theme` (JSONB) |
| Partner config carrier (optional) | `partners.integration_configs.theme` (JSONB) |
| Org config read/write hook | `src/hooks/useOrganizationThemeConfig.ts` |
| Starter pack bindings | `src/lib/skins/starterPacks.ts` |
| Copy presets | `src/lib/skins/copyPresets.ts` |
| Admin UI | `src/components/settings/AppearanceSection.tsx` (in `src/pages/admin/SettingsPage.tsx`) |

The ten canonical skin IDs are: `legal`, `medical`, `financial`,
`property_management`, `professional_services`, `home_services`,
`ecommerce`, `general`, `insurance`, `education`.

`general` is the silent fallback. Any unknown, missing, or invalid skin ID
resolves to `general`.

---

## 2. Assigning or changing a skin for an organization

Two paths, both ultimately writing to
`organizations.integration_configs.theme`.

### 2.1 Admin UI (preferred)

1. Sign in as an organization admin.
2. Go to **Admin → Settings → Appearance**.
3. Pick a skin from the dropdown. A live preview shows resolved color
   swatches plus the starter packs and copy preset the skin will bind.
4. Optionally edit brand name, logo URL, and a primary color override
   (HSL triplet, e.g. `199 89% 48%`).
5. Save. The change takes effect on next provider mount; no rebuild needed.

### 2.2 Programmatic

```ts
import { useUpdateOrganizationThemeConfig } from "@/hooks/useOrganizationThemeConfig";

const mutate = useUpdateOrganizationThemeConfig(orgId);
await mutate.mutateAsync({
  skin_id: "legal",
  overrides: {
    brand_name: "Acme Legal",
    logo_url: "https://cdn.example.com/acme.svg",
    tokens: {
      light: { colors: { primary: "222 60% 28%" } },
    },
  },
});
```

The hook preserves all other keys in `integration_configs`.

---

## 3. Override precedence

Lowest priority → highest priority:

```
BASE_THEME
  ← selected skin pack
  ← partner.integration_configs.theme.overrides   (optional)
  ← organization.integration_configs.theme.overrides
  ← runtime mode adjustments                       (reserved)
= ResolvedTheme
```

Rules:

- Org overrides always win against partner overrides.
- Partner overrides always win against the skin pack default.
- Unknown HSL or unknown token keys are dropped silently; the rest of the
  override branch still applies.
- An unknown `skin_id` resolves to `general` without throwing.
- `brand_name`, `logo_url`, `density`, `typography` and color overrides
  are all stored together under `integration_configs.theme.overrides`.

---

## 4. Starter packs and copy presets per skin

Each skin pack declares:

- `starterPacks`: IDs for `guide`, `campaign`, `transferDirectory`,
  `externalResources`, `outcomes`. These resolve through the maps in
  `src/lib/skins/starterPacks.ts`. Unknown mappings fall back to `generic`
  templates.
- `copyPresetId`: ID into `src/lib/skins/copyPresets.ts`. Each preset
  exposes `callerNoun`, `accountNoun`, `greetings`, `callOpeners`, and
  `transferLines`.

Resolution is deterministic and side-effect-free. Consumers should call:

```ts
import { resolveGuideTemplateForSkin, resolveCampaignTemplateForSkin } from "@/lib/skins/starterPacks";
import { getCopyPreset } from "@/lib/skins/copyPresets";
```

Never branch on `skinId` inside components — always go through these
resolvers.

---

## 5. Adding a new skin (the 11th)

1. **Extend the union.** Add the new ID to `SkinId` in
   `src/lib/theme/types.ts`.
2. **Create the pack** at `src/lib/skins/packs/<new_id>.ts`. Start by
   copying `general.ts`, then add token overrides in `light` and `dark`.
   Use `buildSkinTokens(overrides)` for the materialised token set.
3. **Register it.** Add the import + registry entry in
   `src/lib/skins/themeRegistry.ts` and to `ALL_SKIN_IDS` in the
   declared order.
4. **Bind starter packs and copy preset.** Add entries in
   `src/lib/skins/starterPacks.ts` and `src/lib/skins/copyPresets.ts`
   (or leave them blank to inherit `general`).
5. **Update tests.** Add the new ID to the `CANONICAL_IDS` array in
   `src/lib/skins/__tests__/skinRegistry.test.ts`. The contrast test
   in `src/lib/skins/__tests__/contrast.test.ts` will automatically
   pick it up via `ALL_SKIN_IDS`.
6. **Run the suite.** `bunx vitest` must stay green. The contrast test
   will fail-fast if the new pack has unreadable token pairs.

No component edits, no schema edits, no provider edits.

---

## 6. Accessibility / contrast thresholds (enforced)

`src/lib/skins/__tests__/contrast.test.ts` enforces, for every skin in
both light and dark modes:

| Pair | Minimum ratio |
| --- | --- |
| `background` / `foreground` | 4.5 (WCAG AA body text) |
| `card` / `cardForeground` | 4.5 |
| `primary` / `primaryForeground` | 2.5 (usable floor for saturated UI surfaces) |
| `destructive` / `destructiveForeground` | 2.5 |

Plus the lightweight sanity check in
`src/lib/skins/__tests__/skinRegistry.test.ts` enforces a 25-point
lightness delta on the same pairs.

If a new skin pack regresses below either floor, CI fails before merge.

---

## 7. Troubleshooting

### 7.1 Theme is not applying

- Confirm the route is wrapped by `<SkinProvider>` (authenticated app) or
  `<EmbedSkinProvider>` (`/embed/...`). Both providers write CSS vars onto
  `document.documentElement` and set `data-skin="<id>"`.
- Open devtools, inspect `<html>`. You should see `data-skin` and CSS
  variables such as `--primary` and `--background`.
- Confirm the org row really stores `integration_configs.theme.skin_id`.
  An empty/null value resolves to `general` (the visual baseline).

### 7.2 Embed looks different from the authenticated app

- The embed runtime resolves its theme through
  `supabase/functions/campaign-embed-resolve`, which returns both the
  org and partner branding sources (`integration_configs.theme` plus
  legacy scalars). Confirm the function payload contains those sources.
- Precedence is identical to the app: base ← skin ← partner ← org. If
  only the embed differs, the most common cause is the partner branding
  layer not being passed to the embed payload.

### 7.3 Low contrast / unreadable text after changing primary

- Override HSL triplets only via the appearance form. The validator
  rejects anything that does not match `^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$`.
- If the chosen primary is very dark or very light, also set a matching
  `primaryForeground` override. Run `bunx vitest run src/lib/skins/__tests__/contrast.test.ts`
  locally to confirm thresholds.

### 7.4 Starter pack picked is "wrong"

- Starter packs are bound on the skin, not on the org. Changing the skin
  changes the bindings. Per-org overrides for starter packs are out of
  scope for the skin system — that lives in the existing template
  selection surfaces.

### 7.5 Tests fail after adding a skin

- `skinRegistry.test.ts` fails if `ALL_SKIN_IDS` does not include the
  new ID, or if the pack does not define every color token in both modes.
- `contrast.test.ts` fails if any enforced pair drops below the
  thresholds in §6. Either pick a different hue/lightness, or pair the
  new `primary` with a hand-tuned `primaryForeground`.

---

## 8. What the skin system does **not** do

- It does not theme marketing pages — those stay on the platform brand.
- It does not own email rendering. Email continues to use the legacy
  scalar `brand_*` columns until a dedicated migration phase.
- It does not expose per-user themes. Skin is per-organization.
- It does not provide a dark-mode toggle; the runtime mode slot is
  reserved for a future phase.
