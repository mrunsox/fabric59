import { CheckCircle2 } from "lucide-react";
import type { StepProps } from "./types";

export function StepDispositions(_: StepProps) {
  const starter = ["Qualified Lead", "Existing Client Inquiry", "Callback", "Wrong Number", "Needs Review"];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Recommended starter set:</p>
      <div className="grid gap-2">
        {starter.map((d) => (
          <div key={d} className="flex items-center gap-2 p-3 rounded-lg border border-border">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm">{d}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Action chains can be configured per disposition in the Dispositions section after this builder.
      </p>
    </div>
  );
}
