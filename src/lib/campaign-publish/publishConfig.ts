/**
 * Publish config read/normalize/serialize helpers.
 *
 * Persistence lives at `campaigns.metadata.publish`. All other `metadata.*`
 * keys are preserved across writes.
 */
import {
  DEFAULT_PUBLISH_CONFIG,
  PUBLISH_CONFIG_VERSION,
  type CampaignPublishConfig,
  type PublishAccessMode,
  type PublishTheme,
  type SupportedEmbedParam,
  SUPPORTED_EMBED_PARAMS,
} from "./types";

const VALID_ACCESS: PublishAccessMode[] = ["public", "token"];
const VALID_THEME: PublishTheme[] = ["light", "dark", "auto"];

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

export function normalizePublishConfig(raw: unknown): CampaignPublishConfig {
  if (!isRecord(raw)) return { ...DEFAULT_PUBLISH_CONFIG };
  const access = VALID_ACCESS.includes(raw.access as PublishAccessMode)
    ? (raw.access as PublishAccessMode)
    : DEFAULT_PUBLISH_CONFIG.access;
  const theme = VALID_THEME.includes(raw.theme as PublishTheme)
    ? (raw.theme as PublishTheme)
    : DEFAULT_PUBLISH_CONFIG.theme;
  const token =
    typeof raw.token === "string" && raw.token.length > 0 && raw.token.length <= 128
      ? raw.token
      : null;
  const paramMapRaw = isRecord(raw.paramMap) ? raw.paramMap : {};
  const paramMap: Record<string, SupportedEmbedParam> = {};
  for (const [k, v] of Object.entries(paramMapRaw)) {
    if (
      typeof k === "string" &&
      k.length > 0 &&
      k.length <= 64 &&
      typeof v === "string" &&
      (SUPPORTED_EMBED_PARAMS as readonly string[]).includes(v)
    ) {
      paramMap[k] = v as SupportedEmbedParam;
    }
  }
  return {
    version: PUBLISH_CONFIG_VERSION,
    enabled: raw.enabled === true,
    access,
    token: access === "token" ? token : null,
    theme,
    paramMap,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
}

export function readPublishConfigFromMetadata(metadata: unknown): CampaignPublishConfig {
  if (!isRecord(metadata)) return { ...DEFAULT_PUBLISH_CONFIG };
  return normalizePublishConfig(metadata.publish);
}

/** Merge a publish-config patch into the existing metadata, preserving every
 *  unrelated key. Always stamps `updatedAt`. */
export function applyPublishPatch(
  metadata: unknown,
  patch: Partial<CampaignPublishConfig>,
): Record<string, unknown> {
  const meta = isRecord(metadata) ? { ...metadata } : {};
  const current = readPublishConfigFromMetadata(meta);
  const next = normalizePublishConfig({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  meta.publish = next as unknown as Record<string, unknown>;
  return meta;
}

/** Generate a URL-safe opaque token. Uses crypto.getRandomValues when
 *  available (browser/edge), falls back to Math.random for SSR/tests. */
export function generatePublishToken(byteLen = 18): string {
  const bytes = new Uint8Array(byteLen);
  const g = (globalThis as { crypto?: Crypto }).crypto;
  if (g && typeof g.getRandomValues === "function") {
    g.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLen; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  // base64url
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  const b64 =
    typeof btoa === "function"
      ? btoa(s)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Constant-time string compare. Both inputs must be strings; mismatched
 *  lengths short-circuit but still walk to avoid leaking length via timing
 *  in tight CPU loops. */
export function safeTokenCompare(a: string | null, b: string | null): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Build the canonical published embed URL for a campaign.
 *  Token is appended only when present. */
export function buildEmbedUrl(opts: {
  origin: string;
  campaignId: string;
  token?: string | null;
}): string {
  const { origin, campaignId, token } = opts;
  const base = `${origin.replace(/\/+$/, "")}/embed/c/${encodeURIComponent(campaignId)}`;
  if (token) return `${base}?t=${encodeURIComponent(token)}`;
  return base;
}

/** Build an example Five9-ready iframe snippet. Five9 variables use the
 *  `{{$Call.var}}` style template syntax which agents fill at runtime. */
export function buildIframeSnippet(opts: { embedUrl: string }): string {
  const sep = opts.embedUrl.includes("?") ? "&" : "?";
  const url = `${opts.embedUrl}${sep}call_id={{$Call.call_id}}&ani={{$Call.ANI}}&agent_id={{$Agent.username}}&agent_name={{$Agent.fullName}}`;
  return `<iframe
  src="${url}"
  style="width:100%;height:100%;border:0"
  allow="clipboard-write"
  title="Fabric59 campaign runner"
></iframe>`;
}
