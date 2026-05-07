import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Eye, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useLegalCallVariableMappings } from "@/hooks/useLegalConnect";
import { useWorksheetFields } from "@/hooks/useWorksheets";
import {
  resolveGrowPayload,
  type CallVariableMapping,
  type NormalizedEventLite,
} from "@/lib/legal-connect/resolveGrowPayload";

interface Props {
  clientId: string;
  campaignId?: string | null;
  /** Optional event payload to seed preview. Otherwise a sample is used. */
  sampleEvent?: NormalizedEventLite;
  /** Optional worksheet snapshot. Otherwise placeholders for known fields. */
  sampleWorksheet?: Record<string, any>;
}

const SEED_EVENT: NormalizedEventLite = {
  ani: "+15555550101",
  disposition: "QUALIFIED_LEAD",
  disposition_notes: "Caller injured in rear-end collision on I-95 last Tuesday.",
  call_variables: {
    caller_name: "Jane Doe",
    caller_first_name: "Jane",
    caller_last_name: "Doe",
    caller_email: "jane.doe@example.com",
    caller_phone: "+15555550101",
    referring_url: "https://example.com/intake",
    from_source: "Five9 inbound",
  },
};

export default function PayloadPreviewPanel({
  clientId,
  campaignId = null,
  sampleEvent,
  sampleWorksheet,
}: Props) {
  const { data: mappings } = useLegalCallVariableMappings(clientId, campaignId ?? undefined);
  const { data: worksheetFields } = useWorksheetFields(clientId, campaignId);

  // Editable JSON test data for replay-style preview.
  const [eventJson, setEventJson] = useState(
    JSON.stringify(sampleEvent ?? SEED_EVENT, null, 2),
  );
  const [worksheetJson, setWorksheetJson] = useState(() => {
    const seed = sampleWorksheet ?? {};
    return JSON.stringify(seed, null, 2);
  });
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const result = useMemo(() => {
    try {
      const evt = JSON.parse(eventJson) as NormalizedEventLite;
      const ws = JSON.parse(worksheetJson) as Record<string, any>;
      setParseErr(null);
      return resolveGrowPayload(
        evt,
        ws,
        ((mappings ?? []) as unknown) as CallVariableMapping[],
      );
    } catch (e) {
      setParseErr((e as Error).message);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventJson, worksheetJson, mappings, tick]);

  const hydrateWorksheetSeed = () => {
    const sample: Record<string, any> = {};
    (worksheetFields ?? []).forEach((f) => {
      sample[f.field_key] =
        f.field_type === "date"
          ? "2026-04-12"
          : f.field_type === "number"
            ? 1
            : f.field_type === "boolean"
              ? true
              : `Sample ${f.label}`;
    });
    setWorksheetJson(JSON.stringify(sample, null, 2));
    setTick((t) => t + 1);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Payload preview (Clio Grow)
            </CardTitle>
            <CardDescription className="text-xs">
              Resolves the exact <code className="bg-muted px-1 rounded">inbox_lead</code> payload
              the adapter would POST. Token is redacted. Edit the sample event or worksheet to
              dry-run different scenarios.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={hydrateWorksheetSeed}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Seed worksheet
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Sample normalized event</Label>
            <Textarea
              value={eventJson}
              onChange={(e) => setEventJson(e.target.value)}
              rows={10}
              className="font-mono text-[11px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Worksheet snapshot</Label>
            <Textarea
              value={worksheetJson}
              onChange={(e) => setWorksheetJson(e.target.value)}
              rows={10}
              className="font-mono text-[11px]"
            />
          </div>
        </div>

        {parseErr && (
          <p className="text-xs text-destructive">JSON parse error: {parseErr}</p>
        )}

        {result && (
          <>
            <div>
              <div className="text-xs font-semibold text-foreground mb-2">Resolved fields</div>
              <div className="overflow-hidden rounded-md border border-border/60">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left p-2 font-medium">Field</th>
                      <th className="text-left p-2 font-medium">Value</th>
                      <th className="text-left p-2 font-medium">Source</th>
                      <th className="text-left p-2 font-medium w-16">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.fields.map((f) => (
                      <tr key={f.field} className="border-t border-border/40">
                        <td className="p-2 font-mono">{f.field}</td>
                        <td className="p-2 font-mono break-all">
                          {f.value === null || f.value === "" ? (
                            <span className="text-muted-foreground italic">empty</span>
                          ) : (
                            f.value
                          )}
                        </td>
                        <td className="p-2 text-muted-foreground">{f.source_label}</td>
                        <td className="p-2">
                          {f.ok ? (
                            <Badge variant="outline" className="border-success/40 text-success text-[10px]">
                              ok
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px]">
                              missing
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {(result.errors.length > 0 || result.warnings.length > 0) && (
              <div className="space-y-1.5">
                {result.errors.map((m, i) => (
                  <div
                    key={`e-${i}`}
                    className="flex items-start gap-2 text-[11px] text-destructive"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {m}
                  </div>
                ))}
                {result.warnings.map((m, i) => (
                  <div
                    key={`w-${i}`}
                    className="flex items-start gap-2 text-[11px] text-warning"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {m}
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                {result.errors.length === 0 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                )}
                Outbound payload (POST https://grow.clio.com/inbox_leads)
              </div>
              <pre className="text-[11px] font-mono p-3 rounded-md bg-muted/40 border border-border/60 overflow-auto max-h-72">
                {JSON.stringify(result.payload, null, 2)}
              </pre>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
