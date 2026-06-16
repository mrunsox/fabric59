import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ASC_TOTAL_STEPS } from "@/lib/asc/types";

export interface AscFooterNavProps {
  step: number;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
  saveLabel?: string;
}

export function AscFooterNav({
  step,
  canContinue,
  onBack,
  onContinue,
  saveLabel,
}: AscFooterNavProps) {
  const atStart = step <= 1;
  const atEnd = step >= ASC_TOTAL_STEPS;
  return (
    <div
      data-testid="asc-footer-nav"
      className="flex items-center justify-between border-t bg-background px-4 py-3"
    >
      <Button
        variant="ghost"
        size="sm"
        disabled={atStart}
        onClick={onBack}
        data-testid="asc-footer-back"
      >
        <ChevronLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      {saveLabel ? (
        <span className="text-xs text-muted-foreground" data-testid="asc-save-state">
          {saveLabel}
        </span>
      ) : null}
      <Button
        size="sm"
        disabled={!canContinue || atEnd}
        onClick={onContinue}
        data-testid="asc-footer-continue"
      >
        Continue <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
