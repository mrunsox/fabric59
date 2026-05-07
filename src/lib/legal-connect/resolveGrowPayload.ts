/**
 * Phase 2: Clio Grow payload resolver.
 *
 * Pure-function resolver that takes the canonical inputs the runtime sees
 * (Five9 normalized event, worksheet snapshot, call variable mappings) and
 * produces:
 *   - the Grow payload that would be POSTed to /inbox_leads
 *   - per-field provenance (which source filled each field)
 *   - validation errors and warnings
 *
 * Used by:
 *   - PayloadPreviewPanel (client-side dry-run)
 *   - the dispatch path in five9-main when it builds the lead input
 *
 * Keep this file dependency-free so it can be imported from React and from
 * Deno edge functions (via copy or ESM build) without changes.
 */

export type MappingSource =
  | "five9_call_variable"
  | "five9_disposition_field"
  | "five9_connector_param"
  | "derived"
  | "constant"
  | "worksheet";

export interface CallVariableMapping {
  id: string;
  variable_name: string;
  source_location: MappingSource;
  /** When source is `constant`, this carries the literal value. */
  default_value?: string | null;
  /** Provider field path on the Grow inbox_lead object: e.g. `from_first`. */
  provider_field_path?: string | null;
  required?: boolean;
  metadata?: Record<string, any> | null;
}

export interface NormalizedEventLite {
  ani?: string | null;
  disposition?: string | null;
  disposition_notes?: string | null;
  call_variables?: Record<string, any>;
}

export interface ResolvedField {
  field: string;
  value: string | null;
  source: MappingSource | "fallback" | "missing";
  /** Human label of where the value came from (e.g. `worksheet:case_type`). */
  source_label: string;
  required: boolean;
  ok: boolean;
}

export interface GrowResolveResult {
  payload: {
    inbox_lead: {
      from_first: string;
      from_last: string;
      from_email: string;
      from_phone: string;
      from_message: string;
      referring_url: string;
      from_source: string;
    };
    /** token is intentionally redacted in preview output */
    inbox_lead_token?: "***redacted***";
  };
  fields: ResolvedField[];
  errors: string[];
  warnings: string[];
}

const GROW_REQUIRED = new Set([
  "from_first",
  "from_last",
  "from_message",
  "referring_url",
  "from_source",
]);

const DEFAULT_REFERRING_URL = "https://fabric59.app/five9";

function readFromSource(
  m: CallVariableMapping,
  evt: NormalizedEventLite,
  worksheet: Record<string, any>,
): { value: string | null; source: MappingSource | "missing"; source_label: string } {
  const cv = evt.call_variables ?? {};
  switch (m.source_location) {
    case "constant": {
      const v = (m.default_value ?? "").toString();
      return { value: v || null, source: "constant", source_label: `constant:"${v}"` };
    }
    case "worksheet": {
      const v = worksheet?.[m.variable_name];
      return v != null && v !== ""
        ? { value: String(v), source: "worksheet", source_label: `worksheet:${m.variable_name}` }
        : { value: null, source: "missing", source_label: `worksheet:${m.variable_name} (empty)` };
    }
    case "five9_call_variable": {
      const v = cv[m.variable_name];
      return v != null && v !== ""
        ? {
            value: String(v),
            source: "five9_call_variable",
            source_label: `five9:${m.variable_name}`,
          }
        : {
            value: null,
            source: "missing",
            source_label: `five9:${m.variable_name} (empty)`,
          };
    }
    case "five9_disposition_field": {
      const v =
        m.variable_name === "disposition"
          ? evt.disposition
          : m.variable_name === "disposition_notes"
            ? evt.disposition_notes
            : null;
      return v
        ? {
            value: String(v),
            source: "five9_disposition_field",
            source_label: `disposition:${m.variable_name}`,
          }
        : {
            value: null,
            source: "missing",
            source_label: `disposition:${m.variable_name} (empty)`,
          };
    }
    case "derived": {
      // Common derived shortcuts.
      if (m.variable_name === "ani" && evt.ani) {
        return { value: evt.ani, source: "derived", source_label: "derived:ani" };
      }
      return { value: null, source: "missing", source_label: `derived:${m.variable_name}` };
    }
    default:
      return { value: null, source: "missing", source_label: m.source_location };
  }
}

/**
 * Heuristic fallback for Grow fields when no mapping exists, mirroring the
 * runtime producer in five9-main so preview matches dispatch.
 */
