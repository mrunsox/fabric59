import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  cryptoRandomId,
  type FormSchemaV1,
  type LogicAction,
  type LogicCondition,
  type LogicConditionGroup,
  type LogicConditionOp,
  type LogicRule,
} from "@/types/form-schema";

interface LogicEditorProps {
  schema: FormSchemaV1;
  onChange: (next: FormSchemaV1) => void;
}

const OP_LABELS: Record<LogicConditionOp, string> = {
  equals: "equals",
  not_equals: "doesn't equal",
  contains: "contains",
  not_contains: "doesn't contain",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  gt: "greater than",
  lt: "less than",
};

/**
 * Logic tab. Manages LogicRule[] over the current schema. Conditions are
 * grouped (AND within group, OR across groups). Actions cover the canonical
 * action set: jump-to-section, end-with-outcome, trigger-notification,
 * prefill, show/hide/require field.
 */
export function LogicEditor({ schema, onChange }: LogicEditorProps) {
  const fieldKeys = schema.sections.flatMap((s) =>
    s.fields.map((f) => ({ key: f.key, label: f.label || f.key })),
  );

  const update = (rules: LogicRule[]) => onChange({ ...schema, logic: rules });

  const addRule = () => {
    update([
      ...schema.logic,
      {
        id: cryptoRandomId(),
        name: `Rule ${schema.logic.length + 1}`,
        groups: [{ all: [] }],
        actions: [],
        enabled: true,
      },
    ]);
  };

  const patchRule = (id: string, patch: Partial<LogicRule>) =>
    update(schema.logic.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Branching, prefill, notifications, and outcome actions for this form.
        </p>
        <Button size="sm" onClick={addRule}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add rule
        </Button>
      </div>

      {schema.logic.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 p-8 text-sm text-center text-muted-foreground">
          No logic rules yet.
        </div>
      ) : (
        schema.logic.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center gap-3">
                <Input
                  value={rule.name ?? ""}
                  onChange={(e) => patchRule(rule.id, { name: e.target.value })}
                  className="max-w-xs"
                />
                <Badge
                  variant={rule.enabled === false ? "secondary" : "default"}
                  className="cursor-pointer"
                  onClick={() => patchRule(rule.id, { enabled: rule.enabled === false })}
                >
                  {rule.enabled === false ? "Paused" : "Active"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto text-destructive/70 hover:text-destructive"
                  onClick={() => update(schema.logic.filter((r) => r.id !== rule.id))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  When (any group matches)
                </p>
                {rule.groups.map((g, gi) => (
                  <ConditionGroup
                    key={gi}
                    group={g}
                    fieldKeys={fieldKeys}
                    onChange={(next) => {
                      const groups = [...rule.groups];
                      groups[gi] = next;
                      patchRule(rule.id, { groups });
                    }}
                    onRemove={
                      rule.groups.length > 1
                        ? () => {
                            const groups = rule.groups.filter((_, i) => i !== gi);
                            patchRule(rule.id, { groups });
                          }
                        : undefined
                    }
                  />
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    patchRule(rule.id, { groups: [...rule.groups, { all: [] }] })
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Add OR group
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Then
                </p>
                {rule.actions.map((a, ai) => (
                  <ActionRow
                    key={ai}
                    action={a}
                    schema={schema}
                    onChange={(next) => {
                      const actions = [...rule.actions];
                      actions[ai] = next;
                      patchRule(rule.id, { actions });
                    }}
                    onRemove={() =>
                      patchRule(rule.id, {
                        actions: rule.actions.filter((_, i) => i !== ai),
                      })
                    }
                  />
                ))}
                <Select
                  onValueChange={(t) => {
                    const next = makeAction(t as LogicAction["type"], schema);
                    patchRule(rule.id, { actions: [...rule.actions, next] });
                  }}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="+ Add action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jump_to_section">Jump to section</SelectItem>
                    <SelectItem value="end_with_outcome">End with outcome</SelectItem>
                    <SelectItem value="trigger_notification">Trigger notification</SelectItem>
                    <SelectItem value="prefill">Prefill field</SelectItem>
                    <SelectItem value="show_field">Show field</SelectItem>
                    <SelectItem value="hide_field">Hide field</SelectItem>
                    <SelectItem value="require_field">Require field</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function ConditionGroup({
  group,
  fieldKeys,
  onChange,
  onRemove,
}: {
  group: LogicConditionGroup;
  fieldKeys: { key: string; label: string }[];
  onChange: (next: LogicConditionGroup) => void;
  onRemove?: () => void;
}) {
  const setCond = (idx: number, patch: Partial<LogicCondition>) => {
    const all = [...group.all];
    all[idx] = { ...all[idx], ...patch };
    onChange({ all });
  };
  return (
    <div className="rounded-md border border-border/60 p-3 space-y-2">
      {group.all.map((c, ci) => (
        <div key={ci} className="flex flex-wrap gap-2 items-center">
          <Select value={c.fieldKey} onValueChange={(v) => setCond(ci, { fieldKey: v })}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Field" /></SelectTrigger>
            <SelectContent>
              {fieldKeys.map((f) => (
                <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={c.op} onValueChange={(v) => setCond(ci, { op: v as LogicConditionOp })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(OP_LABELS) as LogicConditionOp[]).map((op) => (
                <SelectItem key={op} value={op}>{OP_LABELS[op]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!["is_empty", "is_not_empty"].includes(c.op) && (
            <Input
              className="w-40"
              value={String(c.value ?? "")}
              onChange={(e) => setCond(ci, { value: e.target.value })}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange({ all: group.all.filter((_, i) => i !== ci) })}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              all: [...group.all, { fieldKey: fieldKeys[0]?.key ?? "", op: "equals", value: "" }],
            })
          }
        >
          <Plus className="h-3 w-3 mr-1" /> AND
        </Button>
        {onRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            Remove group
          </Button>
        )}
      </div>
    </div>
  );
}

function makeAction(type: LogicAction["type"], schema: FormSchemaV1): LogicAction {
  switch (type) {
    case "jump_to_section":
      return { type, sectionId: schema.sections[0]?.id ?? "" };
    case "end_with_outcome":
      return { type, outcomeKey: schema.outcomes[0]?.key ?? "" };
    case "trigger_notification":
      return { type, notificationKey: "" };
    case "prefill":
      return { type, fieldKey: "", value: "" };
    case "show_field":
    case "hide_field":
    case "require_field":
      return { type, fieldKey: "" };
  }
}

function ActionRow({
  action,
  schema,
  onChange,
  onRemove,
}: {
  action: LogicAction;
  schema: FormSchemaV1;
  onChange: (next: LogicAction) => void;
  onRemove: () => void;
}) {
  const fieldOptions = schema.sections.flatMap((s) => s.fields);
  return (
    <div className="flex flex-wrap gap-2 items-center rounded-md bg-muted/40 px-2 py-1.5">
      <Badge variant="outline" className="font-normal">{action.type.replace(/_/g, " ")}</Badge>

      {action.type === "jump_to_section" && (
        <Select value={action.sectionId} onValueChange={(v) => onChange({ ...action, sectionId: v })}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Section" /></SelectTrigger>
          <SelectContent>
            {schema.sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {action.type === "end_with_outcome" && (
        <Input className="w-56" placeholder="outcome_key" value={action.outcomeKey} onChange={(e) => onChange({ ...action, outcomeKey: e.target.value })} />
      )}
      {action.type === "trigger_notification" && (
        <Input className="w-56" placeholder="notification_key" value={action.notificationKey} onChange={(e) => onChange({ ...action, notificationKey: e.target.value })} />
      )}
      {(action.type === "prefill" ||
        action.type === "show_field" ||
        action.type === "hide_field" ||
        action.type === "require_field") && (
        <Select value={action.fieldKey} onValueChange={(v) => onChange({ ...action, fieldKey: v })}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Field" /></SelectTrigger>
          <SelectContent>
            {fieldOptions.map((f) => <SelectItem key={f.id} value={f.key}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {action.type === "prefill" && (
        <Input className="w-40" value={String(action.value ?? "")} onChange={(e) => onChange({ ...action, value: e.target.value })} />
      )}

      <Button variant="ghost" size="icon" className="ml-auto" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default LogicEditor;
