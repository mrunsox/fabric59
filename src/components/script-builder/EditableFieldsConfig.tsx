import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings2, Plus, Trash2 } from "lucide-react";

interface EditableField {
  id: string;
  nodeId: string;
  fieldKey: string;
  label: string;
  editable: boolean;
}

interface EditableFieldsConfigProps {
  fields: EditableField[];
  onChange: (fields: EditableField[]) => void;
}

export function EditableFieldsConfig({ fields, onChange }: EditableFieldsConfigProps) {
  const [open, setOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");

  const toggleField = (id: string) => {
    onChange(fields.map(f => f.id === id ? { ...f, editable: !f.editable } : f));
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const addField = () => {
    if (!newLabel.trim() || !newKey.trim()) return;
    onChange([...fields, {
      id: crypto.randomUUID(),
      nodeId: "",
      fieldKey: newKey.trim(),
      label: newLabel.trim(),
      editable: true,
    }]);
    setNewLabel("");
    setNewKey("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-3.5 w-3.5" /> Editable Fields
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Client-Editable Fields</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Configure which script fields clients can edit from their dashboard.
        </p>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {fields.map(f => (
            <div key={f.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <Switch checked={f.editable} onCheckedChange={() => toggleField(f.id)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground font-mono">{f.fieldKey}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeField(f.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {fields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No fields configured</p>}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Label" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="flex-1" />
          <Input placeholder="Field key" value={newKey} onChange={e => setNewKey(e.target.value)} className="flex-1" />
          <Button size="icon" onClick={addField} disabled={!newLabel.trim() || !newKey.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
