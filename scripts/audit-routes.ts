/**
 * scripts/audit-routes.ts
 *
 * Phase D — canonical-scope guardrail.
 *
 * Scans src/App.tsx and reports every legacy/redirected route alongside
 * its target. Intended to be run manually (`bun run scripts/audit-routes.ts`)
 * during phase reviews and as a sanity check before a release.
 *
 * Output: a markdown table on stdout. Non-zero exit only if App.tsx
 * cannot be read.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP = readFileSync(resolve(__dirname, "../src/App.tsx"), "utf8");

type Row = { source: string; target: string; kind: "Navigate" | "WorkspaceResolveRedirect" | "OrgParamRedirect" };

const rows: Row[] = [];

// <Route path="..." element={<Navigate to="..." replace />} />
const navRe = /<Route\s+path=["']([^"']+)["']\s+element=\{<Navigate\s+to=["']([^"']+)["']/g;
for (const m of APP.matchAll(navRe)) rows.push({ source: m[1], target: m[2], kind: "Navigate" });

// <Route path="..." element={<WorkspaceResolveRedirect to="..." />} />
const wsRe = /<Route\s+path=["']([^"']+)["']\s+element=\{<WorkspaceResolveRedirect\s+to=["']([^"']+)["']/g;
for (const m of APP.matchAll(wsRe)) rows.push({ source: m[1], target: m[2], kind: "WorkspaceResolveRedirect" });

// <Route path="..." element={<OrgParamRedirect to="..." />} />
const orgRe = /<Route\s+path=["']([^"']+)["']\s+element=\{<OrgParamRedirect\s+to=["']([^"']+)["']/g;
for (const m of APP.matchAll(orgRe)) rows.push({ source: m[1], target: m[2], kind: "OrgParamRedirect" });

console.log(`# Route Audit — ${rows.length} redirects detected\n`);
console.log("| Source | Kind | Target |");
console.log("| --- | --- | --- |");
for (const r of rows.sort((a, b) => a.source.localeCompare(b.source))) {
  console.log(`| \`${r.source}\` | ${r.kind} | \`${r.target}\` |`);
}
