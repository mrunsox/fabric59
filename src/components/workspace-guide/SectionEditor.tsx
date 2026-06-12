import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { WorkspaceGuideSection } from "@/types/workspace-guide";
import { newId } from "@/lib/workspace-guide/schema";

interface SectionEditorProps {
  section: WorkspaceGuideSection;
  onChange: (next: WorkspaceGuideSection) => void;
}

export function SectionEditor({ section, onChange }: SectionEditorProps) {
  const patch = (partial: Partial<WorkspaceGuideSection>) => onChange({ ...section, ...partial });

  const setField = (id: string, partial: Partial<{ label: string; value: string }>) =>
    patch({
      fields: section.fields.map((f) => (f.id === id ? { ...f, ...partial } : f)),
    });

  const addField = () =>
    patch({ fields: [...section.fields, { id: newId("fld"), label: "Field", value: "" }] });

  const removeField = (id: string) =>
    patch({ fields: section.fields.filter((f) => f.id !== id) });

  return (
    <div className="space-y-4" data-testid="section-editor">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Section label</Label>
          <Input
            aria-label="Section label"
            value={section.label}
            onChange={(e) => patch({ label: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Helper note (optional)</Label>
          <Input
            aria-label="Helper note"
            value={section.helper ?? ""}
            placeholder="Short instructions to the editor"
            onChange={(e) => patch({ helper: e.target.value || undefined })}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-muted/30 px-3 py-2">
        <label className="flex items-center gap-2 text-xs">
          <Switch
            checked={section.visibility === "agent"}
            onCheckedChange={(v) => patch({ visibility: v ? "agent" : "internal" })}
            aria-label="Agent-visible"
          />
          Agent-visible
        </label>
        <label className="flex items-center gap-2 text-xs">
          <Switch
            checked={section.required}
            onCheckedChange={(v) => patch({ required: v })}
            aria-label="Required"
          />
          Required
        </label>
        <label className="flex items-center gap-2 text-xs">
          <Switch
            checked={section.enabled}
            onCheckedChange={(v) => patch({ enabled: v })}
            aria-label="Enabled"
          />
          Enabled
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Fields</p>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addField}>
            <Plus className="h-3 w-3 mr-1" /> Add field
          </Button>
        </div>
        {section.fields.length === 0 && (
          <p className="text-xs text-muted-foreground">No fields yet.</p>
        )}
        {section.fields.map((f) => (
          <div
            key={f.id}
            data-testid={`field-row-${f.id}`}
            className="rounded-md border border-border bg-background p-2 space-y-2"
          >
            <div className="flex items-center gap-2">
              <Input
                aria-label="Field label"
                value={f.label}
                placeholder="Field label"
                onChange={(e) => setField(f.id, { label: e.target.value })}
                className="h-8 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                aria-label="Delete field"
                onClick={() => removeField(f.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Textarea
              aria-label={`${f.label} value`}
              value={f.value}
              rows={3}
              placeholder="Content for this field…"
              onChange={(e) => setField(f.id, { value: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default SectionEditor;
