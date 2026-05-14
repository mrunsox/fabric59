import { supabase } from "@/integrations/supabase/client";

/**
 * Public form submission helper.
 *
 * Hits the `submit-form` edge function (verify_jwt=false). The edge function
 * loads the form's published schema, validates required fields and types,
 * builds the mapped campaign-intake payload, and persists a `form_submissions`
 * row scoped to the form's workspace.
 *
 * Returns either the created submission id + mapped payload, or a structured
 * validation error.
 */
export async function submitFormPublic(input: {
  formId: string;
  values: Record<string, unknown>;
  source?: string;
  campaignId?: string;
}): Promise<
  | { ok: true; submissionId: string; submittedAt: string; campaignId: string | null; mapped: Record<string, unknown>; confirmation: string }
  | { ok: false; status: number; error: string; fieldErrors?: Record<string, string> }
> {
  const { data, error } = await supabase.functions.invoke("submit-form", {
    body: input,
  });

  if (error) {
    const ctx = (error as { context?: { status?: number } }).context;
    return {
      ok: false,
      status: ctx?.status ?? 500,
      error: error.message ?? "Submission failed",
      fieldErrors: (data as { fieldErrors?: Record<string, string> } | null)?.fieldErrors,
    };
  }
  return data as Awaited<ReturnType<typeof submitFormPublic>>;
}

/** Build the public POST URL for the submit-form endpoint (for embedding/sharing). */
export function getPublicFormSubmitUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/functions/v1/submit-form`;
}
