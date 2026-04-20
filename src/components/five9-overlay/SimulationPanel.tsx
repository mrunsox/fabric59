import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, FlaskConical, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useRunFive9Simulation } from "@/hooks/useFive9Overlay";
import { useLegalConnectClients } from "@/hooks/useLegalConnect";

const TEMPLATES: Record<string, any> = {
  "flow_a_clio_intake": {
    event_type: "disposition_submitted", five9_domain: "firm.five9.com", campaign: "Inbound Intake",
    ani: "+15551234567", disposition: "Qualified Lead", agent_username: "agent01",
    call_variables: { caller_name: "Jane Doe", caller_phone: "+15551234567", intake_type: "personal_injury", matter_type: "MVA", urgency: "high" },
  },
  "flow_b_existing_client": {
    event_type: "disposition_submitted", five9_domain: "firm.five9.com", ani: "+15559876543",
    disposition: "Existing Client Inquiry", call_variables: { agent_notes: "Status update on case 2024-MVA-001" },
  },
  "flow_c_mycase_intake": {
    event_type: "disposition_submitted", five9_domain: "firm.five9.com", ani: "+15555550100",
    disposition: "Qualified Lead", call_variables: { caller_name: "John Smith", intake_type: "family_law" },
  },
  "flow_d_smokeball_lead": {
    event_type: "disposition_submitted", five9_domain: "firm.five9.com", ani: "+15555550200",
    disposition: "New Intake", call_variables: { caller_name: "Acme Corp", intake_type: "commercial", source: "google_ads" },
  },
  "missing_required_var": {
    event_type: "disposition_submitted", five9_domain: "firm.five9.com",
    disposition: "Qualified Lead", call_variables: {},
  },
  "unresolved_routing": { event_type: "interaction_started", five9_domain: "unknown.five9.com", ani: "+15551112222" },
  "callback_request": {
    event_type: "callback_requested", five9_domain: "firm.five9.com", ani: "+15553334444",
    disposition: "Callback", call_variables: { callback_at: new Date(Date.now() + 86400000).toISOString() },
  },
};

