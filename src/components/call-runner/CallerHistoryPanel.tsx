import { useEffect, useState } from "react";
import { PhoneCall, History, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusPill } from "./primitives";
import { cn } from "@/lib/utils";

interface HistoryItem {
  id: string;
  source: "internal" | "five9_cache";
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  disposition: string | null;
  agent_name: string | null;
  script_name: string | null;
  summary: string | null;
}

interface Props {
  ani: string | null | undefined;
  className?: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Caller history panel — looks up prior interactions by ANI via the
 * caller-history edge function. Combines internal call_sessions with
 * cached Five9 call log entries. Hidden when no ANI is present.
 */
export function CallerHistoryPanel({ ani, className }: Props) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!ani || ani.trim().length === 0) {
      setItems(null);
      return;
    }
    setLoading(true);
    setError(null);
    supabase.functions
      .invoke("caller-history", { body: { ani, limit: 10 } })
      .then(({ data, error: invokeErr }) => {
        if (cancelled) return;
        if (invokeErr) {
          setError(invokeErr.message ?? "Failed to load caller history");
          setItems([]);
          return;
        }
        const list = Array.isArray(data?.items) ? (data.items as HistoryItem[]) : [];
        setItems(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(String(err?.message ?? err));
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ani]);

  if (!ani) return null;

  return (
    <section
      data-testid="caller-history-panel"
      className={cn(
        "rounded-lg border bg-card shadow-sm flex flex-col min-h-0",
        className,
      )}
      aria-label="Caller history"
    >
      <header className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-1.5 min-w-0">
          <History className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
          <span className="text-xs font-semibold tracking-tight">Caller history</span>
          <StatusPill icon={PhoneCall} dense tone="muted" className="ml-1">
            {ani}
          </StatusPill>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {loading ? "Loading…" : items ? `${items.length} prior` : ""}
        </span>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
        {loading && (
          <div
            data-testid="caller-history-loading"
            className="flex items-center gap-2 text-xs text-muted-foreground p-2"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking up prior calls…
          </div>
        )}
        {!loading && error && (
          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}
        {!loading && !error && items && items.length === 0 && (
          <p
            data-testid="caller-history-empty"
            className="text-[11px] text-muted-foreground italic p-2"
          >
            No prior interactions found for this number.
          </p>
        )}
        {!loading &&
          items &&
          items.map((item) => (
            <article
              key={item.id}
              data-testid="caller-history-item"
              className="rounded-md border bg-background/40 px-2.5 py-2 text-[11px] space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  {formatWhen(item.started_at)}
                </span>
                <span className="text-muted-foreground font-mono">
                  {formatDuration(item.duration_seconds)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {item.disposition && (
                  <StatusPill dense tone="info">
                    {item.disposition}
                  </StatusPill>
                )}
                {item.script_name && (
                  <StatusPill dense tone="muted">
                    {item.script_name}
                  </StatusPill>
                )}
                {item.source === "five9_cache" && (
                  <StatusPill dense tone="muted" className="uppercase">
                    Five9
                  </StatusPill>
                )}
              </div>
              {item.agent_name && (
                <p className="text-muted-foreground">Agent: {item.agent_name}</p>
              )}
              {item.summary && (
                <p className="text-foreground/80 leading-snug">{item.summary}</p>
              )}
            </article>
          ))}
      </div>
    </section>
  );
}
