import { CheckCircle2, Circle, Loader2, XCircle, SkipForward, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeprovisioningStep } from "@/types/deprovisioning";

interface DeprovisioningWorkflowPanelProps {
  steps: DeprovisioningStep[];
  isRunning: boolean;
}

export function DeprovisioningWorkflowPanel({ steps, isRunning }: DeprovisioningWorkflowPanelProps) {
  const hasStarted = steps.some(s => s.status !== 'pending');

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-destructive" />
        <h3 className="text-sm font-semibold text-foreground">Offboarding Workflow</h3>
        {isRunning && <span className="ml-auto text-xs text-warning animate-pulse font-medium">Running...</span>}
      </div>

      {!hasStarted && !isRunning && (
        <p className="text-xs text-muted-foreground">Select an agent and confirm offboarding to start the automated workflow.</p>
      )}

      {(hasStarted || isRunning) && (
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all", {
                  'border-border bg-background text-muted-foreground': step.status === 'pending',
                  'border-primary bg-primary/10 text-primary': step.status === 'active',
                  'border-success bg-success/10 text-success': step.status === 'complete',
                  'border-destructive bg-destructive/10 text-destructive': step.status === 'error',
                  'border-muted bg-muted/20 text-muted-foreground': step.status === 'skipped',
                })}>
                  {step.status === 'pending' && <Circle className="h-4 w-4" />}
                  {step.status === 'active' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {step.status === 'complete' && <CheckCircle2 className="h-4 w-4" />}
                  {step.status === 'error' && <XCircle className="h-4 w-4" />}
                  {step.status === 'skipped' && <SkipForward className="h-4 w-4" />}
                </div>
                {idx < steps.length - 1 && (
                  <div className={cn("mt-1 h-6 w-0.5", {
                    'bg-border': step.status === 'pending',
                    'bg-primary/40': step.status === 'active',
                    'bg-success/40': step.status === 'complete',
                    'bg-destructive/40': step.status === 'error',
                    'bg-muted': step.status === 'skipped',
                  })} />
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mt-1.5">
                  <p className={cn("text-sm font-medium leading-none", {
                    'text-muted-foreground': step.status === 'pending' || step.status === 'skipped',
                    'text-foreground': step.status === 'active',
                    'text-success': step.status === 'complete',
                    'text-destructive': step.status === 'error',
                  })}>
                    {step.name}
                  </p>
                  {step.status === 'skipped' && <span className="text-xs text-muted-foreground">(skipped)</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                {step.errorMessage && <p className="text-xs text-destructive mt-1">{step.errorMessage}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
