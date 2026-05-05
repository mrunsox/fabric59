import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import type { FlowDefinition, FlowTemplate } from "@/lib/flow-templates/adapter";

const OPS = ["eq", "neq", "in", "contains", "exists"];

export function FilterStep({
  definition,
  update,
  template,
}: {
  definition: FlowDefinition;
  update: (d: FlowDefinition) => void;
  template?: FlowTemplate | null;
}) {
  const filters = definition.filters as Array<{ field: string; op: string; value: unknown }>;
  const set = (i: number, patch: Partial<{ field: string; op: string; value: unknown }>) =>
    update({ ...definition, filters: filters.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });
  const add = () => update({ ...definition, filters: [...filters, { field: "", op: "eq", value: "" }] });
  const remove = (i: number) => update({ ...definition, filters: filters.filter((_, idx) => idx !== i) });

  const isDisposition = template?.category === "disposition";

  return (
    <div className="space-y-4">
      {isDisposition && (
        <div className="rounded-md bg-secondary/30 p-3 text-xs text-muted-foreground">
          Tip: filter on <code>disposition</code> with op <code>in</code> and a comma-separated list of dispositions.
        </div>
      )}
      <div className="space-y-3">
        {filters.map((f, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5">
              <Label className="text-xs">Field</Label>
              <Input value={f.field} onChange={(e) => set(i, { field: e.target.value })} placeholder="e.g. campaign_name" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Op</Label>
              <Select value={f.op} onValueChange={(v) => set(i, { op: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OPS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-4">
              <Label className="text-xs">Value</Label>
              <Input value={String(f.value ?? "")} onChange={(e) => set(i, { value: e.target.value })} />
            </div>
            <Button variant="ghost" size="icon" className="col-span-1" onClick={() => remove(i)}><X className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4 mr-2" />Add filter</Button>
    </div>
  );
}
