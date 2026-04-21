import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { FlowDefinition } from "@/pages/admin/FlowBuilderPage";

export function FailureStep({ definition, update }: { definition: FlowDefinition; update: (d: FlowDefinition) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Retry count</Label>
        <Input type="number" min={0} max={10} value={definition.failure.retries}
          onChange={(e) => update({ ...definition, failure: { ...definition.failure, retries: parseInt(e.target.value) || 0 } })} />
      </div>
      <div>
        <Label>Fallback action (optional)</Label>
        <Input value={definition.failure.fallback || ""}
          onChange={(e) => update({ ...definition, failure: { ...definition.failure, fallback: e.target.value } })}
          placeholder="e.g. notify_slack" />
      </div>
    </div>
  );
}
