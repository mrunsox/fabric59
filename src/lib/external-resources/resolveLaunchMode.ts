/**
 * Launch-mode resolver.
 *
 * Decides the concrete open mode for a resource given:
 *   - the resource's preferred openMode,
 *   - the surface (internal runner vs. embed/preview/kiosk),
 *   - viewport width hints,
 *   - resource kind (calendars/portals are typically poor iframe citizens).
 *
 * Always returns a deterministic, explainable result. Embed mode never honors
 * `replace_center` (the script must stay visible). When `iframe` is requested
 * for a kind that's reliably blocked in browsers (portals, sometimes documents),
 * we still attempt iframe first and rely on the runtime fallback handler — this
 * resolver does NOT make authoritative cross-origin frameability claims (see
 * docs/external-resource-workspace-architecture.md §G).
 */
import {
  resolveResourceUrl,
  type ResolvedUrl,
} from "./resolveParams";
import type {
  ExternalResource,
  LaunchRequest,
  LaunchResolution,
  ResourceEvaluationContext,
  ResourceOpenMode,
  ResourceWidth,
} from "./types";

const NARROW_VIEWPORT_PX = 720;

function pickWidth(resource: ExternalResource): ResourceWidth {
  if (resource.preferredWidth) return resource.preferredWidth;
  switch (resource.kind) {
    case "calendar":
      return "lg";
    case "document":
    case "form":
      return "md";
    case "portal":
    case "website":
      return "lg";
    default:
      return "md";
  }
}

function autoModeForKind(
  resource: ExternalResource,
  ctx: ResourceEvaluationContext,
): { mode: Exclude<ResourceOpenMode, "auto">; reason: string } {
  const isEmbed = ctx.embedMode === "embed" || ctx.embedMode === "kiosk";
  switch (resource.kind) {
    case "calendar":
      // Calendars commonly block iframing (Calendly etc.); a drawer is the
      // safest in-app experience and we still expose a new-tab fallback.
      return isEmbed
        ? { mode: "drawer", reason: "Calendar opens in a drawer to keep the script visible" }
        : { mode: "drawer", reason: "Calendar opens in a drawer" };
    case "portal":
      // Portals almost always block embedding.
      return { mode: "new_tab", reason: "Portal opens in a new tab (embedding usually blocked)" };
    case "document":
    case "form":
    case "website":
      return { mode: "iframe", reason: `${resource.kind} opens inline; falls back to a new tab if blocked` };
    case "custom":
    default:
      return { mode: "iframe", reason: "Opens inline; falls back to a new tab if blocked" };
  }
}

/**
 * Pure resolver. Does no network or DOM work — safe for both browser and
 * server contexts.
 */
export function resolveLaunchMode(req: LaunchRequest): LaunchResolution {
  const { resource, context } = req;
  const isEmbed = context.embedMode === "embed" || context.embedMode === "kiosk";
  const isPreview = context.embedMode === "preview";
  const narrow = typeof context.viewportWidth === "number" && context.viewportWidth < NARROW_VIEWPORT_PX;

  // Resolve the URL with safe param substitution applied.
  const resolved: ResolvedUrl = resource.allowParamInjection
    ? resolveResourceUrl(resource.url, context.runtime ?? {}, resource.paramTemplate)
    : { url: resource.url, unresolved: [], droppedParams: [] };

  const preferred = resource.openMode;
  let mode: Exclude<ResourceOpenMode, "auto">;
  let reason: string;
  let downgraded = false;
  let originalMode: ResourceOpenMode | undefined;

  if (preferred === "auto") {
    const auto = autoModeForKind(resource, context);
    mode = auto.mode;
    reason = auto.reason;
  } else if (preferred === "replace_center" && (isEmbed || isPreview)) {
    // Never replace center in embed-like surfaces — the script must stay visible.
    mode = "drawer";
    reason = "Center replacement downgraded to drawer in embed mode";
    downgraded = true;
    originalMode = "replace_center";
  } else if (preferred === "iframe" && narrow) {
    // On very narrow viewports, iframe panels are unusable — open in new tab.
    mode = "new_tab";
    reason = "Narrow viewport — opening in a new tab";
    downgraded = true;
    originalMode = "iframe";
  } else {
    mode = preferred;
    reason = `Honored configured open mode (${preferred})`;
  }

  // Portals/calendars hint when the agent picked iframe directly.
  if (!downgraded && mode === "iframe" && (resource.kind === "portal" || resource.kind === "calendar")) {
    reason = `${reason}. ${resource.kind === "portal" ? "Portals often block embedding — fallback to a new tab is available." : "Some calendars block embedding — fallback to a new tab is available."}`;
  }

  return {
    mode,
    resolvedUrl: resolved.url,
    width: pickWidth(resource),
    reason,
    downgraded,
    originalMode,
  };
}
