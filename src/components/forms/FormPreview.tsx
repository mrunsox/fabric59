import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldRenderer } from "./FieldRenderer";
import { buildMappedPayload, isFieldVisible, type FormSchema } from "@/types/form-builder";

export function FormPreview({
  schema,
  onSubmit,
  submitting,
}: {
  schema: FormSchema;
  onSubmit?: (payload: { values: Record<string, unknown>; mapped: Record<string, unknown> }) => void;
  submitting?: boolean;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const visibleFields = useMemo(
    () => schema.fields.filter((f) => isFieldVisible(f, values, schema.fields)),
    [schema, values]
  );
  const mapped = useMemo(() => buildMappedPayload(schema, values), [schema, values]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple required check
    for (const f of visibleFields) {
      if (f.required && (values[f.key] === undefined || values[f.key] === "" || values[f.key] === null)) {
        alert(`${f.label} is required`);
        return;
      }
    }
    onSubmit?.({ values, mapped });
  };

  if (schema.fields.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Add fields in the builder to see a preview.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {visibleFields.map((f) => (
              <FieldRenderer
                key={f.id}
                field={f}
                value={values[f.key]}
                onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
              />
            ))}
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Submitting…" : onSubmit ? "Submit test entry" : "Submit"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live submission payload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Raw values</p>
            <pre className="bg-muted/40 rounded p-2 text-xs overflow-x-auto">
{JSON.stringify(values, null, 2)}
            </pre>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Mapped (downstream payload)</p>
            <pre className="bg-muted/40 rounded p-2 text-xs overflow-x-auto">
{JSON.stringify(mapped, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
