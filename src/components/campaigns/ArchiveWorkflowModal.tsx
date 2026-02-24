import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Archive, Loader2, CheckCircle2, CloudOff } from "lucide-react";
import type { ArchiveStep } from "@/hooks/useCampaignArchive";

interface ArchiveWorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: ArchiveStep[];
}

export function ArchiveWorkflowModal({ open, onOpenChange, steps }: ArchiveWorkflowModalProps) {
  const isComplete = steps.length > 0 && steps.every((s) => s.status === "done" || s.status === "error");
  const progress = steps.length > 0
    ? Math.round((steps.filter((s) => s.status === "done").length / steps.length) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && isComplete) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-destructive" />
            Campaign Deprovisioning
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{progress}% complete</p>
          <div className="space-y-2">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3 text-sm">
                {step.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-muted shrink-0" />}
                {step.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                {step.status === "done" && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                {step.status === "error" && <CloudOff className="h-4 w-4 text-destructive shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className={step.status === "error" ? "text-destructive" : ""}>{step.label}</span>
                  {step.error && <p className="text-xs text-destructive truncate">{step.error}</p>}
                </div>
              </div>
            ))}
          </div>
          {isComplete && (
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
