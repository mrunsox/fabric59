import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FlowDefinition, FlowTemplate } from "@/lib/flow-templates/adapter";

const TRIGGERS_BY_CATEGORY: Record<FlowTemplate["category"], string[]> = {
  disposition: ["disposition", "call_end"],
  crm: ["call_end", "disposition", "variable_change"],
  inbound: ["inbound_call", "ani_match"],
  callback: ["callback_request"],
  custom: ["webhook", "call_end", "disposition", "variable_change"],
};

export function TriggerStep({
  definition,
  update,
  template,
}: {
  definition: FlowDefinition;
  update: (d: FlowDefinition) => void;
  template?: FlowTemplate | null;
}) {
  const triggers = template ? TRIGGERS_BY_CATEGORY[template.category] : ["call_end", "disposition", "callback_request", "variable_change", "webhook"];

  return (
    <div className="space-y-4">
      <div>
        <Label>Trigger type</Label>
        <Select value={definition.trigger.type} onValueChange={(v) => update({ ...definition, trigger: { type: v } })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {triggers.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        Five9 events of this type will trigger the flow{template ? ` (scoped by ${template.name})` : ""}.
      </p>
    </div>
  );
}
