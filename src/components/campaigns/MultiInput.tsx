import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface MultiInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  helperText?: string;
}

export function MultiInput({ values, onChange, placeholder, helperText }: MultiInputProps) {
  const addRow = () => onChange([...values, ""]);
  const removeRow = (index: number) => onChange(values.filter((_, i) => i !== index));
  const updateRow = (index: number, value: string) => {
    const updated = [...values];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => updateRow(index, e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
          {values.length > 1 && (
            <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(index)} className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add
      </Button>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
