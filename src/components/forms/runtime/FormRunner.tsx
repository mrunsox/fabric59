import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import type { FormField, FormSchemaV1 } from "@/types/form-schema";

interface FormRunnerProps {
  schema: FormSchemaV1;
  /** Optional initial values keyed by field.key. */
  initialValues?: Record<string, unknown>;
  /** Receives the agent's submitted values keyed by field.key. */
  onSubmit?: (values: Record<string, unknown>) => void;
}

/**
 * Canonical agent-runner. Renders a FormSchemaV1 as the agent sees it
 * during a call. Phase C ships visual + state coverage for every field
 * type; deeper validation/branching evaluation is incremental on top of
 * this contract.
 */
export function FormRunner({ schema, initialValues = {}, onSubmit }: FormRunnerProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [sectionIdx, setSectionIdx] = useState(0);
  const total = schema.sections.length;
  const section = schema.sections[sectionIdx];

  const setVal = (key: string, v: unknown) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  if (!section) {
    return <p className="text-sm text-muted-foreground">No sections to render.</p>;
  }

  return (
    <div className="space-y-4" data-testid="form-runner">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{section.title}</CardTitle>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Section {sectionIdx + 1} of {total}
            </span>
          </div>
          {section.description && (
            <p className="text-sm text-muted-foreground">{section.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {section.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fields in this section.</p>
          ) : (
            section.fields.map((f) => (
              <FieldRender
                key={f.id}
                field={f}
                value={values[f.key]}
                onChange={(v) => setVal(f.key, v)}
              />
            ))
          )}
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={sectionIdx === 0}
          onClick={() => setSectionIdx((i) => Math.max(0, i - 1))}
        >
          Back
        </Button>
        {sectionIdx < total - 1 ? (
          <Button size="sm" onClick={() => setSectionIdx((i) => Math.min(total - 1, i + 1))}>
            Next
          </Button>
        ) : (
          <Button size="sm" onClick={() => onSubmit?.(values)}>
            Submit
          </Button>
        )}
      </div>
    </div>
  );
}

function FieldRender({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = `runner-${field.id}`;
  const labelEl = (
    <Label htmlFor={id} className="flex items-center gap-1">
      {field.label}
      {field.required && <span className="text-destructive">*</span>}
    </Label>
  );
  const help = field.helpText && (
    <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
  );

  switch (field.type) {
    case "heading":
      return <h3 className="text-base font-semibold tracking-tight">{field.label}</h3>;
    case "divider":
      return <hr className="border-border/60" />;
    case "hidden":
      return null;
    case "textarea":
      return (
        <div className="space-y-1.5" data-field={field.key} data-field-type={field.type}>
          {labelEl}
          <Textarea id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
          {help}
        </div>
      );
    case "select":
      return (
        <div className="space-y-1.5" data-field={field.key} data-field-type={field.type}>
          {labelEl}
          <Select value={(value as string) ?? ""} onValueChange={onChange}>
            <SelectTrigger id={id}><SelectValue placeholder={field.placeholder ?? "Select…"} /></SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {help}
        </div>
      );
    case "radio":
      return (
        <fieldset className="space-y-1.5" data-field={field.key} data-field-type={field.type}>
          <legend className="text-sm font-medium">{field.label}</legend>
          {(field.options ?? []).map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={field.key}
                value={o.value}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
              />
              {o.label}
            </label>
          ))}
          {help}
        </fieldset>
      );
    case "checkbox":
    case "toggle":
      return (
        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2" data-field={field.key} data-field-type={field.type}>
          <div>{labelEl}{help}</div>
          <Switch id={id} checked={!!value} onCheckedChange={onChange} />
        </div>
      );
    case "checkbox_group": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <fieldset className="space-y-1.5" data-field={field.key} data-field-type={field.type}>
          <legend className="text-sm font-medium">{field.label}</legend>
          {(field.options ?? []).map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={arr.includes(o.value)}
                onChange={(e) => {
                  if (e.target.checked) onChange([...arr, o.value]);
                  else onChange(arr.filter((v) => v !== o.value));
                }}
              />
              {o.label}
            </label>
          ))}
          {help}
        </fieldset>
      );
    }
    case "multiselect": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5" data-field={field.key} data-field-type={field.type}>
          {labelEl}
          <select
            multiple
            id={id}
            className="w-full rounded-md border border-border/60 bg-background p-2 text-sm"
            value={arr}
            onChange={(e) =>
              onChange(Array.from(e.target.selectedOptions).map((o) => o.value))
            }
          >
            {(field.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {help}
        </div>
      );
    }
    case "rating": {
      const max = field.validation?.max ?? 5;
      const cur = (value as number) ?? 0;
      return (
        <div className="space-y-1.5" data-field={field.key} data-field-type={field.type}>
          {labelEl}
          <div className="flex items-center gap-1">
            {Array.from({ length: max }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange(i + 1)}
                className="p-0.5"
                aria-label={`${i + 1} of ${max}`}
              >
                <Star className={`h-5 w-5 ${i < cur ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
              </button>
            ))}
          </div>
          {help}
        </div>
      );
    }
    case "slider": {
      const min = field.validation?.min ?? 0;
      const max = field.validation?.max ?? 100;
      const cur = typeof value === "number" ? value : min;
      return (
        <div className="space-y-2" data-field={field.key} data-field-type={field.type}>
          {labelEl}
          <Slider min={min} max={max} value={[cur]} onValueChange={([v]) => onChange(v)} />
          <p className="text-[11px] text-muted-foreground tabular-nums">{cur}</p>
          {help}
        </div>
      );
    }
    case "address":
    case "signature":
    case "file":
      return (
        <div className="space-y-1.5" data-field={field.key} data-field-type={field.type}>
          {labelEl}
          <Input id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? `${field.type} (preview)`} />
          {help}
        </div>
      );
    case "currency":
    case "number": {
      return (
        <div className="space-y-1.5" data-field={field.key} data-field-type={field.type}>
          {labelEl}
          <Input
            id={id}
            type="number"
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            placeholder={field.placeholder}
          />
          {help}
        </div>
      );
    }
    case "date":
    case "time":
    case "datetime": {
      const map = { date: "date", time: "time", datetime: "datetime-local" } as const;
      return (
        <div className="space-y-1.5" data-field={field.key} data-field-type={field.type}>
          {labelEl}
          <Input
            id={id}
            type={map[field.type]}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {help}
        </div>
      );
    }
    case "email":
    case "phone":
    case "url":
    case "text":
    default:
      return (
        <div className="space-y-1.5" data-field={field.key} data-field-type={field.type}>
          {labelEl}
          <Input
            id={id}
            type={field.type === "email" ? "email" : field.type === "url" ? "url" : field.type === "phone" ? "tel" : "text"}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {help}
        </div>
      );
  }
}

export default FormRunner;
