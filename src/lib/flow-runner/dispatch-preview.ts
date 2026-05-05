// Build a client-side preview of the exact outbound HTTP request a flow
// would dispatch in test mode. Mirrors the payload-shaping logic in
// supabase/functions/flow-runner/index.ts so users can see URL, headers,
// and JSON body before they execute the call.

import type { FlowDefinition } from "@/lib/flow-templates/adapter";

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function setPath(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".");
  let cur: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

export interface DispatchPreview {
  kind: "http" | "non_http" | "incomplete";
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  idempotencyKey?: string;
  notes: string[];
}

export interface PreviewOptions {
  idempotencyKey?: string;
}

export function buildDispatchPreview(
  definition: FlowDefinition,
  payload: unknown,
  options: PreviewOptions = {}
): DispatchPreview {
  const action = definition.action;
  const notes: string[] = [];
  if (!action || !action.connector || !action.action) {
    return { kind: "incomplete", notes: ["Choose a connector and action first."] };
  }

  const isHttp = action.connector === "webhook" || action.connector === "custom-http";
  const cfg = (action.config ?? {}) as Record<string, unknown>;
  const idempotencyKey = options.idempotencyKey;

  // Resolve mappings against the sample payload.
  const mapped: Record<string, unknown> = {};
  for (const m of definition.mappings) {
    if (!m.target) continue;
    const value = m.source ? getPath(payload, m.source) : undefined;
    if (value === undefined) {
      notes.push(`Mapping "${m.source}" → "${m.target}" resolved to undefined.`);
    }
    setPath(mapped, m.target, value);
  }

  if (!isHttp) {
    return {
      kind: "non_http",
      body: mapped,
      idempotencyKey,
      notes: [
        `Connector "${action.connector}" performs a connector action ("${action.action}"); no raw HTTP request is dispatched.`,
        "The mapped payload below is what gets sent to the connector adapter.",
        ...(idempotencyKey ? [`Idempotency key forwarded to the connector adapter: ${idempotencyKey}`] : []),
      ],
    };
  }

  const method = String(cfg.method ?? "POST").toUpperCase();
  const url = String(cfg.url ?? "");
  if (!url) notes.push("No URL configured. The dispatch will fail until a URL is set.");

  const userHeaders = (cfg.headers && typeof cfg.headers === "object"
    ? (cfg.headers as Record<string, string>)
    : {});
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Fabric59-Test": "true",
    "X-Fabric59-Connector": action.connector,
    "X-Fabric59-Action": action.action,
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    ...userHeaders,
  };

  // For webhook/custom-http, body is either the explicit cfg.body template
  // or the resolved mapped payload.
  const body: Record<string, unknown> =
    cfg.body && typeof cfg.body === "object"
      ? (cfg.body as Record<string, unknown>)
      : mapped;

  return { kind: "http", method, url, headers, body, idempotencyKey, notes };
}

export function previewAsCurl(p: DispatchPreview): string {
  if (p.kind !== "http" || !p.url) return "";
  const headerArgs = Object.entries(p.headers ?? {})
    .map(([k, v]) => `  -H '${k}: ${String(v).replace(/'/g, "'\\''")}'`)
    .join(" \\\n");
  const bodyJson = JSON.stringify(p.body ?? {}, null, 2).replace(/'/g, "'\\''");
  return `curl -X ${p.method} '${p.url}' \\\n${headerArgs} \\\n  -d '${bodyJson}'`;
}

/**
 * Compute a sample idempotency key the same way flow-runner does:
 *   sha256(`${deployment_id}:${source_event_id ?? random}`)
 * For test-mode previews we use a stable "preview" seed so the key is
 * reproducible while the user iterates on the same flow + payload.
 */
export async function computePreviewIdempotencyKey(
  deploymentId: string,
  payload: unknown
): Promise<string> {
  // Stable hash of payload so changing payload → changing key (matches prod behavior
  // where a different source_event_id produces a different key).
  const payloadStr = JSON.stringify(payload ?? {});
  const seed = `${deploymentId || "preview"}:${payloadStr}`;
  const enc = new TextEncoder().encode(seed);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

