import { ScriptNode, InputField } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DataCaptureNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
}

export function DataCaptureNodeConfig({ node, onUpdate }: DataCaptureNodeConfigProps) {
  const fields = node.inputFields || [];
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const addField = () => {
    const newField: InputField = {
      id: crypto.randomUUID(),
      label: 'New Field',
      type: 'text',
      required: false,
      placeholder: '',
      variableName: `field_${fields.length + 1}`
    };
    onUpdate({ inputFields: [...fields, newField] });
    setExpandedField(newField.id);
  };

  const updateField = (id: string, updates: Partial<InputField>) => {
    onUpdate({
      inputFields: fields.map(f => f.id === id ? { ...f, ...updates } : f)
    });
  };

  const removeField = (id: string) => {
    onUpdate({ inputFields: fields.filter(f => f.id !== id) });
    if (expandedField === id) setExpandedField(null);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Form Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Data Capture Form"
        />
      </div>

      <div className="space-y-2">
        <Label>Instructions</Label>
        <Input
          value={node.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Please provide the following information..."
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Form Fields</Label>
          <Button variant="outline" size="sm" onClick={addField}>
            <Plus className="w-4 h-4 mr-1" />
            Add Field
          </Button>
        </div>

        <div className="space-y-2">
          {fields.map((field) => (
            <Collapsible 
              key={field.id} 
              open={expandedField === field.id}
              onOpenChange={(open) => setExpandedField(open ? field.id : null)}
            >
              <div className="rounded-lg border border-border overflow-hidden">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-2 p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <span className="flex-1 text-left font-medium text-sm">{field.label}</span>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                      {field.type}
                    </span>
                    {field.required && (
                      <span className="text-xs text-destructive">*</span>
                    )}
                    {expandedField === field.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-3 space-y-3 border-t border-border">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          placeholder="Field label"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value: InputField['type']) => updateField(field.id, { type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="dropdown">Dropdown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Variable Name</Label>
                        <Input
                          value={field.variableName}
                          onChange={(e) => updateField(field.id, { variableName: e.target.value })}
                          placeholder="fieldName"
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Placeholder</Label>
                        <Input
                          value={field.placeholder || ''}
                          onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          placeholder="Enter placeholder..."
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={field.required}
                          onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                        />
                        <Label className="text-xs">Required</Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeField(field.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
          {fields.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
              No fields added yet
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Each field creates a variable: $field_{'{'}variableName{'}'}
        </p>
      </div>
    </div>
  );
}