import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Database, Plus, Trash2 } from "lucide-react";
import type { Node } from "@xyflow/react";

interface DataField {
  id: string;
  key: string;
  label: string;
  type: "text" | "number" | "date" | "phone" | "email" | "select";
  required: boolean;
  options?: string[];
}

interface NodeDataFieldsEditorProps {
  node: Node;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
}

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "select", label: "Select" },
];

export function NodeDataFieldsEditor({ node, onUpdate }: NodeDataFieldsEditorProps) {
  const [open, setOpen] = useState(false);
  const fields: DataField[] = (node.data.dataFields as DataField[]) || [];

  const updateFields = (updated: DataField[]) => {
    onUpdate(node.id, { ...node.data, dataFields: updated });
  };

  const addField = () => {
    updateFields([...fields, {
      id: crypto.randomUUID(),
      key: "",
      label: "",
      type: "text",
      required: false,
    }]);
  };

  const updateField = (id: string, patch: Partial<DataField>) => {
    updateFields(fields.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  const removeField = (id: string) => {
    updateFields(fields.filter(f => f.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Database className="h-3 w-3" /> Data Fields ({fields.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Data Fields — {node.data.label as string}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Fields captured at this node during a call session.
        </p>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {fields.map(f => (
            <div key={f.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Label"
                  value={f.label}
                  onChange={e => updateField(f.id, { label: e.target.value })}
                  className="flex-1 h-8 text-sm"
                />
                <Input
                  placeholder="key"
                  value={f.key}
                  onChange={e => updateField(f.id, { key: e.target.value })}
                  className="flex-1 h-8 text-sm font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={f.type} onValueChange={v => updateField(f.id, { type: v as DataField["type"] })}>
                  <SelectTrigger className="h-8 text-sm w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={e => updateField(f.id, { required: e.target.checked })}
                    className="rounded"
                  />
                  Required
                </label>
                <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto text-destructive" onClick={() => removeField(f.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No data fields configured</p>
          )}
        </div>
        <Button variant="outline" onClick={addField} className="w-full gap-1.5">
          <Plus className="h-4 w-4" /> Add Field
        </Button>
      </DialogContent>
    </Dialog>
  );
}
