/**
 * Campaign publish + embed runtime — canonical typed model.
 *
 * Persisted as JSON under `campaigns.metadata.publish` (see publishConfig.ts)
 * and `campaigns.metadata.transferDirectory` (see ../transfer-directory/types).
 * No schema changes — the existing `campaigns.metadata jsonb` column is the
 * single source of truth.
 *
 * Industry-neutral. No legal-only vocabulary.
 */

export const PUBLISH_CONFIG_VERSION = 1 as const;

/** Access mode for the published URL. Token mode is *convenience protection*,
 *  not strong authorization — see docs/campaign-publish-embed-architecture.md. */
export type PublishAccessMode = "public" | "token";

export type PublishTheme = "light" | "dark" | "auto";

/** Canonical query-param names the embed runner understands. */
export const SUPPORTED_EMBED_PARAMS = [
  "call_id",
  "session_id",
  "ani",
  "agent_id",
  "agent_name",
  "campaign",
  "mode",
  "theme",
  "lang",
  "t", // access token (only when access === "token")
] as const;
export type SupportedEmbedParam = (typeof SUPPORTED_EMBED_PARAMS)[number];

export interface CampaignPublishConfig {
  version: typeof PUBLISH_CONFIG_VERSION;
  enabled: boolean;
  access: PublishAccessMode;
  /** Opaque obscurity token (URL-safe). Never logged. */
  token: string | null;
  theme: PublishTheme;
  /** Optional Five9-name → canonical-name overrides for query params. */
  paramMap: Record<string, SupportedEmbedParam>;
  updatedAt: string | null;
}

export const DEFAULT_PUBLISH_CONFIG: CampaignPublishConfig = {
  version: PUBLISH_CONFIG_VERSION,
  enabled: false,
  access: "public",
  token: null,
  theme: "light",
  paramMap: {},
  updatedAt: null,
};

/** Normalized runtime context derived from URL query params. All values are
 *  display/runtime hints only — never used as authorization. */
export interface EmbedRuntimeContext {
  callId: string | null;
  sessionId: string | null;
  ani: string | null;
  agentId: string | null;
  agentName: string | null;
  campaignHint: string | null;
  mode: "embed" | "preview" | "kiosk";
  theme: PublishTheme;
  lang: string | null;
  /** Unknown params, capped & sanitized. */
  passthrough: Record<string, string>;
}

export const EMPTY_EMBED_CONTEXT: EmbedRuntimeContext = {
  callId: null,
  sessionId: null,
  ani: null,
  agentId: null,
  agentName: null,
  campaignHint: null,
  mode: "embed",
  theme: "light",
  lang: null,
  passthrough: {},
};

/** Minimal embed payload returned by `campaign-embed-resolve`. The contract is
 *  intentionally narrow — no admin metadata, no echoed token, no unrelated
 *  campaign internals. See docs/campaign-publish-embed-architecture.md §4. */
export interface EmbedResolvePayload {
  campaign: { id: string; name: string };
  workspace: { id: string; name: string };
  publish: {
    enabled: true;
    theme: PublishTheme;
    access: PublishAccessMode;
    // NOTE: token is never echoed back.
  };
  guide: unknown | null; // published guide content (opaque to the resolver)
  flow: unknown | null; // published flow content (opaque to the resolver)
  transferDirectory: {
    entries: unknown[];
    rules: unknown[];
  };
}

export type EmbedResolveError =
  | { kind: "not_found" }
  | { kind: "publish_disabled" }
  | { kind: "access_denied" }
  | { kind: "server_error"; message: string };
