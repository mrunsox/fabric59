import { useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink, Info, MessageSquareQuote, Sparkles, Star } from "lucide-react";
import { FIELD_TYPE_BY_KEY } from "@/config/formFieldTypes";
import { evaluateSchema, validateField } from "@/lib/forms/evaluateLogic";
import { cn } from "@/lib/utils";
import type { FormField, FormSchemaV1 } from "@/types/form-schema";

interface FormRunnerProps {
  schema: FormSchemaV1;
  /** Optional initial values keyed by field.key. */
  initialValues?: Record<string, unknown>;
  /** Receives the agent's submitted values keyed by field.key + outcome metadata. */
  onSubmit?: (result: {
    values: Record<string, unknown>;
    outcomeKey?: string | null;
    notifications: string[];
  }) => void;
}

/**
 * Canonical agent-runner. Drives FormSchemaV1 with the logic evaluator —
 * hides fields, jumps sections, short-circuits on outcomes, validates required.
 */
export function FormRunner({ schema, initialValues = {}, onSubmit }: FormRunnerProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [forceEnded, setForceEnded] = useState<string | null>(null);

  const evaluation = useMemo(() => evaluateSchema(schema, values), [schema, values]);

  // Apply prefill writes once when they appear.
  useEffect(() => {
    const writes = evaluation.prefill;
    const keys = Object.keys(writes);
    if (keys.length === 0) return;
    setValues((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const k of keys) {
        if (next[k] === undefined || next[k] === null || next[k] === "") {
          next[k] = writes[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [evaluation.prefill]);

  // Honor jump-to-section on rule fire (only forward jumps; ignore re-jumps to same).
  useEffect(() => {
    const target = evaluation.jumpToSectionId;
    if (!target) return;
    const idx = schema.sections.findIndex((s) => s.id === target);
    if (idx >= 0 && idx !== sectionIdx) setSectionIdx(idx);
  }, [evaluation.jumpToSectionId, schema.sections, sectionIdx]);

  const total = schema.sections.length;
  const section = schema.sections[sectionIdx];

  const setVal = (key: string, v: unknown) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const endedKey = forceEnded ?? evaluation.endedOutcomeKey;
  if (endedKey) {
    const outcome = schema.outcomes.find((o) => o.key === endedKey);
    return (
      <Card data-testid="form-runner" data-ended-outcome={endedKey}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {outcome?.label ?? endedKey}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {outcome?.description && <p>{outcome.description}</p>}
          <p>This call ended with the outcome above.</p>
          <Button
            size="sm"
            onClick={() =>
              onSubmit?.({
                values,
                outcomeKey: endedKey,
                notifications: evaluation.notificationsToFire,
              })
            }
          >
            Wrap up
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!section) {
    return <p className="text-sm text-muted-foreground">No sections to render.</p>;
  }

  const visibleFields = section.fields.filter(
    (f) => !evaluation.hiddenFieldKeys.has(f.key),
  );

  const collectableFields = visibleFields.filter(
    (f) => !FIELD_TYPE_BY_KEY[f.type]?.presentational,
  );

  const validateCurrentSection = (): boolean => {
    const next: Record<string, string> = {};
    for (const f of collectableFields) {
      const required =
        Boolean(f.required) || evaluation.requiredFieldKeys.has(f.key);
      const err = validateField(f, values[f.key], required);
      if (err) next[f.key] = err;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onNext = () => {
    if (!validateCurrentSection()) return;
    setSectionIdx((i) => Math.min(total - 1, i + 1));
  };

  const onSubmitFinal = () => {
    if (!validateCurrentSection()) return;
    onSubmit?.({
      values,
      outcomeKey: evaluation.endedOutcomeKey,
      notifications: evaluation.notificationsToFire,
    });
  };

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
          {visibleFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fields in this section.</p>
          ) : (
            visibleFields.map((f) => (
              <FieldRender
                key={f.id}
                field={f}
                value={values[f.key]}
                error={errors[f.key]}
                requiredFromLogic={evaluation.requiredFieldKeys.has(f.key)}
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
          onClick={() => {
            setErrors({});
            setSectionIdx((i) => Math.max(0, i - 1));
          }}
        >
          Back
        </Button>
        <div className="flex items-center gap-2">
          {schema.outcomes.length > 0 && sectionIdx === total - 1 && (
            <Select onValueChange={(k) => setForceEnded(k)}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="Pick outcome…" />
              </SelectTrigger>
              <SelectContent>
                {schema.outcomes.map((o) => (
                  <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {sectionIdx < total - 1 ? (
            <Button size="sm" onClick={onNext}>Next</Button>
          ) : (
            <Button size="sm" onClick={onSubmitFinal}>Submit</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldRender({
  field,
  value,
  error,
  requiredFromLogic,
  onChange,
}: {
  field: FormField;
  value: unknown;
  error?: string;
  requiredFromLogic?: boolean;
  onChange: (v: unknown) => void;
}) {
  const id = `runner-${field.id}`;
  const isRequired = Boolean(field.required) || Boolean(requiredFromLogic);
  const labelEl = (
    <Label htmlFor={id} className="flex items-center gap-1">
      {field.label}
      {isRequired && <span className="text-destructive">*</span>}
    </Label>
  );
  const help = field.helpText && (
    <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
  );
  const errEl = error && <p className="text-[11px] text-destructive">{error}</p>;
  const aiHint = field.ai?.enabled && (
    <div className="flex items-start gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-[11px] text-primary">
      <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
      <span className="text-primary/80">
        AI suggestion will appear here {field.ai.prompt ? `· ${field.ai.prompt}` : ""}
      </span>
    </div>
  );

  const wrap = (control: React.ReactNode) => (
    <div className="space-y-1.5" data-field={field.key} data-field-type={field.type}>
      {labelEl}
      {control}
      {aiHint}
      {help}
      {errEl}
    </div>
  );

  switch (field.type) {
    case "heading":
      return <h3 className="text-base font-semibold tracking-tight">{field.label}</h3>;
    case "divider":
      return <hr className="border-border/60" />;
    case "hidden":
      return null;
    case "info":
      return (
        <div
          data-field={field.key}
          data-field-type={field.type}
          className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm flex gap-2"
        >
          <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="space-y-1">
            {field.label && (
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {field.label}
              </p>
            )}
            <p className="whitespace-pre-wrap leading-relaxed">{field.content ?? ""}</p>
          </div>
        </div>
      );
    case "script_block":
      return (
        <div
          data-field={field.key}
          data-field-type={field.type}
          className="rounded-md border-l-4 border-primary bg-primary/5 p-3 text-sm"
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary/80 mb-1">
            <MessageSquareQuote className="h-3 w-3" />
            {field.label || "Say this"}
          </div>
          <p className="whitespace-pre-wrap leading-relaxed text-foreground">
            {field.content ?? ""}
          </p>
        </div>
      );
    case "connector_link":
      return (
        <a
          data-field={field.key}
          data-field-type={field.type}
          href={field.href || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-sm",
            "hover:bg-muted/60 hover:border-primary/40 transition-colors",
          )}
        >
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{field.label || "Open link"}</span>
        </a>
      );
    case "textarea":
      return wrap(
        <Textarea id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />,
      );
    case "select":
      return wrap(
        <Select value={(value as string) ?? ""} onValueChange={onChange}>
          <SelectTrigger id={id}><SelectValue placeholder={field.placeholder ?? "Select…"} /></SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>,
      );
    case "radio":
      return (
        <fieldset className="space-y-1.5" data-field={field.key} data-field-type={field.type}>
          <legend className="text-sm font-medium flex items-center gap-1">
            {field.label}
            {isRequired && <span className="text-destructive">*</span>}
          </legend>
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
          {errEl}
        </fieldset>
      );
    case "checkbox":
    case "toggle":
      return (
        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2" data-field={field.key} data-field-type={field.type}>
          <div>{labelEl}{help}{errEl}</div>
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
          {errEl}
        </fieldset>
      );
    }
    case "multiselect": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return wrap(
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
        </select>,
      );
    }
    case "rating": {
      const max = field.validation?.max ?? 5;
      const cur = (value as number) ?? 0;
      return wrap(
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
        </div>,
      );
    }
    case "slider": {
      const min = field.validation?.min ?? 0;
      const max = field.validation?.max ?? 100;
      const cur = typeof value === "number" ? value : min;
      return wrap(
        <>
          <Slider min={min} max={max} value={[cur]} onValueChange={([v]) => onChange(v)} />
          <p className="text-[11px] text-muted-foreground tabular-nums">{cur}</p>
        </>,
      );
    }
    case "address":
    case "signature":
    case "file":
      return wrap(
        <Input id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? `${field.type} (preview)`} />,
      );
    case "currency":
    case "number":
      return wrap(
        <Input
          id={id}
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          placeholder={field.placeholder}
        />,
      );
    case "date":
    case "time":
    case "datetime": {
      const map = { date: "date", time: "time", datetime: "datetime-local" } as const;
      return wrap(
        <Input
          id={id}
          type={map[field.type as "date" | "time" | "datetime"]}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />,
      );
    }
    case "email":
    case "phone":
    case "url":
    case "text":
    default:
      return wrap(
        <Input
          id={id}
          type={field.type === "email" ? "email" : field.type === "url" ? "url" : field.type === "phone" ? "tel" : "text"}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />,
      );
  }
}

export default FormRunner;

// Suppress unused-var warning when Badge isn't referenced in some tree-shake paths.
void Badge;
