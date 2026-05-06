// Pure transform runner for the Mapping Builder Test panel.
// Applies a TransformRule to a value the same way a server-side dispatcher would,
// so "Test" results in the UI match what a real push to the destination CRM would do.

import type { FieldMapping, TransformRule } from "@/types/mapping";

export type TransformOk = { ok: true; value: unknown };
export type TransformErr = { ok: false; error: string };
export type TransformResult = TransformOk | TransformErr;

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

function formatPhone(raw: string, format: string): string {
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return raw;
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return raw;
  switch (format) {
    case "E.164": return `+1${ten}`;
    case "National": return `(${ten.slice(0,3)}) ${ten.slice(3,6)}-${ten.slice(6)}`;
    case "International": return `+1 ${ten.slice(0,3)} ${ten.slice(3,6)} ${ten.slice(6)}`;
    default: return ten;
  }
}

function applyTemplate(tpl: string, ctx: Record<string, unknown>, value: unknown): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    if (key === "value") return asString(value);
    const parts = String(key).split(".");
    let cur: any = ctx;
    for (const p of parts) cur = cur?.[p];
    return asString(cur);
  });
}

export function runTransform(
  value: unknown,
  rule: TransformRule | null | undefined,
  ctx: Record<string, unknown> = {},
): TransformResult {
  if (!rule || rule.type === "none") return { ok: true, value };
  const p = (rule.params ?? {}) as Record<string, any>;
  try {
    switch (rule.type) {
      case "uppercase": return { ok: true, value: asString(value).toUpperCase() };
      case "lowercase": return { ok: true, value: asString(value).toLowerCase() };
      case "trim":      return { ok: true, value: asString(value).trim() };
      case "default":
        return { ok: true, value: value == null || value === "" ? p.value ?? "" : value };
      case "format_phone":
        return { ok: true, value: formatPhone(asString(value), String(p.format ?? "E.164")) };
      case "template":
        if (!p.template) return { ok: false, error: "template param required" };
        return { ok: true, value: applyTemplate(String(p.template), ctx, value) };
      case "lookup": {
        const m = (p.mappings ?? {}) as Record<string, unknown>;
        const k = asString(value);
        return { ok: true, value: k in m ? m[k] : value };
      }
      case "regex_extract": {
        if (!p.pattern) return { ok: false, error: "pattern param required" };
        const re = new RegExp(String(p.pattern));
        const m = asString(value).match(re);
        if (!m) return { ok: true, value: null };
        const grp = Number(p.group ?? 0);
        return { ok: true, value: m[grp] ?? null };
      }
      case "concat": {
        const sep = String(p.separator ?? " ");
        const extras = String(p.fields ?? "")
          .split(",").map((s) => s.trim()).filter(Boolean)
          .map((path) => {
            const parts = path.split(".");
            let cur: any = ctx;
            for (const pp of parts) cur = cur?.[pp];
            return asString(cur);
          });
        return { ok: true, value: [asString(value), ...extras].filter(Boolean).join(sep) };
      }
      case "split": {
        const sep = String(p.separator ?? " ");
        const idx = Number(p.index ?? 0);
        const parts = asString(value).split(sep);
        return { ok: true, value: parts[idx] ?? "" };
      }
      default:
        return { ok: false, error: `unknown transform: ${(rule as any).type}` };
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Generate a deterministic sample value based on field type/name.
function sampleFor(path: string, type: string): unknown {
  const t = type.toLowerCase();
  if (t === "phone") return "5551234567";
  if (t === "email") return "jane.doe@example.com";
  if (t === "number") return 42;
  if (t === "boolean") return true;
  if (t === "date") return new Date().toISOString();
  if (t === "disposition") return "Sale";
  if (/first/i.test(path)) return "Jane";
  if (/last/i.test(path)) return "Doe";
  if (/name/i.test(path)) return "Jane Doe";
  if (/zip|postal/i.test(path)) return "94110";
  if (/state/i.test(path)) return "CA";
  if (/city/i.test(path)) return "San Francisco";
  if (/street|address/i.test(path)) return "123 Market St";
  return `sample_${path.split(".").pop() ?? "value"}`;
}

export function buildSampleRecord(mappings: FieldMapping[], override?: Record<string, unknown>) {
  const rec: Record<string, unknown> = {};
  for (const m of mappings) {
    rec[m.sourceField.path] =
      override?.[m.sourceField.path] ?? sampleFor(m.sourceField.path, m.sourceField.type);
  }
  return rec;
}

export interface MappingTestRow {
  id: string;
  source: { path: string; label: string; value: unknown };
  target: { path: string; label: string };
  transform: string;
  output: unknown;
  ok: boolean;
  error?: string;
  warnings: string[];
}

export interface MappingTestReport {
  rows: MappingTestRow[];
  payload: Record<string, unknown>;
  summary: { total: number; failed: number; warnings: number };
}

function validateOutput(value: unknown, type: string): string[] {
  const w: string[] = [];
  if (value == null || value === "") {
    w.push("empty value");
    return w;
  }
  const s = asString(value);
  switch (type.toLowerCase()) {
    case "email":
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) w.push("does not look like an email");
      break;
    case "phone":
      if (s.replace(/\D+/g, "").length < 10) w.push("phone has fewer than 10 digits");
      break;
    case "number":
      if (Number.isNaN(Number(s))) w.push("not numeric");
      break;
    case "date":
      if (Number.isNaN(Date.parse(s))) w.push("not a parseable date");
      break;
  }
  return w;
}

export function runMappingTest(
  mappings: FieldMapping[],
  sampleSource: Record<string, unknown>,
): MappingTestReport {
  const rows: MappingTestRow[] = [];
  const payload: Record<string, unknown> = {};
  let failed = 0;
  let warnings = 0;

  for (const m of mappings) {
    const inputVal = sampleSource[m.sourceField.path];
    const result = runTransform(inputVal, m.transform ?? null, sampleSource);
    const outVal = result.ok ? result.value : null;
    const warns = result.ok ? validateOutput(outVal, m.targetField.type) : [];
    if (!result.ok) failed += 1;
    warnings += warns.length;
    if (result.ok) payload[m.targetField.path] = outVal;
    rows.push({
      id: m.id,
      source: { path: m.sourceField.path, label: m.sourceField.label, value: inputVal },
      target: { path: m.targetField.path, label: m.targetField.label },
      transform: m.transform?.type ?? "none",
      output: outVal,
      ok: result.ok,
      error: result.ok ? undefined : (result as TransformErr).error,
      warnings: warns,
    });
  }

  return { rows, payload, summary: { total: mappings.length, failed, warnings } };
}
