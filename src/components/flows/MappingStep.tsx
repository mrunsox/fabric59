import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import type { FlowDefinition } from "@/pages/admin/FlowBuilderPage";

export function MappingStep({ definition, update }: { definition: FlowDefinition; update: (d: FlowDefinition) => void }) {
  const add = () => update({ ...definition, mappings: [...definition.mappings, { source: "", target: "" }] });
  const set = (i: number, patch: Partial<{ source: string; target: string; transform?: string }>) =>
    update({ ...definition, mappings: definition.mappings.map((m, idx) => idx === i ? { ...m, ...patch } : m) });
  const remove = (i: number) => update({ ...definition, mappings: definition.mappings.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-3">
      {definition.mappings.map((m, i) => (
        <div key={i} className="flex gap-2">
          <Input placeholder="source field" value={m.source} onChange={(e) => set(i, { source: e.target.value })} />
          <span className="text-muted-foreground self-center">→</span>
          <Input placeholder="target field" value={m.target} onChange={(e) => set(i, { target: e.target.value })} />
          <Input placeholder="transform (optional)" value={m.transform || ""} onChange={(e) => set(i, { transform: e.target.value })} className="w-40" />
          <Button variant="ghost" size="icon" onClick={() => remove(i)}><X className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4 mr-2" />Add mapping</Button>
    </div>
  );
}
