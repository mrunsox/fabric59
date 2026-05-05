import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { FlowDefinition, FlowTemplate } from "@/lib/flow-templates/adapter";

export function FlowSummary({
  definition,
  status,
  setStatus,
  template,
}: {
  definition: FlowDefinition;
  status: string;
  setStatus: (s: string) => void;
  template?: FlowTemplate | null;
}) {
  const a = definition.action;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {template && <Badge variant="secondary">Template: {template.name}</Badge>}
        <Badge variant="outline">Trigger: {definition.trigger.type}</Badge>
        {a?.connector && <Badge variant="outline">{a.connector} · {a.action}</Badge>}
        <Badge variant="outline">Filters: {definition.filters.length}</Badge>
        <Badge variant="outline">Mappings: {definition.mappings.length}</Badge>
        <Badge variant="outline">Retries: {definition.failure.retries}</Badge>
      </div>
      <div className="max-w-xs">
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="testing">Testing</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <pre className="text-xs bg-secondary/30 p-4 rounded-lg overflow-auto max-h-96">{JSON.stringify(definition, null, 2)}</pre>
    </div>
  );
}
