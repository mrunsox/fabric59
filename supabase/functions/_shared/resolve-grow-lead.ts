// Phase 2: server-side Grow payload resolver shared by five9-main producer.
// Mirrors src/lib/legal-connect/resolveGrowPayload.ts for the runtime path.
// Kept dependency-free.

export type MappingSource =
  | "five9_call_variable"
  | "five9_disposition_field"
  | "five9_connector_param"
  | "derived"
  | "constant"
  | "worksheet";

export interface CallVarMappingRow {
  variable_name: string;
  source_location: MappingSource;
  default_value: string | null;
  provider_field_path: string | null;
  required: boolean | null;
}

export interface NormalizedEventLite {
  ani?: string | null;
  disposition?: string | null;
  disposition_notes?: string | null;
  call_variables?: Record<string, any>;
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

const DEFAULT_REFERRING_URL = "https://fabric59.app/five9";

function readSource(
  m: CallVarMappingRow,
  evt: NormalizedEventLite,
  ws: Record<string, any>,
): string | null {
  const cv = evt.call_variables ?? {};
  switch (m.source_location) {
    case "constant":
      return (m.default_value ?? "").toString() || null;
    case "worksheet": {
      const v = ws?.[m.variable_name];
      return v != null && v !== "" ? String(v) : null;
    }
    case "five9_call_variable": {
      const v = cv[m.variable_name];
      return v != null && v !== "" ? String(v) : null;
    }
    case "five9_disposition_field":
      if (m.variable_name === "disposition") return evt.disposition ?? null;
      if (m.variable_name === "disposition_notes") return evt.disposition_notes ?? null;
      return null;
    case "derived":
      if (m.variable_name === "ani") return evt.ani ?? null;
      return null;
    default:
      return null;
  }
}

function fallback(field: string, evt: NormalizedEventLite): string | null {
  const cv = evt.call_variables ?? {};
  const fullName = (cv.caller_name as string) ?? "";
  const [fn, ...ln] = fullName.trim().split(/\s+/);
  switch (field) {
    case "from_first":
      return (cv.caller_first_name ?? cv.first_name ?? fn) ?? null;
    case "from_last":
      return (cv.caller_last_name ?? cv.last_name ?? ln.join(" ")) ?? null;
    case "from_email":
      return (cv.caller_email ?? cv.email ?? null) as string | null;
    case "from_phone":
      return (evt.ani ?? cv.caller_phone ?? cv.phone ?? null) as string | null;
    case "from_message":
      return (evt.disposition_notes ?? cv.notes ?? "") as string;
    case "referring_url":
      return (cv.referring_url ?? cv.landing_url ?? DEFAULT_REFERRING_URL) as string;
    case "from_source":
      return (cv.from_source ?? cv.lead_source ?? "Fabric59 / Five9") as string;
    default:
      return null;
  }
}

export interface ResolvedGrowLead {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  message: string;
  referring_url: string;
  source: string;
}

export function resolveGrowLead(
  evt: NormalizedEventLite,
  worksheet: Record<string, any>,
  mappings: CallVarMappingRow[],
): ResolvedGrowLead {
  const byField = new Map<string, CallVarMappingRow>();
  for (const m of mappings) {
    if (m.provider_field_path && (GROW_FIELDS as readonly string[]).includes(m.provider_field_path)) {
      byField.set(m.provider_field_path, m);
    }
  }
  const get = (field: (typeof GROW_FIELDS)[number]) => {
    const m = byField.get(field);
    let v: string | null = null;
    if (m) {
      v = readSource(m, evt, worksheet);
      if ((!v || v === "") && m.default_value && m.source_location !== "constant")
        v = m.default_value;
    }
    if (!v || v === "") v = fallback(field, evt);
    return (v ?? "").toString();
  };

  return {
    first_name: get("from_first"),
    last_name: get("from_last"),
    email: get("from_email"),
    phone: get("from_phone"),
    message: get("from_message") || "Lead captured via Five9 call.",
    referring_url: get("referring_url") || DEFAULT_REFERRING_URL,
    source: get("from_source") || "Fabric59 / Five9",
  };
}
