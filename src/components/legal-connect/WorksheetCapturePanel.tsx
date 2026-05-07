import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Save, UserCheck } from "lucide-react";
import { useWorksheetFields, useUpsertWorksheetResponse } from "@/hooks/useWorksheets";

// Phase 3 — controlled vocabularies consumed by the outcome engine
// (supabase/functions/_shared/outcome-engine.ts). Keep these keys in sync.
export const CALLER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "new_lead", label: "New lead" },
  { value: "current_client", label: "Current client" },
  { value: "former_client", label: "Former client" },
  { value: "third_party", label: "Third party" },
  { value: "unknown", label: "Unknown" },
];

export const CALL_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: "new_case", label: "New case" },
  { value: "case_update", label: "Case update" },
  { value: "send_information", label: "Send information" },
  { value: "appointment_request", label: "Appointment request" },
  { value: "billing_question", label: "Billing question" },
  { value: "status_check", label: "Status check" },
  { value: "attorney_callback_request", label: "Attorney callback request" },
  { value: "general_question", label: "General question" },
  { value: "wrong_number", label: "Wrong number" },
  { value: "spam", label: "Spam" },
];

interface Props {
  clientId: string;
  campaignId?: string | null;
  /** Correlation id for the related Five9 event (recommended). */
  correlationId?: string | null;
  callSessionId?: string | null;
  /** Bootstrap values when editing an existing response. */
  initialValues?: Record<string, any>;
  /** Default capture phase. */
  phase?: "during_call" | "acw" | "post_call";
  onSaved?: (responses: Record<string, any>) => void;
}

/**
 * Worksheet capture panel.
 *
 * Renders the worksheet field definitions for a client, lets an admin/agent
 * fill them in, and saves a `worksheet_responses` row keyed by correlation_id.
 *
 * Designed for the Phase 2 minimum viable testing path — a richer
 * agent-facing surface comes later.
 */
export default function WorksheetCapturePanel({
  clientId,
  campaignId = null,
  correlationId,
  callSessionId,
  initialValues,
  phase = "acw",
  onSaved,
}: Props) {
  const { data: fields } = useWorksheetFields(clientId, campaignId);
  const upsert = useUpsertWorksheetResponse();
  const [values, setValues] = useState<Record<string, any>>(initialValues ?? {});
  const [capturedPhase, setCapturedPhase] = useState(phase);

  useEffect(() => {
    if (initialValues) setValues(initialValues);
  }, [initialValues]);

  const missingRequired = useMemo(
    () =>
      (fields ?? [])
        .filter((f) => f.required)
        .filter((f) => values[f.field_key] == null || values[f.field_key] === "")
        .map((f) => f.label),
    [fields, values],
  );

  const setVal = (k: string, v: any) => setValues((s) => ({ ...s, [k]: v }));

  const save = () => {
    upsert.mutate(
      {
        client_id: clientId,
        campaign_id: campaignId,
        correlation_id: correlationId ?? null,
        call_session_id: callSessionId ?? null,
        responses: values,
        captured_phase: capturedPhase,
        is_complete: missingRequired.length === 0,
      } as any,
      {
        onSuccess: () => onSaved?.(values),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Worksheet capture
        </CardTitle>
        <CardDescription className="text-xs">
          Capture intake values during ACW or post-call. These resolve into mappings whose source
          is <code className="px-1 bg-muted rounded">worksheet</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground">Captured during</Label>
          <Select value={capturedPhase} onValueChange={(v) => setCapturedPhase(v as any)}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="during_call">During Call</SelectItem>
              <SelectItem value="acw">ACW / Wrap-up</SelectItem>
              <SelectItem value="post_call">Post-Call</SelectItem>
            </SelectContent>
          </Select>
          {correlationId && (
            <Badge variant="outline" className="text-[10px] font-mono">
              {correlationId.slice(0, 12)}
            </Badge>
          )}
        </div>

        {/* Phase 3 — caller classification (read by the outcome engine) */}
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <UserCheck className="h-3.5 w-3.5 text-primary" />
            Caller classification
            <span className="text-[10px] font-normal text-muted-foreground">
              · drives outcome routing
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Caller type</Label>
              <Select
                value={String(values.caller_type ?? "")}
                onValueChange={(v) => setVal("caller_type", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select caller type…" />
                </SelectTrigger>
                <SelectContent>
                  {CALLER_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Call reason</Label>
              <Select
                value={String(values.call_reason ?? "")}
                onValueChange={(v) => setVal("call_reason", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select call reason…" />
                </SelectTrigger>
                <SelectContent>
                  {CALL_REASON_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Stored in <code className="px-1 bg-muted rounded">responses.caller_type</code> /{" "}
            <code className="px-1 bg-muted rounded">responses.call_reason</code>. Pick "Unknown"
            if you really can't tell.
          </p>
        </div>

        {(fields ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No worksheet fields defined. Add fields in the Worksheet fields editor first.
          </p>
        ) : (
          <div className="space-y-3">
            {fields!.map((f) => {
              const v = values[f.field_key] ?? "";
              const common = {
                value: v,
                onChange: (e: any) => setVal(f.field_key, e.target.value),
              };
              return (
                <div key={f.id} className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-2">
                    {f.label}
                    {f.required && (
                      <span className="text-warning text-[10px]">required</span>
                    )}
                  </Label>
                  {f.field_type === "textarea" ? (
                    <Textarea {...common} rows={2} />
                  ) : f.field_type === "boolean" ? (
                    <Switch
                      checked={!!v}
                      onCheckedChange={(c) => setVal(f.field_key, c)}
                    />
                  ) : f.field_type === "select" && f.options?.length ? (
                    <Select
                      value={String(v)}
                      onValueChange={(val) => setVal(f.field_key, val)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {f.options.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={
                        f.field_type === "number"
                          ? "number"
                          : f.field_type === "date"
                            ? "date"
                            : f.field_type === "email"
                              ? "email"
                              : f.field_type === "phone"
                                ? "tel"
                                : "text"
                      }
                      {...common}
                    />
                  )}
                  {f.description && (
                    <p className="text-[11px] text-muted-foreground">{f.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {missingRequired.length > 0 && (
          <p className="text-[11px] text-warning">
            Missing required: {missingRequired.join(", ")}
          </p>
        )}

        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={upsert.isPending || (fields ?? []).length === 0}>
            <Save className="h-3.5 w-3.5 mr-1.5" /> Save worksheet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
