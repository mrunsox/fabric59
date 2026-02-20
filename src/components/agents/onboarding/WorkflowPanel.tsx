import { WorkflowStepper } from "./WorkflowStepper";
import { CredentialsCard } from "./CredentialsCard";
import { ProvisioningStep, ProvisioningResult } from "@/types/provisioning";
import { Zap } from "lucide-react";

interface WorkflowPanelProps {
  steps: ProvisioningStep[];
  result: ProvisioningResult | null;
  isProvisioning: boolean;
}

export function WorkflowPanel({ steps, result, isProvisioning }: WorkflowPanelProps) {
  const hasStarted = steps.some(s => s.status !== 'pending');

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Provisioning Workflow</h3>
        {isProvisioning && (
          <span className="ml-auto text-xs text-warning animate-pulse font-medium">Running...</span>
        )}
      </div>

      {!hasStarted && !result && (
        <p className="text-xs text-muted-foreground">Fill in the form and click "Provision Agent" to start the automated workflow.</p>
      )}

      {hasStarted && (
        <WorkflowStepper steps={steps} />
      )}

      {result && (
        <div className="pt-2">
          <CredentialsCard result={result} />
        </div>
      )}
    </div>
  );
}
