import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FlowDefinition } from "@/pages/admin/FlowBuilderPage";

const TRIGGERS = ["call_end", "disposition", "callback_request", "variable_change", "webhook"];

export function TriggerStep({ definition, update }: { definition: FlowDefinition; update: (d: FlowDefinition) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Trigger type</Label>
        <Select value={definition.trigger.type} onValueChange={(v) => update({ ...definition, trigger: { type: v } })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">Five9 events of this type will trigger the flow.</p>
    </div>
  );
}
