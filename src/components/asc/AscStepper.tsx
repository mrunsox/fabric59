import { CheckCircle2, Circle, CircleDot, AlertTriangle, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AscDraft, AscStepStatus } from "@/lib/asc/types";
import { selectAllStepStatuses } from "@/lib/asc/selectors";

const STEP_LABELS: Record<number, string> = {
  1: "Business context",
  2: "Campaign purpose",
  3: "Caller types",
  4: "Per-reason handling",
  5: "Outcomes",
  6: "Notifications",
  7: "Destination & launch",
  8: "Generate draft",
  9: "Review & preview",
  10: "Readiness & handoff",
};

function StatusIcon({ status }: { status: AscStepStatus }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case "in_progress":
      return <CircleDot className="h-4 w-4 text-primary" />;
    case "blocker":
      return <AlertOctagon className="h-4 w-4 text-destructive" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

export interface AscStepperProps {
  draft: AscDraft;
  onSelectStep: (step: number) => void;
}

export function AscStepper({ draft, onSelectStep }: AscStepperProps) {
  const statuses = selectAllStepStatuses(draft);
  return (
    <nav
      aria-label="Wizard steps"
      data-testid="asc-stepper"
      className="flex flex-col gap-1 p-3 text-sm"
    >
      {statuses.map(({ step, status }) => {
        const active = draft.step === step;
        return (
          <button
            key={step}
            type="button"
            data-testid={`asc-stepper-item-${step}`}
            data-active={active}
            onClick={() => onSelectStep(step)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
              active ? "bg-muted font-medium" : "hover:bg-muted/60",
            )}
          >
            <StatusIcon status={status} />
            <span className="text-xs text-muted-foreground">
              {String(step).padStart(2, "0")}
            </span>
            <span className="truncate">{STEP_LABELS[step]}</span>
          </button>
        );
      })}
    </nav>
  );
}

export { STEP_LABELS as ASC_STEP_LABELS };
