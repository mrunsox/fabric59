/**
 * Human-readable formatters for external-resource buckets and modes.
 */
import type { ResourceBucket, ResourceKind, ResourceOpenMode } from "./types";

export const BUCKET_LABEL: Record<ResourceBucket, string> = {
  recommended: "Recommended",
  available: "Available",
  suggested: "Suggested",
  hidden: "Hidden",
};

export const KIND_LABEL: Record<ResourceKind, string> = {
  calendar: "Calendar",
  website: "Website",
  document: "Document",
  form: "Form",
  portal: "Portal",
  custom: "Custom",
};

export const OPEN_MODE_LABEL: Record<ResourceOpenMode, string> = {
  auto: "Auto",
  iframe: "Inline",
  drawer: "Drawer",
  replace_center: "Replace center",
  new_tab: "New tab",
};

/** Try to render a human-friendly host from a URL. Returns the raw URL on
 *  parse failure. */
export function displayHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