export default function SimulationPanel() {
  const { data: clients } = useLegalConnectClients();
  const [template, setTemplate] = useState("flow_a_clio_intake");
  const [payload, setPayload] = useState(JSON.stringify(TEMPLATES.flow_a_clio_intake, null, 2));
  const [targetClient, setTargetClient] = useState<string>("");
  const [targetProvider, setTargetProvider] = useState<string>("");
  const run = useRunFive9Simulation();

  const handleTemplate = (key: string) => {
    setTemplate(key);
    setPayload(JSON.stringify(TEMPLATES[key], null, 2));
  };

  const handleRun = () => {
    let raw: any;
    try { raw = JSON.parse(payload); } catch { return; }
    run.mutate({
      raw_payload: raw,
      target_client_id: targetClient || undefined,
      target_provider: targetProvider || undefined,
    });
  };

  const result = run.data?.stages;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-primary" /><CardTitle className="text-base">Simulation Input</CardTitle></div>
          <CardDescription>Run a Five9 payload through normalize → route → map → orchestrate (dry-run, no provider writes).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Template</Label>
            <Select value={template} onValueChange={handleTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="flow_a_clio_intake">Flow A — Clio New Intake</SelectItem>
                <SelectItem value="flow_b_existing_client">Flow B — Clio Existing Client</SelectItem>
                <SelectItem value="flow_c_mycase_intake">Flow C — MyCase Intake</SelectItem>
                <SelectItem value="flow_d_smokeball_lead">Flow D — Smokeball Lead</SelectItem>
                <SelectItem value="missing_required_var">Edge — Missing Required Variable</SelectItem>
                <SelectItem value="unresolved_routing">Edge — Unresolved Routing</SelectItem>
                <SelectItem value="callback_request">Edge — Callback Request</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Override Client</Label>
              <Select value={targetClient || "auto"} onValueChange={(v) => setTargetClient(v === "auto" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto from routing</SelectItem>
                  {clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Override Provider</Label>
              <Select value={targetProvider || "auto"} onValueChange={(v) => setTargetProvider(v === "auto" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto from connection</SelectItem>
                  <SelectItem value="clio">Clio</SelectItem>
                  <SelectItem value="mycase">MyCase</SelectItem>
                  <SelectItem value="smokeball">Smokeball</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Raw Five9 Payload (JSON)</Label>
            <Textarea value={payload} onChange={(e) => setPayload(e.target.value)} rows={14} className="font-mono text-xs" />
          </div>
          <Button onClick={handleRun} disabled={run.isPending} className="w-full">
            <Play className="h-4 w-4 mr-1" />{run.isPending ? "Running…" : "Run Simulation"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pipeline Trace</CardTitle><CardDescription>Step-by-step result for each stage.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {!result && <div className="text-sm text-muted-foreground py-8 text-center">Run a simulation to see results.</div>}
          {result && (
            <>
              <Stage title="1. Normalized Event" ok>
                <pre className="text-xs bg-muted/40 p-2 rounded max-h-32 overflow-auto">{JSON.stringify(result.normalized, null, 2)}</pre>
              </Stage>
              <Stage title="2. Route Resolution" ok={!!result.route?.client_id}>
                <div className="text-xs space-y-1">
                  <div>Client: <span className="font-mono">{result.route?.client_id ?? "unresolved"}</span></div>
                  <div>Provider: <Badge variant="outline" className="capitalize">{result.route?.provider_target ?? "none"}</Badge></div>
                  <div>Reason: {result.route?.reason}</div>
                </div>
              </Stage>
              <Stage title="3. Disposition Mapping" ok={result.mapping_found}>
                <div className="text-xs">{result.mapping_found ? `Mapping: ${result.mapping_id}` : "No mapping found — would route to review queue"}</div>
              </Stage>
              <Stage title={`4. Action Chain (${result.action_chain?.length ?? 0})`} ok={(result.action_chain?.length ?? 0) > 0}>
                {(result.action_chain ?? []).map((a: any, i: number) => (
                  <div key={i} className="text-xs flex items-center gap-2 py-1">
                    <Badge variant="outline" className="text-xs">{i + 1}</Badge>
                    <span className="font-mono">{a.action}</span>
                  </div>
                ))}
                {result.warnings?.length > 0 && (
                  <div className="text-xs text-warning mt-2">⚠ {result.warnings.join(", ")}</div>
                )}
              </Stage>
              {result.review_items?.length > 0 && (
                <Stage title={`Review Items (${result.review_items.length})`} warn>
                  {result.review_items.map((r: any, i: number) => (
                    <div key={i} className="text-xs py-1"><span className="font-mono">{r.reason}</span> — {r.suggested_resolution}</div>
                  ))}
                </Stage>
              )}
              <Stage title="5. Orchestration (dry-run)" ok={result.orchestration?.ok}>
                {(result.orchestration?.steps ?? []).map((s: any, i: number) => (
                  <div key={i} className="text-xs flex items-center gap-2 py-1">
                    {s.ok ? <CheckCircle2 className="h-3 w-3 text-success" /> : <XCircle className="h-3 w-3 text-destructive" />}
                    <span className="font-mono">{s.action}</span>
                    <span className="text-muted-foreground">{s.status}</span>
                  </div>
                ))}
              </Stage>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stage({ title, ok, warn, children }: { title: string; ok?: boolean; warn?: boolean; children: React.ReactNode }) {
  const Icon = warn ? AlertCircle : ok ? CheckCircle2 : XCircle;
  const cls = warn ? "text-warning" : ok ? "text-success" : "text-destructive";
  return (
    <div className="border rounded-md p-3 bg-card">
      <div className="flex items-center gap-2 mb-2"><Icon className={`h-4 w-4 ${cls}`} /><div className="text-sm font-medium">{title}</div></div>
      {children}
    </div>
  );
}
