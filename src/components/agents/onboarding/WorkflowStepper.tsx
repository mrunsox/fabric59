import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProvisioningStep } from "@/types/provisioning";

interface WorkflowStepperProps {
  steps: ProvisioningStep[];
}

export function WorkflowStepper({ steps }: WorkflowStepperProps) {
  return (
    <div className="space-y-3">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all", {
              'border-border bg-background text-muted-foreground': step.status === 'pending',
              'border-primary bg-primary/10 text-primary': step.status === 'active',
              'border-success bg-success/10 text-success': step.status === 'complete',
              'border-destructive bg-destructive/10 text-destructive': step.status === 'error',
            })}>
              {step.status === 'pending' && <Circle className="h-4 w-4" />}
              {step.status === 'active' && <Loader2 className="h-4 w-4 animate-spin" />}
              {step.status === 'complete' && <CheckCircle2 className="h-4 w-4" />}
              {step.status === 'error' && <XCircle className="h-4 w-4" />}
            </div>
            {idx < steps.length - 1 && (
              <div className={cn("mt-1 h-6 w-0.5", {
                'bg-border': step.status === 'pending',
                'bg-primary/40': step.status === 'active',
                'bg-success/40': step.status === 'complete',
                'bg-destructive/40': step.status === 'error',
              })} />
            )}
          </div>
          <div className="flex-1 pb-2">
            <p className={cn("text-sm font-medium leading-none mt-1.5", {
              'text-muted-foreground': step.status === 'pending',
              'text-foreground': step.status === 'active',
              'text-success': step.status === 'complete',
              'text-destructive': step.status === 'error',
            })}>
              {step.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            {step.errorMessage && (
              <p className="text-xs text-destructive mt-1">{step.errorMessage}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
