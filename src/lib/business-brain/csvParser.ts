/**
 * Business Brain — CSV team-directory parser (Slice 2).
 *
 * Pure functions for converting a parsed CSV (header-aware) into deterministic
 * Business Brain extractions. Used by both the client hook (preview + payload
 * to send) and reflected by the bb-ingest edge function for inserts.
 *
 * Deterministic rules (Slice 2):
 *   - department  → any row with a non-empty `department`.
 *   - staff       → any row with a clear person `name` (not a business label).
 *   - phone       → any row with a phone (≥7 digits) and a useful label.
 *   - destination_contact → STRICT: only when the row is clearly a shared
 *     business contact, NOT a named staff record. Required signals:
 *       1) `name` is missing or looks like a business label, AND
 *       2) `label` matches a known destination pattern (billing line,
 *          after-hours, emergency, maintenance, fax, main line, reception,
 *          on-call, etc.), AND
 *       3) a phone or email value is present.
 *
 * Per the Slice 2 approval guards: a row that blends person + label data is
 * classified as `staff` (+ `phone` if any) and never as `destination_contact`.
 */

export const CSV_FIELDS = [
  "name",
  "role",
  "department",
  "phone",
  "extension",
  "email",
  "label",
  "notes",
  "ignore",
] as const;
export type CsvField = (typeof CSV_FIELDS)[number];

export interface CsvDirectoryRow {
  name?: string;
  role?: string;
  department?: string;
  phone?: string;
  extension?: string;
  email?: string;
  label?: string;
  notes?: string;
}

const HEADER_HINTS: Record<Exclude<CsvField, "ignore">, RegExp> = {
  name: /^(name|full.?name|contact|person|agent|staff|employee)$/i,
  role: /^(role|title|position|job.?title)$/i,
  department: /^(department|dept|team|group|division)$/i,
  phone: /^(phone|phone.?number|mobile|cell|number|tel|telephone|direct|direct.?line)$/i,
  extension: /^(ext|extension|x)$/i,
  email: /^(email|e.?mail|mail)$/i,
  label: /^(label|line|description|purpose|line.?name|contact.?label)$/i,
  notes: /^(notes?|comments?|remarks?|details?)$/i,
};

export function autoMapHeaders(headers: string[]): Record<string, CsvField> {
  const out: Record<string, CsvField> = {};
  const used = new Set<CsvField>();
  for (const h of headers) {
    const trimmed = (h ?? "").toString().trim();
    let assigned: CsvField = "ignore";
    for (const [field, pat] of Object.entries(HEADER_HINTS) as Array<
      [Exclude<CsvField, "ignore">, RegExp]
    >) {
      if (used.has(field)) continue;
      if (pat.test(trimmed)) {
        assigned = field;
        used.add(field);
        break;
      }
    }
    out[h] = assigned;
  }
  return out;
}

export function normalizeRow(
  raw: Record<string, unknown>,
  mapping: Record<string, CsvField>,
): CsvDirectoryRow {
  const out: CsvDirectoryRow = {};
  for (const [col, field] of Object.entries(mapping)) {
    if (field === "ignore") continue;
    const v = raw[col];
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    (out as Record<string, string>)[field] = s;
  }
  return out;
}

/**
 * Labels that mark a shared/business destination (billing, after-hours, etc).
 * Conservative on purpose — we want false negatives over false positives here,
 * since a wrong `destination_contact` pollutes routing.
 */
const DESTINATION_LABEL_RE =
  /(billing|after.?hours|emergency|maintenance|fax|main.?line|reception|front.?desk|operator|24.?hour|on.?call|hotline|night.?line|sales.?line|support.?line|service.?line)/i;

/**
 * Words that, if they appear in the `name` column, mean the row is actually a
 * business label not a person. Used to (a) skip emitting `staff` from such a
 * row and (b) gate `destination_contact` correctly.
 */
const BUSINESS_LABEL_IN_NAME_RE =
  /(line|desk|department|team|support|service|billing|after.?hours|emergency|reception|fax|main|info|hotline|on.?call|operator|hours)/i;

export function looksLikePersonName(s: string | undefined): boolean {
  if (!s) return false;
  const t = s.trim();
  if (!t) return false;
  if (BUSINESS_LABEL_IN_NAME_RE.test(t)) return false;
  // At least two characters and contains a letter.
  return /[A-Za-z]/.test(t) && t.length >= 2;
}

function digits(s: string | undefined): string {
  return String(s ?? "").replace(/\D+/g, "");
}

export interface DeterministicExtraction {
  entity_type: "staff" | "department" | "phone" | "destination_contact";
  payload: Record<string, unknown>;
  snippet: string;
  confidence: number;
}

export function rowsToExtractions(
  rows: CsvDirectoryRow[],
): DeterministicExtraction[] {
  const out: DeterministicExtraction[] = [];
  const seenDept = new Set<string>();
  const seenStaff = new Set<string>();
  const seenPhone = new Set<string>();
  const seenDest = new Set<string>();

  for (const row of rows) {
    const snippet = JSON.stringify(row);
    const isPerson = looksLikePersonName(row.name);
    const labelIsDestination =
      !!row.label && DESTINATION_LABEL_RE.test(row.label);

    if (row.department) {
      const k = row.department.toLowerCase().replace(/\s+/g, " ").trim();
      if (!seenDept.has(k)) {
        seenDept.add(k);
        out.push({
          entity_type: "department",
          payload: { name: row.department },
          snippet,
          confidence: 0.95,
        });
      }
    }

    if (isPerson) {
      const k = (row.name as string).toLowerCase().replace(/\s+/g, " ").trim();
      if (!seenStaff.has(k)) {
        seenStaff.add(k);
        const payload: Record<string, unknown> = { name: row.name };
        if (row.role) payload.role = row.role;
        if (row.department) payload.department = row.department;
        if (row.email) payload.email = row.email;
        if (row.phone) payload.phone = row.phone;
        out.push({
          entity_type: "staff",
          payload,
          snippet,
          confidence: 0.95,
        });
      }
    }

    if (row.phone) {
      const norm = digits(row.phone);
      if (norm.length >= 7 && !seenPhone.has(norm)) {
        seenPhone.add(norm);
        const fallback = isPerson
          ? `${row.name}${row.role ? ` (${row.role})` : ""}`
          : row.label || row.department || "Phone";
        const payload: Record<string, unknown> = {
          label: row.label || fallback,
          number: row.phone,
        };
        if (row.extension) payload.extension = row.extension;
        if (row.department) payload.department = row.department;
        out.push({
          entity_type: "phone",
          payload,
          snippet,
          confidence: 0.95,
        });
      }
    }

    // STRICT destination_contact rule: only when row is NOT a named person.
    if (!isPerson && labelIsDestination) {
      if (row.phone) {
        const k = `phone:${digits(row.phone)}`;
        if (!seenDest.has(k)) {
          seenDest.add(k);
          const payload: Record<string, unknown> = {
            label: row.label!,
            channel: "phone",
            value: row.phone,
          };
          if (row.notes) payload.notes = row.notes;
          out.push({
            entity_type: "destination_contact",
            payload,
            snippet,
            confidence: 0.9,
          });
        }
      } else if (row.email) {
        const k = `email:${row.email.toLowerCase()}`;
        if (!seenDest.has(k)) {
          seenDest.add(k);
          const payload: Record<string, unknown> = {
            label: row.label!,
            channel: "email",
            value: row.email,
          };
          if (row.notes) payload.notes = row.notes;
          out.push({
            entity_type: "destination_contact",
            payload,
            snippet,
            confidence: 0.9,
          });
        }
      }
    }
  }

  return out;
}
