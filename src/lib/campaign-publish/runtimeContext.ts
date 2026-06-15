/**
 * Embed runtime context ingestion.
 *
 * Normalizes inbound URL query params into a safe, length-capped
 * `EmbedRuntimeContext`. Unknown params are bucketed into `passthrough`
 * (capped). Values are never used for authorization — only for display and
 * routing inside the runner.
 */
import {
  EMPTY_EMBED_CONTEXT,
  SUPPORTED_EMBED_PARAMS,
  type EmbedRuntimeContext,
  type PublishTheme,
} from "./types";

const MAX_VALUE_LEN = 256;
const MAX_PASSTHROUGH_ENTRIES = 32;
const VALID_MODES: EmbedRuntimeContext["mode"][] = ["embed", "preview", "kiosk"];
const VALID_THEMES: PublishTheme[] = ["light", "dark", "auto"];

function clean(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  // Drop control chars; keep printable + common UTF-8.
  // eslint-disable-next-line no-control-regex
  const safe = trimmed.replace(/[\u0000-\u001F\u007F]/g, "");
  if (!safe) return null;
  return safe.length > MAX_VALUE_LEN ? safe.slice(0, MAX_VALUE_LEN) : safe;
}

function pickAliased(
  params: URLSearchParams,
  canonical: (typeof SUPPORTED_EMBED_PARAMS)[number],
  paramMap: Record<string, string>,
): string | null {
  // Reverse the alias map: external-name → canonical-name. We want all
  // external names that map to this canonical name.
  const aliases = Object.entries(paramMap)
    .filter(([, target]) => target === canonical)
    .map(([alias]) => alias);
  const candidates = [canonical, ...aliases];
  for (const name of candidates) {
    const raw = params.get(name);
    const v = clean(raw);
    if (v) return v;
  }
  return null;
}

export function buildEmbedRuntimeContext(
  search: URLSearchParams | string,
  paramMap: Record<string, string> = {},
): EmbedRuntimeContext {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const modeRaw = clean(pickAliased(params, "mode", paramMap));
  const mode = (VALID_MODES as string[]).includes(modeRaw ?? "")
    ? (modeRaw as EmbedRuntimeContext["mode"])
    : "embed";
  const themeRaw = clean(pickAliased(params, "theme", paramMap));
  const theme = (VALID_THEMES as string[]).includes(themeRaw ?? "")
    ? (themeRaw as PublishTheme)
    : "light";

  const known = new Set<string>(SUPPORTED_EMBED_PARAMS);
  for (const k of Object.keys(paramMap)) known.add(k);

  const passthrough: Record<string, string> = {};
  let count = 0;
  for (const [k, v] of params.entries()) {
    if (known.has(k)) continue;
    if (count >= MAX_PASSTHROUGH_ENTRIES) break;
    if (k.length === 0 || k.length > 64) continue;
    const safeKey = k.replace(/[^a-zA-Z0-9_.\-]/g, "");
    if (!safeKey) continue;
    const cleaned = clean(v);
    if (!cleaned) continue;
    passthrough[safeKey] = cleaned;
    count++;
  }

  return {
    ...EMPTY_EMBED_CONTEXT,
    callId: pickAliased(params, "call_id", paramMap),
    sessionId: pickAliased(params, "session_id", paramMap),
    ani: pickAliased(params, "ani", paramMap),
    agentId: pickAliased(params, "agent_id", paramMap),
    agentName: pickAliased(params, "agent_name", paramMap),
    campaignHint: pickAliased(params, "campaign", paramMap),
    mode,
    theme,
    lang: pickAliased(params, "lang", paramMap),
    passthrough,
  };
}

/** Extract the access token (if present) from a search string. Kept separate
 *  from the runtime context so the token never lands in render-side state. */
export function extractAccessToken(search: URLSearchParams | string): string | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return clean(params.get("t"));
}
