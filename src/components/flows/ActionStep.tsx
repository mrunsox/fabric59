import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FlowDefinition } from "@/pages/admin/FlowBuilderPage";

const CONNECTORS = ["clio", "mycase", "smokeball", "webhook", "custom-http"];

export function ActionStep({ definition, update }: { definition: FlowDefinition; update: (d: FlowDefinition) => void }) {
  const action = definition.action || { connector: "clio", action: "create_matter", config: {} };
  const set = (patch: Partial<typeof action>) => update({ ...definition, action: { ...action, ...patch } });

  return (
    <div className="space-y-4">
      <div>
        <Label>Connector</Label>
        <Select value={action.connector} onValueChange={(v) => set({ connector: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{CONNECTORS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Action</Label>
        <Input value={action.action} onChange={(e) => set({ action: e.target.value })} placeholder="e.g. create_matter, post_webhook" />
      </div>
    </div>
  );
}
