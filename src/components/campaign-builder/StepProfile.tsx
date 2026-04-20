import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StepProps } from "./types";

export function StepProfile({ payload, updatePayload }: StepProps) {
  return (
    <div className="space-y-3">
      <Label>Worksheet fields (comma-separated)</Label>
      <Textarea
        value={payload.worksheet_fields?.join(", ") || ""}
        onChange={(e) => updatePayload({ worksheet_fields: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
        placeholder="first_name, last_name, phone, case_type"
        rows={3}
      />
      <p className="text-xs text-muted-foreground">These fields will appear in the agent worksheet during the call.</p>
    </div>
  );
}
