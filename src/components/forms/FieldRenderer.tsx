import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FormField } from "@/types/form-builder";

export function FieldRenderer({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const id = `field-${field.id}`;
  const labelEl = (
    <Label htmlFor={id} className="text-sm">
      {field.label} {field.required && <span className="text-destructive">*</span>}
    </Label>
  );

  let control: React.ReactNode;
  switch (field.type) {
    case "textarea":
      control = (
        <Textarea
          id={id}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={3}
        />
      );
      break;
    case "select":
      control = (
        <Select value={(value as string) ?? ""} onValueChange={(v) => onChange(v)} disabled={disabled}>
          <SelectTrigger id={id}>
            <SelectValue placeholder={field.placeholder ?? "Select..."} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      break;
    case "checkbox":
      control = (
        <div className="flex items-center gap-2">
          <Checkbox
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(c) => onChange(Boolean(c))}
            disabled={disabled}
          />
          <span className="text-sm text-muted-foreground">{field.placeholder ?? "Yes"}</span>
        </div>
      );
      break;
    case "number":
      control = (
        <Input
          id={id}
          type="number"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      );
      break;
    case "email":
    case "phone":
    case "date":
    case "text":
    default:
      control = (
        <Input
          id={id}
          type={field.type === "email" ? "email" : field.type === "date" ? "date" : field.type === "phone" ? "tel" : "text"}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      );
  }

  return (
    <div className="space-y-1.5">
      {labelEl}
      {control}
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
    </div>
  );
}
