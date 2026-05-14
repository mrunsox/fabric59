import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { FieldRenderer } from "@/components/forms/FieldRenderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isFieldVisible, type FormSchema } from "@/types/form-builder";
import { submitFormPublic, type SubmitFormPublicResult } from "@/lib/forms/submitFormPublic";

type PublicForm = {
  id: string;
  name: string;
  description: string | null;
  version: number;
  schema: FormSchema;
};

/**
 * Public, unauthenticated render of a published form.
 *
 * URL: /forms/:formId  (optional ?campaignId=… &source=…)
 *
 * Designed to be embedded in Five9 Agent Desktop (or any external surface).
 * Always loads the latest published version via `get-public-form`, submits
 * via `submit-form`. No auth session required.
 */
export default function PublicFormPage() {
  const { formId } = useParams<{ formId: string }>();
  const [search] = useSearchParams();
  const campaignId = search.get("campaignId") ?? undefined;
  const source = search.get("source") ?? "five9";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<PublicForm | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!formId) return;
      setLoading(true);
      setLoadError(null);
      try {
        const base = import.meta.env.VITE_SUPABASE_URL as string;
        const res = await fetch(`${base}/functions/v1/get-public-form?formId=${encodeURIComponent(formId)}`, {
          headers: { "Content-Type": "application/json" },
        });
        const body = await res.json();
        if (!res.ok) {
          if (!cancelled) setLoadError(body?.error ?? "Unable to load form");
          return;
        }
        if (!cancelled) setForm(body as PublicForm);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [formId]);

  const visibleFields = useMemo(() => {
    if (!form) return [];
    return form.schema.fields.filter((f) => isFieldVisible(f, values, form.schema.fields));
  }, [form, values]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSubmitting(true);
    setFieldErrors({});
    const result = await submitFormPublic({
      formId: form.id,
      values,
      source,
      campaignId,
    });
    setSubmitting(false);
    if (result.ok === true) {
      setConfirmation(result.confirmation);
      setValues({});
      return;
    }
    const failed: Extract<SubmitFormPublicResult, { ok: false }> = result;
    if (failed.fieldErrors) setFieldErrors(failed.fieldErrors);
    else setLoadError(failed.error);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading form…</p>
      </main>
    );
  }

  if (loadError || !form) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle>Form unavailable</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {loadError ?? "This form could not be loaded."}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-start justify-center p-4 sm:p-6">
      <Card className="max-w-xl w-full">
        <CardHeader>
          <CardTitle>{form.name}</CardTitle>
          {form.description ? (
            <p className="text-sm text-muted-foreground">{form.description}</p>
          ) : null}
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Version {form.version}
          </p>
        </CardHeader>
        <CardContent>
          {confirmation ? (
            <div className="space-y-4">
              <p className="text-sm">{confirmation}</p>
              <Button size="sm" variant="outline" onClick={() => setConfirmation(null)}>
                Submit another response
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {visibleFields.map((f) => (
                <div key={f.id} className="space-y-1">
                  <FieldRenderer
                    field={f}
                    value={values[f.key]}
                    onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
                    disabled={submitting}
                  />
                  {fieldErrors[f.key] ? (
                    <p className="text-xs text-destructive">{fieldErrors[f.key]}</p>
                  ) : null}
                </div>
              ))}
              {visibleFields.length === 0 ? (
                <p className="text-sm text-muted-foreground">This form has no fields yet.</p>
              ) : (
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit"}
                </Button>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
