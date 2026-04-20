import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StepProps } from "./types";

export function StepRouting({ payload, updatePayload }: StepProps) {
  return (
    <div className="space-y-3">
      <Label>Routing notes</Label>
      <Textarea
        value={payload.routing_notes || ""}
        onChange={(e) => updatePayload({ routing_notes: e.target.value })}
        placeholder="e.g. Pop the agent worksheet on inbound, fall back to review queue if no match"
        rows={4}
      />
    </div>
  );
}