function heuristicFallback(
  field: string,
  evt: NormalizedEventLite,
): { value: string | null; source_label: string } {
  const cv = evt.call_variables ?? {};
  const fullName = (cv.caller_name as string) ?? "";
  const [fnGuess, ...lnGuess] = fullName.trim().split(/\s+/);
  switch (field) {
    case "from_first":
      return {
        value: ((cv.caller_first_name ?? cv.first_name ?? fnGuess) as string) || null,
        source_label: "fallback:caller_first_name|first_name|caller_name",
      };
    case "from_last":
      return {
        value:
          ((cv.caller_last_name ?? cv.last_name ?? lnGuess.join(" ")) as string) || null,
        source_label: "fallback:caller_last_name|last_name|caller_name",
      };
    case "from_email":
      return {
        value: (cv.caller_email ?? cv.email ?? null) as string | null,
        source_label: "fallback:caller_email|email",
      };
    case "from_phone":
      return {
        value: (evt.ani ?? cv.caller_phone ?? cv.phone ?? null) as string | null,
        source_label: "fallback:ani|caller_phone|phone",
      };
    case "from_message":
      return {
        value: (evt.disposition_notes ?? cv.notes ?? "") as string,
        source_label: "fallback:disposition_notes|notes",
      };
    case "referring_url":
      return {
        value: (cv.referring_url ?? cv.landing_url ?? DEFAULT_REFERRING_URL) as string,
        source_label: "fallback:referring_url|landing_url|default",
      };
    case "from_source":
      return {
        value: (cv.from_source ?? cv.lead_source ?? "Fabric59 / Five9") as string,
        source_label: "fallback:from_source|lead_source|default",
      };
    default:
      return { value: null, source_label: "fallback:none" };
  }
}

const GROW_FIELDS = [
  "from_first",
  "from_last",
  "from_email",
  "from_phone",
  "from_message",
  "referring_url",
  "from_source",
] as const;

export function resolveGrowPayload(
  evt: NormalizedEventLite,
  worksheet: Record<string, any>,
  mappings: CallVariableMapping[],
): GrowResolveResult {
  const fields: ResolvedField[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Index mappings by Grow provider field path.
  const byField = new Map<string, CallVariableMapping>();
  for (const m of mappings) {
    if (m.provider_field_path && GROW_FIELDS.includes(m.provider_field_path as any)) {
      byField.set(m.provider_field_path, m);
    }
  }

  for (const field of GROW_FIELDS) {
    const m = byField.get(field);
    let value: string | null = null;
    let source: ResolvedField["source"] = "missing";
    let source_label = "(no mapping)";
    const required = GROW_REQUIRED.has(field) || !!m?.required;

    if (m) {
      const got = readFromSource(m, evt, worksheet);
      value = got.value;
      source_label = got.source_label;
      source = got.source;
      if ((value == null || value === "") && m.default_value && m.source_location !== "constant") {
        value = m.default_value;
        source = "fallback";
        source_label = `default_value:"${m.default_value}"`;
      }
    }

    // If still empty and Grow needs the field, try producer-style heuristics.
    if ((value == null || value === "") && required) {
      const h = heuristicFallback(field, evt);
      if (h.value) {
        value = h.value;
        source = "fallback";
        source_label = h.source_label;
      }
    }

    const ok = required ? !!(value && String(value).trim()) : true;
    if (!ok) errors.push(`Required field "${field}" is empty.`);
    fields.push({ field, value: value ?? null, source, source_label, required, ok });
  }

  // Cross-field rule: Grow accepts the lead only if email or phone exists.
  const email = fields.find((f) => f.field === "from_email")?.value ?? "";
  const phone = fields.find((f) => f.field === "from_phone")?.value ?? "";
  if (!email && !phone) {
    errors.push("Need at least one of from_email or from_phone.");
  }

  // Surface mappings whose source is `worksheet` but the worksheet snapshot is
  // missing the value — common admin foot-gun.
  for (const m of mappings) {
    if (m.source_location === "worksheet" && !worksheet?.[m.variable_name]) {
      warnings.push(`Worksheet field "${m.variable_name}" is empty for this preview.`);
    }
  }

  const v = (k: (typeof GROW_FIELDS)[number]) =>
    (fields.find((f) => f.field === k)?.value ?? "").toString().trim();

  return {
    payload: {
      inbox_lead: {
        from_first: v("from_first"),
        from_last: v("from_last"),
        from_email: v("from_email"),
        from_phone: v("from_phone"),
        from_message: v("from_message") || "Lead captured via Five9 call.",
        referring_url: v("referring_url") || DEFAULT_REFERRING_URL,
        from_source: v("from_source") || "Fabric59 / Five9",
      },
      inbox_lead_token: "***redacted***",
    },
    fields,
    errors,
    warnings,
  };
}
