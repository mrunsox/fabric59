/**
 * Vertical Skin System — Phase 6
 * Admin skin selector + preview.
 *
 * Lets an organization admin choose one of the 10 canonical vertical
 * skins, preview its colors / starter packs / copy preset without
 * saving, and edit the supported branding overrides (brand name, logo
 * URL, primary color, density) that persist through the Phase 3 carrier
 * on `organizations.integration_configs.theme`.
 */

import { useEffect, useMemo, useState } from "react";
import { Loader2, Palette, RotateCcw, Save, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  useOrganizationThemeConfig,
  useUpdateOrganizationThemeConfig,
} from "@/hooks/useOrganizationThemeConfig";
import {
  ALL_SKIN_IDS,
  FALLBACK_SKIN_ID,
  getSkin,
  listSkins,
} from "@/lib/skins/themeRegistry";
import { resolveTheme } from "@/lib/theme/themeResolver";
import { getCopyPresetForSkin } from "@/lib/skins/copyPresets";
import {
  resolveCampaignTemplateForSkin,
  resolveGuideTemplateForSkin,
  getStarterPacks,
} from "@/lib/skins/starterPacks";
import type { SkinId, ThemeModeOverrides } from "@/lib/theme/types";
import type { BrandingOverrides, ThemeConfig } from "@/lib/skins/themeConfig";
import type { SkinDensity } from "@/lib/skins/types";

const HSL_RE = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;

interface FormState {
  skinId: SkinId;
  brandName: string;
  logoUrl: string;
  primary: string; // HSL triplet, mode-agnostic (applied to both light/dark)
  density: SkinDensity | "inherit";
}

function configToForm(config: ThemeConfig): FormState {
  const primary =
    config.branding.tokens?.light?.colors?.primary ??
    config.branding.tokens?.dark?.colors?.primary ??
    "";
  return {
    skinId: config.skinId,
    brandName: config.branding.brandName ?? "",
    logoUrl: config.branding.logoUrl ?? "",
    primary,
    density: config.branding.density ?? "inherit",
  };
}

function formToConfig(form: FormState): ThemeConfig {
  const branding: BrandingOverrides = {};
  if (form.brandName.trim()) branding.brandName = form.brandName.trim();
  if (form.logoUrl.trim()) branding.logoUrl = form.logoUrl.trim();
  if (form.density !== "inherit") branding.density = form.density;
  if (form.primary.trim() && HSL_RE.test(form.primary.trim())) {
    const triplet = form.primary.trim();
    const tokens: ThemeModeOverrides = {
      light: { colors: { primary: triplet } },
      dark: { colors: { primary: triplet } },
    };
    branding.tokens = tokens;
  }
  return { skinId: form.skinId, branding };
}

function formsEqual(a: FormState, b: FormState) {
  return (
    a.skinId === b.skinId &&
    a.brandName === b.brandName &&
    a.logoUrl === b.logoUrl &&
    a.primary === b.primary &&
    a.density === b.density
  );
}

