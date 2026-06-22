/**
 * WorkspaceSetupChecklist — Phase 2.
 *
 * Renders the canonical workspace setup checklist returned by
 * `useWorkspaceSetupReadiness`. Two variants:
 *
 *  - `panel`  → full card. Used on Campaigns landing when no campaigns
 *               exist, and as the prominent readiness panel on the Cockpit
 *               when setup is incomplete.
 *  - `strip`  → compact one-line progress + "Continue setup" CTA. Used
 *               above the Campaigns list when partially complete, and as
 *               a slim "Ready" confirmation on Cockpit.
 *
 * No localStorage / no persistent dismissal — when readiness reaches 100%
 * the surfaces decide whether to hide the strip entirely.
 */
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  useWorkspaceSetupReadiness,
  type WorkspaceSetupReadiness,
} from "@/hooks/useWorkspaceSetupReadiness";

export interface WorkspaceSetupChecklistProps {
  variant?: "panel" | "strip";
  /** Optional override; if omitted the hook runs internally. */
  readiness?: WorkspaceSetupReadiness;
  /** Title for panel variant. */
  title?: string;
  /** Subtitle/lede for panel variant. */
  description?: string;
  className?: string;
}

export function WorkspaceSetupChecklist({
  variant = "panel",
  readiness: readinessProp,
  title = "Get this workspace live",
  description = "Each step links to the surface that owns it. Backend signals decide what's complete — nothing here is manual.",
  className,
}: WorkspaceSetupChecklistProps) {
  const internal = useWorkspaceSetupReadiness();
  const readiness = readinessProp ?? internal;
  const pct = Math.round((readiness.completed / readiness.total) * 100);

  if (variant === "strip") {
    return (
      <div
        data-testid="workspace-setup-strip"
        className={cn(
          "rounded-xl border border-border bg-card px-4 py-3 flex flex-wrap items-center gap-3",
          className,
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground">
            Workspace setup
          </span>
          <span className="text-xs text-muted-foreground">
            {readiness.completed} of {readiness.total} complete
          </span>
        </div>
        <div className="flex-1 min-w-[120px]">
          <Progress value={pct} className="h-1.5" />
        </div>
        {readiness.nextStep ? (
          <Button asChild size="sm" variant="outline">
            <Link to={readiness.nextStep.href}>
              Continue setup
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        ) : (
          <span className="text-xs font-medium text-success">Ready</span>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="workspace-setup-panel"
      className={cn(
        "rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6",
        className,
      )}
    >
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {readiness.completed} of {readiness.total} steps complete
          </span>
          <span>{pct}%</span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>

      <ul className="space-y-1">
        {readiness.isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="h-10 rounded-lg bg-muted/40 animate-pulse"
              />
            ))
          : readiness.steps.map((step) => (
              <li key={step.key}>
                <Link
                  to={step.href}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                  data-testid={`workspace-setup-step-${step.key}`}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm",
                        step.done
                          ? "text-muted-foreground line-through"
                          : "text-foreground",
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.hint}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors mt-1" />
                </Link>
              </li>
            ))}
      </ul>
    </div>
  );
}

export default WorkspaceSetupChecklist;
