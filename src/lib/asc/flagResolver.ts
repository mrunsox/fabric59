/**
 * ASC wizard feature flag — Slice 1 scaffolding.
 *
 * Source of truth (in order):
 *   1. localStorage override: `fabric59.features.ascWizard.enabled` = "1"
 *      (developer/QA escape hatch while the real config plumbing lands)
 *   2. Default: false
 *
 * Slice 1 deliberately does NOT read the merged workspace/partner/org config.
 * That wiring is scheduled for Slice 2 alongside the AI orchestration
 * boundary; until then the flag is off-by-default everywhere so the
 * canonical manual flow is the only campaign-creation path in production.
 */
const STORAGE_KEY = "fabric59.features.ascWizard.enabled";

export interface AscFlagResolution {
  enabled: boolean;
  source: "localStorage" | "default";
}

export function resolveAscWizardFlag(
  _workspaceId: string | undefined,
  opts?: { storage?: Pick<Storage, "getItem"> },
): AscFlagResolution {
  const storage =
    opts?.storage ??
    (typeof window !== "undefined" ? window.localStorage : undefined);
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw === "1" || raw === "true") {
      return { enabled: true, source: "localStorage" };
    }
  } catch {
    // Access to storage can throw in some sandboxed contexts; fall through.
  }
  return { enabled: false, source: "default" };
}

export function useAscWizardFlag(
  workspaceId: string | undefined,
): AscFlagResolution {
  // No subscription needed — flag changes require a hard reload in Slice 1.
  return resolveAscWizardFlag(workspaceId);
}

export const ASC_FLAG_STORAGE_KEY = STORAGE_KEY;
