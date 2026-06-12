import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { newFlowId } from "@/lib/campaign-flow/schema";
import type { FlowCondition, FlowRule, FlowStep } from "@/types/campaign-flow";

interface Props {
  rules: FlowRule[];
  allSteps: FlowStep[];
  onChange: (next: FlowRule[]) => void;
}

const OPS: FlowCondition["op"][] = ["eq", "neq", "in", "not_in", "contains", "gt", "lt", "is_set", "is_empty"];

export function RuleBuilder({ rules, allSteps, onChange }: Props) {
  const addRule = () =>
    onChange([
      ...rules,
      {
        id: newFlowId("rule"),
        groups: [{ id: newFlowId("grp"), combinator: "AND", conditions: [] }],
        action: { type: "show_step", stepId: allSteps[0]?.id ?? "" },
      },
    ]);
  const setRule = (i: number, r: FlowRule) => onChange(rules.map((rr, idx) => (idx === i ? r : rr)));
  const removeRule = (i: number) => onChange(rules.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2" data-testid="rule-builder">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Conditional rules</Label>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addRule}>
          <Plus className="h-3 w-3 mr-1" /> Add rule
        </Button>
      </div>
      {rules.length === 0 && <p className="text-xs text-muted-foreground italic">No rules. The step runs unconditionally.</p>}
      {rules.map((rule, i) => (
        <div key={rule.id} className="rounded-md border border-border bg-muted/30 p-2 space-y-2">
          {rule.groups.map((g, gi) => (
            <div key={g.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Group {gi + 1}</span>
                <Select value={g.combinator} onValueChange={(v) => {
                  const next = { ...rule, groups: rule.groups.map((gg, idx) => idx === gi ? { ...gg, combinator: v as "AND" | "OR" } : gg) };
                  setRule(i, next);
                }}>
                  <SelectTrigger className="h-6 w-20 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] ml-auto"
                  onClick={() => {
                    const next = { ...rule, groups: rule.groups.map((gg, idx) => idx === gi ? { ...gg, conditions: [...gg.conditions, { id: newFlowId("cond"), source: "", op: "eq" as const, value: "" }] } : gg) };
                    setRule(i, next);
                  }}>+ condition</Button>
              </div>
              {g.conditions.map((c, ci) => (
                <div key={c.id} className="grid grid-cols-[1fr_90px_1fr_32px] gap-1.5 items-center">
                  <Input className="h-7 text-xs" placeholder="field key or __outcome__"
                    value={c.source} onChange={(e) => {
                      const next = { ...rule, groups: rule.groups.map((gg, idx) => idx === gi ? { ...gg, conditions: gg.conditions.map((cc, x) => x === ci ? { ...cc, source: e.target.value } : cc) } : gg) };
                      setRule(i, next);
                    }} />
                  <Select value={c.op} onValueChange={(v) => {
                    const next = { ...rule, groups: rule.groups.map((gg, idx) => idx === gi ? { ...gg, conditions: gg.conditions.map((cc, x) => x === ci ? { ...cc, op: v as FlowCondition["op"] } : cc) } : gg) };
                    setRule(i, next);
                  }}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{OPS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="h-7 text-xs" placeholder="value"
                    value={typeof c.value === "string" ? c.value : Array.isArray(c.value) ? c.value.join(",") : String(c.value ?? "")}
                    onChange={(e) => {
                      const v = e.target.value;
                      const next = { ...rule, groups: rule.groups.map((gg, idx) => idx === gi ? { ...gg, conditions: gg.conditions.map((cc, x) => x === ci ? { ...cc, value: v } : cc) } : gg) };
                      setRule(i, next);
                    }} />
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                    aria-label="Delete condition" onClick={() => {
                      const next = { ...rule, groups: rule.groups.map((gg, idx) => idx === gi ? { ...gg, conditions: gg.conditions.filter((_, x) => x !== ci) } : gg) };
                      setRule(i, next);
                    }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Label className="text-[10px]">Then</Label>
            <Select value={rule.action.type} onValueChange={(v) => {
              const t = v as FlowRule["action"]["type"];
              const stepId = "stepId" in rule.action ? rule.action.stepId : allSteps[0]?.id ?? "";
              const targetId = "targetId" in rule.action ? rule.action.targetId : "";
              const fieldKey = "fieldKey" in rule.action ? rule.action.fieldKey : "";
              let action: FlowRule["action"];
              if (t === "require_field") action = { type: t, fieldKey };
              else if (t === "enable_escalation" || t === "enable_notification") action = { type: t, targetId };
              else action = { type: t, stepId };
              setRule(i, { ...rule, action });
            }}>
              <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="show_step">show step</SelectItem>
                <SelectItem value="hide_step">hide step</SelectItem>
                <SelectItem value="jump_to">jump to step</SelectItem>
                <SelectItem value="require_field">require field</SelectItem>
                <SelectItem value="enable_escalation">enable escalation</SelectItem>
                <SelectItem value="enable_notification">enable notification</SelectItem>
              </SelectContent>
            </Select>
            {"stepId" in rule.action && (
              <Select value={rule.action.stepId} onValueChange={(v) => setRule(i, { ...rule, action: { ...rule.action, stepId: v } as FlowRule["action"] })}>
                <SelectTrigger className="h-7 flex-1 text-xs"><SelectValue placeholder="step" /></SelectTrigger>
                <SelectContent>{allSteps.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {"fieldKey" in rule.action && (
              <Input className="h-7 text-xs flex-1" placeholder="field key" value={rule.action.fieldKey}
                onChange={(e) => setRule(i, { ...rule, action: { type: "require_field", fieldKey: e.target.value } })} />
            )}
            {"targetId" in rule.action && (
              <Input className="h-7 text-xs flex-1" placeholder="target id" value={rule.action.targetId}
                onChange={(e) => setRule(i, { ...rule, action: { ...rule.action, targetId: e.target.value } as FlowRule["action"] })} />
            )}
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
              aria-label="Delete rule" onClick={() => removeRule(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
