import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import type { FlowDefinition } from "@/pages/admin/FlowBuilderPage";

export function FilterStep({ definition, update }: { definition: FlowDefinition; update: (d: FlowDefinition) => void }) {
  const add = () => update({ ...definition, filters: [...definition.filters, { field: "", op: "equals", value: "" }] });
  const set = (i: number, patch: Partial<{ field: string; op: string; value: string }>) =>
    update({ ...definition, filters: definition.filters.map((f, idx) => idx === i ? { ...f, ...patch } : f) });
  const remove = (i: number) => update({ ...definition, filters: definition.filters.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-3">
      {definition.filters.map((f, i) => (
        <div key={i} className="flex gap-2">
          <Input placeholder="field (e.g. campaign_name)" value={f.field} onChange={(e) => set(i, { field: e.target.value })} />
          <Input placeholder="op" value={f.op} onChange={(e) => set(i, { op: e.target.value })} className="w-24" />
          <Input placeholder="value" value={f.value} onChange={(e) => set(i, { value: e.target.value })} />
          <Button variant="ghost" size="icon" onClick={() => remove(i)}><X className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4 mr-2" />Add filter</Button>
    </div>
  );
}
