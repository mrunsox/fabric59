import { useEffect, useState } from "react";
import {
  PhoneCall,
  Clock,
  Radio,
  RotateCcw,
  GitBranch,
  ListChecks,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill, AutosaveIndicator, type AutosaveState } from "./primitives";
import type { CallSessionMeta } from "@/types/call-runner";

interface Props {
  meta: CallSessionMeta;
  resumed: boolean;
  onReset: () => void;
  /** Active question_branch selection — surfaced as a department badge. */
  branchLabel?: string | null;
  /** Current step position, e.g. { current: 3, total: 9 }. */
  stepPosition?: { current: number; total: number } | null;
  /** Number of required steps still outstanding (excludes the active one). */
  requiredRemaining?: number;
  /** Autosave state for the in-call session. */
  autosave?: AutosaveState;
  /** ISO timestamp of the last successful save. */
  autosaveSavedAt?: string | null;
}

/**
 * Live call command bar.
 *
 * High-signal operational surface anchored at the top of the runner. Three
 * conceptual zones, top-to-bottom-friendly when wrapped on narrow widths:
 *
 *   identity    workspace · campaign · current routing branch
 *   call sig    ANI, call id, elapsed timer (calm → nudge → escalate)
 *   ops state   autosave dot, step position, required remaining, reset
 *
 * Designed for peripheral vision during live calls: counters change tone
 * rather than appearing/disappearing, so the eye never has to re-orient.
 */
export function SessionHeader({
  meta,
  resumed,
  onReset,
  branchLabel,
  stepPosition,
  requiredRemaining = 0,
  autosave = "idle",
  autosaveSavedAt,
}: Props) {
  const startedAt = new Date(meta.startedAt);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  // Elapsed-time stage coloring — < 3 min calm, 3–8 min nudge, > 8 escalate.
  const elapsedTone: "muted" | "warn" | "danger" =
    elapsed < 180 ? "muted" : elapsed < 480 ? "warn" : "danger";

  return (
    <header
      data-testid="runner-session-header"
      className="rounded-lg border bg-card shadow-sm px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2"
      aria-label="Live call command bar"
    >
      {/* Identity zone */}
      <div className="flex items-center gap-2 min-w-0" data-testid="runner-header-title">
        <span
          className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-primary/10 text-primary"
          aria-hidden
        >
          <Radio className="h-3.5 w-3.5" />
        </span>
        <div className="flex items-center gap-1.5 text-sm min-w-0">
          <span className="font-semibold truncate">{meta.workspaceName ?? "Workspace"}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" aria-hidden />
          <span className="truncate">{meta.campaignName ?? "Campaign"}</span>
        </div>
        <StatusPill
          tone={branchLabel ? "info" : "muted"}
          icon={GitBranch}
          dense
          className={branchLabel ? "" : "italic"}
        >
          <span data-testid="runner-branch-badge">{branchLabel ?? "Routing…"}</span>
        </StatusPill>
      </div>

      {/* Call signal zone */}
      <div className="flex items-center gap-1.5">
        <StatusPill icon={PhoneCall} dense title="Caller line">
          ANI {meta.ani ?? "—"}
        </StatusPill>
        {meta.callId && (
          <StatusPill dense title="Five9 call id">
            Call {meta.callId.slice(0, 8)}
          </StatusPill>
        )}
        <StatusPill
          tone={elapsedTone}
          icon={Clock}
          dense
          title="Call duration"
          className="font-mono"
        >
          <span data-testid="runner-elapsed">
            {mm}:{ss}
          </span>
        </StatusPill>
        {resumed && (
          <StatusPill tone="info" dense className="uppercase tracking-wider">
            <span data-testid="runner-resumed">Resumed</span>
          </StatusPill>
        )}
      </div>

      {/* Ops state zone — pushed right */}
      <div className="ml-auto flex items-center gap-1.5">
        {stepPosition && stepPosition.total > 0 && (
          <StatusPill icon={ListChecks} dense title="Active step position">
            <span data-testid="runner-step-position">
              Step {stepPosition.current} of {stepPosition.total}
            </span>
          </StatusPill>
        )}
        {requiredRemaining > 0 && (
          <StatusPill tone="warn" icon={AlertTriangle} dense title="Required steps still outstanding">
            <span data-testid="runner-required-remaining-header">
              {requiredRemaining} required
            </span>
          </StatusPill>
        )}
        <AutosaveIndicator state={autosave} savedAt={autosaveSavedAt} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden md:inline">
          Started {startedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs"
          onClick={onReset}
          data-testid="runner-reset"
          aria-label="Reset session"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </Button>
      </div>
    </header>
  );
}
