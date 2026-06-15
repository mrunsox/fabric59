/**
 * Runtime URL param templating for external resources.
 *
 * Token syntax: `{{name}}` where `name` is from an allow-list (see
 * SUPPORTED_TOKENS) or `field.<key>` for captured-field lookups. Anything
 * else is dropped silently. Values are URL-encoded; missing tokens render as
 * empty string and any resulting empty query parameters are pruned so the URL
 * stays clean.
 *
 * Hard rules:
 *   - never substitute into the URL path/host, only the resolved final URL is
 *     post-processed; the source URL is already validated by sanitizeResourceUrl.
 *   - never produce a non-http(s) URL.
 *   - never reflect raw HTML / script — values are URL-encoded.
 *   - drop param keys that become empty after substitution.
 */
import type { ResourceRuntimeValues } from "./types";

export const SUPPORTED_TOKENS = [
  "ani",
  "callerName",
  "callerEmail",
  "issueType",
  "specialty",
  "urgency",
  "campaignId",
  "campaignName",
  "workspaceId",
  "workspaceName",
  "agentId",
  "agentName",
  "sessionId",
  "callId",
  "disposition",
] as const;
export type SupportedToken = (typeof SUPPORTED_TOKENS)[number];

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_.\-]+)\s*\}\}/g;
const MAX_TOKEN_VALUE = 256;
const MAX_URL_LEN = 2000;

function lookup(values: ResourceRuntimeValues, token: string): string | null {
  if (token.startsWith("field.")) {
    const key = token.slice("field.".length);
    if (!key) return null;
    const v = values.capturedFields?.[key];
    if (v === undefined || v === null) return null;
    return String(v);
  }
  if ((SUPPORTED_TOKENS as readonly string[]).includes(token)) {
    const v = (values as unknown as Record<string, unknown>)[token];
    if (v === undefined || v === null) return null;
    return String(v);
  }
  return null;
}

function resolveToken(values: ResourceRuntimeValues, token: string): string {
  const raw = lookup(values, token);
  if (raw === null) return "";
  const clipped = raw.length > MAX_TOKEN_VALUE ? raw.slice(0, MAX_TOKEN_VALUE) : raw;
  // Strip control chars before encoding.
  // eslint-disable-next-line no-control-regex
  const safe = clipped.replace(/[\u0000-\u001F\u007F]/g, "");
  return encodeURIComponent(safe);
}

/** Substitute `{{token}}` in a single template string. */
export function renderTemplate(template: string, values: ResourceRuntimeValues): string {
  return template.replace(TOKEN_RE, (_m, token: string) => resolveToken(values, token));
}

export interface ResolvedUrl {
  url: string;
  /** Tokens that appeared in the template but had no runtime value. */
  unresolved: string[];
  /** Param keys dropped because their value resolved to empty. */
  droppedParams: string[];
}

/**
 * Apply a resource's `paramTemplate` to its URL.
 *
 * The original URL is parsed; each templated entry is rendered and either:
 *   - appended/overwritten as a query param when it resolves to a non-empty value,
 *   - dropped when it resolves to empty (token missing).
 *
 * Existing query params on the source URL are preserved unless the template
 * overrides them. Hash fragment is preserved.
 */
export function resolveResourceUrl(
  rawUrl: string,
  values: ResourceRuntimeValues,
  paramTemplate: Record<string, string> | undefined,
): ResolvedUrl {
  const unresolved: string[] = [];
  const droppedParams: string[] = [];
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return { url: rawUrl, unresolved, droppedParams };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { url: rawUrl, unresolved, droppedParams };
  }

  if (paramTemplate && Object.keys(paramTemplate).length > 0) {
    for (const [key, template] of Object.entries(paramTemplate)) {
      // Capture which tokens went unresolved for debug surfaces.
      const tokensInTemplate = Array.from(template.matchAll(TOKEN_RE)).map((m) => m[1]);
      const rendered = renderTemplate(template, values);
      // `rendered` is URL-encoded by resolveToken; URLSearchParams.set
      // would double-encode, so decode once then set.
      let decoded = "";
      try {
        decoded = decodeURIComponent(rendered);
      } catch {
        decoded = rendered;
      }
      const trimmed = decoded.trim();
      if (!trimmed) {
        droppedParams.push(key);
        for (const t of tokensInTemplate) {
          if (lookup(values, t) === null && !unresolved.includes(t)) unresolved.push(t);
        }
        continue;
      }
      u.searchParams.set(key, trimmed);
    }
  }

  let finalUrl = u.toString();
  if (finalUrl.length > MAX_URL_LEN) finalUrl = finalUrl.slice(0, MAX_URL_LEN);
  // Final defense: re-check protocol.
  try {
    const check = new URL(finalUrl);
    if (check.protocol !== "http:" && check.protocol !== "https:") {
      return { url: rawUrl, unresolved, droppedParams };
    }
  } catch {
    return { url: rawUrl, unresolved, droppedParams };
  }
  return { url: finalUrl, unresolved, droppedParams };
}
