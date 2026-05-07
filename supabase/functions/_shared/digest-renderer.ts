// Phase 9 — branded digest HTML renderer.
//
// Pure function: takes a digest summary (matches the shape produced by
// legal-connect-digest) and returns an HTML string suitable for email and a
// plain-text fallback. No external deps so it works in any Edge Function.

export interface DigestRenderInput {
  brand_name?: string;
  brand_color?: string; // hex
  org_name?: string;
  cohort: string;
  cadence: string;
  summary: any; // shape from legal-connect-digest buildDigest
  app_url?: string;
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function deltaPill(d: { delta: number; pct: number }, invert = false): string {
  if (!d) return "";
  const up = d.delta > 0;
  const down = d.delta < 0;
  const good = invert ? down : up;
  const bad = invert ? up : down;
  const color = good ? "#059669" : bad ? "#dc2626" : "#6b7280";
  const arrow = up ? "▲" : down ? "▼" : "•";
  return `<span style="color:${color};font-size:12px;font-weight:600">${arrow} ${
    d.delta >= 0 ? "+" : ""
  }${d.delta} (${d.pct >= 0 ? "+" : ""}${d.pct}%)</span>`;
}

function statCard(label: string, value: string, deltaHtml = ""): string {
  return `
    <td style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#ffffff;width:25%" valign="top">
      <div style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.04em">${esc(label)}</div>
      <div style="color:#111827;font-size:22px;font-weight:600;margin-top:4px;font-variant-numeric:tabular-nums">${esc(value)}</div>
      <div style="margin-top:6px">${deltaHtml}</div>
    </td>`;
}

export function renderDigestHtml(input: DigestRenderInput): { html: string; text: string; subject: string } {
  const brand = input.brand_name ?? "Legal Connect";
  const color = input.brand_color ?? "#0EA5E9";
  const s = input.summary ?? {};
  const totals = s.totals ?? {};
  const d = s.deltas ?? {};
  const sr = d.success_rate ?? { current: null, previous: null };
  const wnd = `${new Date(s.window_start).toLocaleDateString()} – ${new Date(s.window_end).toLocaleDateString()}`;

  const topT = (s.top_failing_tenants ?? []) as Array<{ name: string; failed: number; total: number }>;
  const topA = (s.top_failing_actions ?? []) as Array<{ provider: string; action: string; failed: number; total: number }>;

  const subject = `${brand} ${input.cadence === "daily" ? "daily" : "weekly"} digest · ${
    totals.failed ?? 0
  } failed / ${totals.jobs ?? 0} jobs · ${sr.current ?? "—"}% success`;

  const tenantRows = topT.length === 0
    ? `<tr><td style="padding:8px;color:#6b7280;font-size:13px">No tenant failures in this window.</td></tr>`
    : topT.map((t) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#111827">${esc(t.name)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#6b7280;text-align:right;font-variant-numeric:tabular-nums">${t.failed} / ${t.total}</td>
      </tr>`).join("");

  const actionRows = topA.length === 0
    ? `<tr><td style="padding:8px;color:#6b7280;font-size:13px">No provider failures in this window.</td></tr>`
    : topA.map((a) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#111827;text-transform:capitalize">${esc(a.provider)} · ${esc(a.action)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#6b7280;text-align:right;font-variant-numeric:tabular-nums">${a.failed} / ${a.total}</td>
      </tr>`).join("");

  const reportsLink = input.app_url ? `${input.app_url}/superadmin/legal-connect-reports` : "";

  const html = `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <tr><td style="padding:20px 24px;background:${color};color:#ffffff">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.9">${esc(brand)}</div>
          <div style="font-size:18px;font-weight:600;margin-top:4px">${esc(input.cadence === "daily" ? "Daily" : "Weekly")} operational digest</div>
          <div style="font-size:12px;opacity:0.9;margin-top:4px">${esc(wnd)} · cohort: ${esc(input.cohort)}${input.org_name ? ` · ${esc(input.org_name)}` : ""}</div>
        </td></tr>

        <tr><td style="padding:20px 24px">
          <table role="presentation" width="100%" cellspacing="8" cellpadding="0">
            <tr>
              ${statCard("Total jobs", String(totals.jobs ?? 0), deltaPill(d.total_jobs))}
              ${statCard("Success rate", sr.current === null ? "—" : `${sr.current}%`, sr.previous === null ? "" : `<span style="color:#6b7280;font-size:12px">prev ${sr.previous}%</span>`)}
              ${statCard("Failed jobs", String(totals.failed ?? 0), deltaPill(d.failed_jobs, true))}
              ${statCard("Open alerts", String(totals.open_alerts ?? 0), deltaPill(d.open_alerts, true))}
            </tr>
            <tr>
              ${statCard("Rate-limited", String(d.rate_limited?.current ?? 0), deltaPill(d.rate_limited, true))}
              ${statCard("Recurring issues", String(totals.recurring ?? 0), deltaPill(d.recurring_issues, true))}
              ${statCard("GA items done", String(d.ga_done?.current ?? 0), deltaPill(d.ga_done))}
              ${statCard("Tenants", String(totals.tenants ?? 0), `<span style="color:#6b7280;font-size:12px">${totals.design_partners ?? 0} design partner(s)</span>`)}
            </tr>
          </table>

          <h3 style="font-size:14px;color:#111827;margin:24px 0 8px">Top failing tenants</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:8px">
            ${tenantRows}
          </table>

          <h3 style="font-size:14px;color:#111827;margin:24px 0 8px">Top failing actions</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:8px">
            ${actionRows}
          </table>

          ${reportsLink ? `<div style="margin-top:24px"><a href="${esc(reportsLink)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600">Open Legal Connect reports</a></div>` : ""}

          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:11px">
            Internal operational digest. Sent to your ${esc(input.cohort)} cohort. To stop receiving this, ask an admin to remove your subscription.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `${brand} ${input.cadence} digest`,
    wnd,
    "",
    `Total jobs: ${totals.jobs ?? 0}`,
    `Success rate: ${sr.current ?? "—"}%`,
    `Failed jobs: ${totals.failed ?? 0}`,
    `Open alerts: ${totals.open_alerts ?? 0}`,
    `Recurring issues: ${totals.recurring ?? 0}`,
    `GA items done: ${d.ga_done?.current ?? 0}`,
    "",
    "Top failing tenants:",
    ...(topT.length ? topT.map((t) => ` - ${t.name}: ${t.failed}/${t.total}`) : ["  (none)"]),
    "",
    "Top failing actions:",
    ...(topA.length ? topA.map((a) => ` - ${a.provider} ${a.action}: ${a.failed}/${a.total}`) : ["  (none)"]),
    reportsLink ? `\nReports: ${reportsLink}` : "",
  ].join("\n");

  return { html, text, subject };
}
