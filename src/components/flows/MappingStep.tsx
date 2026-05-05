import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, ArrowRight } from "lucide-react";
import type { FlowDefinition } from "@/lib/flow-templates/adapter";
import { getConnector, getConnectorAction } from "@/data/connector-actions";

const SOURCE_GROUPS = [
  { label: "Call", paths: ["call_id", "campaign_name", "queue_name", "disposition", "ani", "dnis"] },
  { label: "Customer", paths: ["customer.first_name", "customer.last_name", "customer.phone", "customer.email"] },
  { label: "Agent", paths: ["agent.id", "agent.username", "agent.first_name", "agent.last_name"] },
  { label: "Variables", paths: ["variables.practice_area", "variables.referral_source"] },
  { label: "Callback", paths: ["callback.notes", "callback.due_at"] },
];

export function MappingStep({
  definition,
  update,
}: {
  definition: FlowDefinition;
  update: (d: FlowDefinition) => void;
}) {
  const mappings = definition.mappings;
  const set = (i: number, patch: Partial<{ source: string; target: string; transform?: string }>) =>
    update({ ...definition, mappings: mappings.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) });
  const add = () => update({ ...definition, mappings: [...mappings, { source: "", target: "" }] });
  const remove = (i: number) => update({ ...definition, mappings: mappings.filter((_, idx) => idx !== i) });

  const action = definition.action;
  const connector = getConnector(action?.connector || undefined);
  const actionDef = action ? getConnectorAction(action.connector, action.action) : undefined;
  const targetSchema = actionDef?.targetSchema;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Map Five9 event fields → {connector ? `${connector.name} ${actionDef?.label ?? action?.action}` : "destination"} fields.
      </p>
      <div className="space-y-3">
        {mappings.map((m, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5">
              <Label className="text-xs">Source</Label>
              <Select value={m.source} onValueChange={(v) => set(i, { source: v })}>
                <SelectTrigger><SelectValue placeholder="Choose source" /></SelectTrigger>
                <SelectContent>
                  {SOURCE_GROUPS.map((g) => (
                    <div key={g.label}>
                      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{g.label}</div>
                      {g.paths.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 flex justify-center pb-2"><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
            <div className="col-span-5">
              <Label className="text-xs">Target</Label>
              {targetSchema && targetSchema.length ? (
                <Select value={m.target} onValueChange={(v) => set(i, { target: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose target" /></SelectTrigger>
                  <SelectContent>
                    {targetSchema.map((t) => (
                      <SelectItem key={t.path} value={t.path}>
                        {t.label} {t.required ? "*" : ""} <span className="text-muted-foreground">· {t.path}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={m.target} onChange={(e) => set(i, { target: e.target.value })} placeholder="target field" />
              )}
            </div>
            <Button variant="ghost" size="icon" className="col-span-1" onClick={() => remove(i)}><X className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4 mr-2" />Add mapping</Button>
    </div>
  );
}
