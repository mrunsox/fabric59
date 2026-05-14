import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, ChevronUp, ChevronDown, GitBranch } from "lucide-react";
import type { FormField, FormFieldType, FormSchema, FormConditionOp } from "@/types/form-builder";
import { newField } from "@/types/form-builder";

const TYPES: FormFieldType[] = ["text", "textarea", "email", "phone", "number", "select", "checkbox", "date"];
const COND_OPS: FormConditionOp[] = ["equals", "not_equals", "is_empty", "is_not_empty"];

export function FormBuilderEditor({
  schema,
  onChange,
}: {
  schema: FormSchema;
  onChange: (next: FormSchema) => void;
}) {
  const fields = schema.fields;
  const [expandedId, setExpandedId] = useState<string | null>(fields[0]?.id ?? null);

  const update = (id: string, patch: Partial<FormField>) => {
    onChange({
      ...schema,
      fields: fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  };

  const remove = (id: string) => {
    onChange({ ...schema, fields: fields.filter((f) => f.id !== id) });
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = fields.findIndex((f) => f.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= fields.length) return;
    const next = [...fields];
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    onChange({ ...schema, fields: next });
  };

  const add = (type: FormFieldType) => {
    const f = newField(type);
    onChange({ ...schema, fields: [...fields, f] });
    setExpandedId(f.id);
  };

  const otherFields = useMemo(
    () => (fid: string) => fields.filter((f) => f.id !== fid),
    [fields]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Add a field</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Button key={t} type="button" size="sm" variant="outline" onClick={() => add(t)}>
                <Plus className="h-3 w-3 mr-1" /> {t}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {fields.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No fields yet. Add one above to start building.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {fields.map((f) => {
          const isOpen = expandedId === f.id;
          return (
            <Card key={f.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-left flex-1"
                    onClick={() => setExpandedId(isOpen ? null : f.id)}
                  >
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="text-muted-foreground text-xs uppercase tracking-wide">{f.type}</span>
                      {f.label}
                      {f.required && <span className="text-destructive text-xs">required</span>}
                      {f.visibleIf && <GitBranch className="h-3 w-3 text-accent" />}
                    </CardTitle>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" onClick={() => move(f.id, -1)}>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" onClick={() => move(f.id, 1)}>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" onClick={() => remove(f.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent className="space-y-3 border-t pt-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Label</Label>
                      <Input value={f.label} onChange={(e) => update(f.id, { label: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Field key</Label>
                      <Input
                        value={f.key}
                        onChange={(e) => update(f.id, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "_") })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Type</Label>
                      <Select value={f.type} onValueChange={(v) => update(f.id, { type: v as FormFieldType })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Placeholder</Label>
                      <Input value={f.placeholder ?? ""} onChange={(e) => update(f.id, { placeholder: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Help text</Label>
                    <Textarea
                      value={f.helpText ?? ""}
                      onChange={(e) => update(f.id, { helpText: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch checked={f.required} onCheckedChange={(c) => update(f.id, { required: c })} />
                    <Label className="text-sm">Required</Label>
                  </div>

                  {f.type === "select" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Options (label,value per line)</Label>
                      <Textarea
                        rows={4}
                        value={(f.options ?? []).map((o) => `${o.label},${o.value}`).join("\n")}
                        onChange={(e) =>
                          update(f.id, {
                            options: e.target.value
                              .split("\n")
                              .map((line) => line.split(","))
                              .filter((parts) => parts[0]?.trim())
                              .map((parts) => ({
                                label: parts[0].trim(),
                                value: (parts[1] ?? parts[0]).trim(),
                              })),
                          })
                        }
                      />
                    </div>
                  )}

                  <div className="space-y-2 border-t pt-3">
                    <Label className="text-xs flex items-center gap-1.5">
                      <GitBranch className="h-3 w-3" /> Conditional visibility
                    </Label>
                    <div className="grid sm:grid-cols-3 gap-2">
                      <Select
                        value={f.visibleIf?.fieldId ?? "__none"}
                        onValueChange={(v) =>
                          update(f.id, {
                            visibleIf: v === "__none" ? undefined : { fieldId: v, op: f.visibleIf?.op ?? "equals", value: f.visibleIf?.value },
                          })
                        }
                      >
                        <SelectTrigger><SelectValue placeholder="Always visible" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Always visible</SelectItem>
                          {otherFields(f.id).map((o) => (
                            <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {f.visibleIf && (
                        <>
                          <Select
                            value={f.visibleIf.op}
                            onValueChange={(v) =>
                              update(f.id, { visibleIf: { ...f.visibleIf!, op: v as FormConditionOp } })
                            }
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {COND_OPS.map((op) => <SelectItem key={op} value={op}>{op.replace("_", " ")}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {(f.visibleIf.op === "equals" || f.visibleIf.op === "not_equals") && (
                            <Input
                              placeholder="value"
                              value={f.visibleIf.value ?? ""}
                              onChange={(e) =>
                                update(f.id, { visibleIf: { ...f.visibleIf!, value: e.target.value } })
                              }
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t pt-3">
                    <Label className="text-xs">Submission mapping path</Label>
                    <Input
                      placeholder="e.g. lead.first_name"
                      value={f.mapping ?? ""}
                      onChange={(e) => update(f.id, { mapping: e.target.value || undefined })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Dot path used when forwarding the submission to a campaign or downstream system.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
