import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { FIELD_TYPE_BY_KEY } from "@/config/formFieldTypes";
import type { FormField } from "@/types/form-schema";

interface FieldInspectorProps {
  field: FormField | null;
  onChange: (next: FormField) => void;
}

/**
 * Right-rail inspector. Edits the selected field in place; debouncing is the
 * caller's responsibility (the builder buffers + writes through the schema
 * mutation hook).
 */
export function FieldInspector({ field, onChange }: FieldInspectorProps) {
  if (!field) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
        Select a field to edit its properties.
      </div>
    );
  }
  const meta = FIELD_TYPE_BY_KEY[field.type];
  const update = <K extends keyof FormField>(k: K, v: FormField[K]) =>
    onChange({ ...field, [k]: v });

  return (
    <div className="space-y-4" data-testid="field-inspector">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="font-normal">
          {meta?.label ?? field.type}
        </Badge>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
          Field properties
        </span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-label">Label</Label>
        <Input
          id="f-label"
          value={field.label}
          onChange={(e) => update("label", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-key">Machine key</Label>
        <Input
          id="f-key"
          value={field.key}
          onChange={(e) => update("key", e.target.value.replace(/\s+/g, "_"))}
        />
        <p className="text-[11px] text-muted-foreground">
          Used in submissions, logic conditions, and CRM mappings.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-help">Help text</Label>
        <Textarea
          id="f-help"
          rows={2}
          value={field.helpText ?? ""}
          onChange={(e) => update("helpText", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-placeholder">Placeholder</Label>
        <Input
          id="f-placeholder"
          value={field.placeholder ?? ""}
          onChange={(e) => update("placeholder", e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
        <div>
          <Label htmlFor="f-required" className="cursor-pointer">Required</Label>
          <p className="text-[11px] text-muted-foreground">
            Agents must answer before submitting.
          </p>
        </div>
        <Switch
          id="f-required"
          checked={!!field.required}
          onCheckedChange={(v) => update("required", v)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Role lock</Label>
        <Select
          value={field.roleLock ?? "none"}
          onValueChange={(v) =>
            update("roleLock", v === "none" ? null : (v as FormField["roleLock"]))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No lock</SelectItem>
            <SelectItem value="agent">Agent only</SelectItem>
            <SelectItem value="supervisor">Supervisor only</SelectItem>
            <SelectItem value="admin">Admin only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {meta?.hasOptions && (
        <div className="space-y-2">
          <Label>Options</Label>
          <div className="space-y-2">
            {(field.options ?? []).map((opt, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  placeholder="Label"
                  value={opt.label}
                  onChange={(e) => {
                    const next = [...(field.options ?? [])];
                    next[idx] = { ...next[idx], label: e.target.value };
                    update("options", next);
                  }}
                />
                <Input
                  placeholder="value"
                  value={opt.value}
                  onChange={(e) => {
                    const next = [...(field.options ?? [])];
                    next[idx] = { ...next[idx], value: e.target.value };
                    update("options", next);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const next = [...(field.options ?? [])];
                    next.splice(idx, 1);
                    update("options", next);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const next = [...(field.options ?? [])];
                const i = next.length + 1;
                next.push({ label: `Option ${i}`, value: `option_${i}` });
                update("options", next);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add option
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
        <div>
          <Label htmlFor="f-ai" className="cursor-pointer">AI suggestion</Label>
          <p className="text-[11px] text-muted-foreground">
            Show an inline assistant-suggested value during the call.
          </p>
        </div>
        <Switch
          id="f-ai"
          checked={!!field.ai?.enabled}
          onCheckedChange={(v) =>
            update("ai", { enabled: v, prompt: field.ai?.prompt ?? "" })
          }
        />
      </div>
    </div>
  );
}

export default FieldInspector;