export default function AppearanceSection() {
  const { config, isLoading } = useOrganizationThemeConfig();
  const updateMutation = useUpdateOrganizationThemeConfig();

  const initialForm = useMemo(() => configToForm(config), [config]);
  const [form, setForm] = useState<FormState>(initialForm);

  // Re-hydrate form when the persisted config changes (e.g. after save).
  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const dirty = !formsEqual(form, initialForm);

  // Live preview — resolves the same Phase 1 resolver path, but reads
  // unsaved form state. No DOM mutation.
  const previewConfig = useMemo(() => formToConfig(form), [form]);
  const previewTheme = useMemo(
    () =>
      resolveTheme({
        skinId: previewConfig.skinId,
        organizationOverrides: previewConfig.branding.tokens,
      }),
    [previewConfig],
  );
  const previewSkin = useMemo(() => getSkin(previewConfig.skinId), [previewConfig.skinId]);
  const previewCopyPreset = useMemo(
    () => getCopyPresetForSkin(previewConfig.skinId),
    [previewConfig.skinId],
  );
  const previewStarter = useMemo(
    () => getStarterPacks(previewConfig.skinId),
    [previewConfig.skinId],
  );
  const previewGuide = useMemo(
    () => resolveGuideTemplateForSkin(previewConfig.skinId),
    [previewConfig.skinId],
  );
  const previewCampaign = useMemo(
    () => resolveCampaignTemplateForSkin(previewConfig.skinId),
    [previewConfig.skinId],
  );

  const swatch = (name: string, token: string) => (
    <div className="flex flex-col items-start gap-1">
      <div
        data-testid={`swatch-${name}`}
        className="h-10 w-full rounded-md border"
        style={{ backgroundColor: `hsl(${token})` }}
      />
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{name}</span>
    </div>
  );

  const onSave = () => {
    if (!dirty) return;
    updateMutation.mutate(previewConfig);
  };

  const onReset = () => setForm(initialForm);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const lightTokens = previewTheme.tokens.light.colors;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Vertical Skin</CardTitle>
              <CardDescription>
                Choose a vertical skin to drive theme colors, starter packs, and copy presets. The{" "}
                <strong>general</strong> skin is the default fallback.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="skin-select">Skin</Label>
            <Select
              value={form.skinId}
              onValueChange={(v) => setForm((f) => ({ ...f, skinId: v as SkinId }))}
            >
              <SelectTrigger id="skin-select" aria-label="Skin">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {listSkins().map((skin) => (
                  <SelectItem key={skin.id} value={skin.id}>
                    <div className="flex items-center gap-2">
                      <span>{skin.label}</span>
                      {skin.id === FALLBACK_SKIN_ID && (
                        <Badge variant="secondary" className="text-[10px]">
                          fallback
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {previewSkin.description && (
              <p className="text-xs text-muted-foreground">{previewSkin.description}</p>
            )}
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="brand-name">Brand name</Label>
              <Input
                id="brand-name"
                value={form.brandName}
                onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
                placeholder="Your organization name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logo-url">Logo URL</Label>
              <Input
                id="logo-url"
                value={form.logoUrl}
                onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="primary-color">Primary color (HSL triplet)</Label>
              <Input
                id="primary-color"
                value={form.primary}
                onChange={(e) => setForm((f) => ({ ...f, primary: e.target.value }))}
                placeholder="e.g. 199 89% 48%"
              />
              <p className="text-[11px] text-muted-foreground">
                Format: <code>H S% L%</code>. Leave blank to inherit from the skin.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="density">Density</Label>
              <Select
                value={form.density}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, density: v as FormState["density"] }))
                }
              >
                <SelectTrigger id="density" aria-label="Density">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Inherit from skin</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={onSave} disabled={!dirty || updateMutation.isPending} className="gap-2">
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save changes
            </Button>
            <Button
              variant="outline"
              onClick={onReset}
              disabled={!dirty || updateMutation.isPending}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            {dirty && (
              <Badge variant="outline" className="ml-1">
                Unsaved changes
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="appearance-preview">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Live preview of the selected skin, starter packs, and copy preset. Nothing is
                persisted until you save.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Resolved palette ({previewSkin.label})
            </Label>
            <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {swatch("primary", lightTokens.primary)}
              {swatch("accent", lightTokens.accent)}
              {swatch("secondary", lightTokens.secondary)}
              {swatch("background", lightTokens.background)}
              {swatch("muted", lightTokens.muted)}
              {swatch("destructive", lightTokens.destructive)}
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Starter packs
              </Label>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Guide</dt>
                  <dd data-testid="preview-guide" className="font-medium">{previewGuide.name}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Campaign</dt>
                  <dd data-testid="preview-campaign" className="font-medium">{previewCampaign.name}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Guide preset id</dt>
                  <dd className="font-mono text-xs">{previewStarter.guide ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Campaign preset id</dt>
                  <dd className="font-mono text-xs">{previewStarter.campaign ?? "—"}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-md border p-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Copy preset
              </Label>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Preset</dt>
                  <dd data-testid="preview-copy-preset" className="font-medium">
                    {previewCopyPreset.label}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Caller noun</dt>
                  <dd>{previewCopyPreset.callerNoun}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Account noun</dt>
                  <dd>{previewCopyPreset.accountNoun}</dd>
                </div>
                <div className="pt-1 text-xs text-muted-foreground">{previewCopyPreset.tone}</div>
              </dl>
            </div>
          </div>

          <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
            Inheritance: <strong>general</strong> is the deterministic fallback. Any skin tokens you
            don't override are inherited from the selected skin pack, which itself layers over the
            base theme. Starter packs and copy presets are determined by the selected skin — they
            are not directly editable here.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { ALL_SKIN_IDS };
