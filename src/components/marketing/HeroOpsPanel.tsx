import { Sparkles, ShieldCheck, Activity } from "lucide-react";

/**
 * Phase 4 — Illustrative product-adjacent panel rendered alongside the home hero.
 *
 * This is decorative, not a screenshot, not live data, and not interactive.
 * It echoes the Brain workspace visual language (panel chrome, hairline rows,
 * small caps eyebrows, calm status pills) so marketing feels related to the
 * product without transplanting the app shell.
 *
 * Numbers and labels are illustrative-only and intentionally generic so the
 * panel never reads as a fabricated metric or production state.
 */
export function HeroOpsPanel() {
  return (
    <div
      aria-hidden
      className="bb-panel relative overflow-hidden p-5 select-none"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(hsl(var(--foreground))_1px,transparent_1px)] [background-size:14px_14px]"
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Business Brain · illustrative
          </p>
          <span className="bb-badge bb-badge-info text-[10px]">Preview</span>
        </div>

        <Row
          icon={ShieldCheck}
          label="Approved knowledge"
          sub="Per-client answers, governed centrally"
          tone="ok"
        />
        <Row
          icon={Sparkles}
          label="Suggestions in review"
          sub="Awaiting supervisor approval"
          tone="info"
        />
        <Row
          icon={Activity}
          label="Open governance items"
          sub="Gaps, conflicts, stale facts"
          tone="warn"
          last
        />

        <div className="mt-5 border-t border-border/50 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Freshness this week
          </p>
          <div className="flex items-end gap-1.5 h-10">
            {[35, 60, 48, 72, 58, 80, 66].map((h, i) => (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className="flex-1 rounded-sm bg-primary/25"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  sub,
  tone,
  last,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  tone: "ok" | "info" | "warn";
  last?: boolean;
}) {
  const dot =
    tone === "ok"
      ? "bg-emerald-500/70"
      : tone === "warn"
        ? "bg-amber-500/70"
        : "bg-primary/70";
  return (
    <div
      className={`flex items-center gap-3 py-3 ${last ? "" : "border-b border-border/40"}`}
    >
      <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center ring-1 ring-border/60 shrink-0">
        <Icon className="h-4 w-4 text-foreground/70" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground tracking-tight truncate">
          {label}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
    </div>
  );
}
