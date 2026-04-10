import { useState, useEffect } from "react";
import { useTenants } from "@/hooks/useTenants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, Loader2, Copy, Check, Phone, Headphones, PhoneOff, History, Save, ChevronDown, Plus, Trash2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface TestResponse {
  status: number;
  statusText: string;
  data: unknown;
  duration: number;
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  status: number;
  payload?: string;
  scenario?: string;
}

interface SavedTemplate {
  name: string;
  method: string;
  endpoint: string;
  payload: string;
}

// Pre-built Five9 test scenarios
const five9Scenarios = {
  "qualified-lead": {
    label: "Qualified Lead → Clio Contact + Communication",
    description: "Simulates a successful inbound call with Qualified Lead disposition",
    payload: {
      callId: `test-${Date.now()}`,
      direction: "inbound",
      ani: "416-555-1234",
      dnis: "800-555-9999",
      campaign: "Legal Intake",
      queue: "Legal",
      disposition: "Qualified Lead",
      agentName: "Test Agent",
      durationSeconds: 240,
      callerName: "John",
      callerLastName: "Doe",
    },
  },
  "missing-variable": {
    label: "Missing Required Call Variable",
    description: "Call payload with empty ANI to test validation",
    payload: {
      callId: `test-${Date.now()}`,
      direction: "inbound",
      ani: "",
      dnis: "",
      campaign: "Legal Intake",
      disposition: "Qualified Lead",
      agentName: "Test Agent",
      durationSeconds: 120,
    },
  },
  "unknown-disposition": {
    label: "Unknown Disposition",
    description: "Disposition that doesn't match any mapping",
    payload: {
      callId: `test-${Date.now()}`,
      direction: "inbound",
      ani: "416-555-4321",
      dnis: "800-555-9999",
      campaign: "Legal Intake",
      queue: "Legal",
      disposition: "UNKNOWN_DISPO_TEST",
      agentName: "Test Agent",
      durationSeconds: 60,
    },
  },
  "duplicate-call": {
    label: "Duplicate Call ID (Idempotency)",
    description: "Re-sends the same call ID to verify idempotent skip",
    payload: {
      callId: "test-idempotency-check",
      direction: "inbound",
      ani: "416-555-9999",
      dnis: "800-555-9999",
      campaign: "Legal Intake",
      queue: "Legal",
      disposition: "Qualified Lead",
      agentName: "Test Agent",
      durationSeconds: 180,
    },
  },
};

const samplePayloads = {
  intake: JSON.stringify({ contact: { name: "John Doe", phone: "416-123-4567", email: "john@example.com" }, intake: { type: "consultation", service: "divorce", urgency: "high", custom: { gate_code: "1234", notes: "Urgent matter" } } }, null, 2),
  contact: JSON.stringify({ name: "Jane Smith", phone: "416-987-6543", email: "jane@example.com" }, null, 2),
};

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem("test-console-history") || "[]"); } catch { return []; }
}
function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem("test-console-history", JSON.stringify(entries.slice(0, 30)));
}
function loadTemplates(): SavedTemplate[] {
  try { return JSON.parse(localStorage.getItem("test-console-templates") || "[]"); } catch { return []; }
}
function saveTemplates(templates: SavedTemplate[]) {
  localStorage.setItem("test-console-templates", JSON.stringify(templates));
}

export default function TestConsolePage() {
  const { data: tenants = [] } = useTenants();
  const [selectedTenant, setSelectedTenant] = useState("");
  const [endpoint, setEndpoint] = useState("/contacts");
  const [method, setMethod] = useState<"GET" | "POST" | "PATCH">("POST");
  const [payload, setPayload] = useState(samplePayloads.intake);
  const [queryParams, setQueryParams] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<TestResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [phase, setPhase] = useState("five9-e2e");
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [templates, setTemplates] = useState<SavedTemplate[]>(loadTemplates);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [headersOpen, setHeadersOpen] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }]);

  // Pre-call state
  const [lookupPhone, setLookupPhone] = useState("416-123-4567");
  const [lookupEmail, setLookupEmail] = useState("");

  // During call state
  const [disposition, setDisposition] = useState("Qualified Lead");
  const [callDuration, setCallDuration] = useState("180");
  const [agentNotes, setAgentNotes] = useState("");

  // Five9 E2E state
  const [selectedScenario, setSelectedScenario] = useState<string>("qualified-lead");
  const [scenarioPayload, setScenarioPayload] = useState(JSON.stringify(five9Scenarios["qualified-lead"].payload, null, 2));

  useEffect(() => { saveHistory(history); }, [history]);
  useEffect(() => { saveTemplates(templates); }, [templates]);

  useEffect(() => {
    const scenario = five9Scenarios[selectedScenario as keyof typeof five9Scenarios];
    if (scenario) {
      // Generate fresh callId for non-duplicate scenarios
      const p = { ...scenario.payload };
      if (selectedScenario !== "duplicate-call") {
        (p as any).callId = `test-${Date.now()}`;
      }
      setScenarioPayload(JSON.stringify(p, null, 2));
    }
  }, [selectedScenario]);

  // Send real Five9 E2E test via five9-main edge function
  const handleFive9Test = async () => {
    if (!selectedTenant) { toast.error("Please select a tenant"); return; }
    setIsLoading(true);
    setResponse(null);
    const startTime = Date.now();
    try {
      const parsedPayload = JSON.parse(scenarioPayload);
      const { data, error } = await supabase.functions.invoke("five9-main", {
        body: parsedPayload,
        headers: {
          "x-tenant-id": selectedTenant,
        },
      });

      const duration = Date.now() - startTime;
      const status = error ? 500 : (data?.skipped ? 200 : (data?.success ? 200 : 400));

      setResponse({
        status,
        statusText: error ? "Error" : (data?.skipped ? "Skipped (Idempotent)" : "OK"),
        data: error ? { error: error.message } : data,
        duration,
      });

      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        method: "POST",
        endpoint: "five9-main",
        status,
        payload: scenarioPayload,
        scenario: selectedScenario,
      };
      setHistory((prev) => [entry, ...prev]);

      if (error) {
        toast.error(`Five9 test failed: ${error.message}`);
      } else if (data?.skipped) {
        toast.info("Duplicate detected — idempotent skip");
      } else {
        toast.success("Five9 E2E test completed");
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setResponse({ status: 500, statusText: "Error", data: { error: errorMessage }, duration });
      toast.error(`Request failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Send real lookup via five9-main
  const handleLookupTest = async () => {
    if (!selectedTenant) { toast.error("Please select a tenant"); return; }
    setIsLoading(true);
    setResponse(null);
    const startTime = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke("five9-main", {
        body: { action: "lookup", ani: lookupPhone, dnis: "" },
      });
      const duration = Date.now() - startTime;

      setResponse({
        status: error ? 500 : 200,
        statusText: error ? "Error" : "OK",
        data: error ? { error: error.message } : data,
        duration,
      });

      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        method: "POST",
        endpoint: "five9-main/lookup",
        status: error ? 500 : 200,
        payload: JSON.stringify({ action: "lookup", ani: lookupPhone }),
      };
      setHistory((prev) => [entry, ...prev]);

      if (error) toast.error(`Lookup failed: ${error.message}`);
      else toast.success(data?.matched ? "Contact found" : "No match found");
    } catch (error) {
      const duration = Date.now() - startTime;
      setResponse({ status: 500, statusText: "Error", data: { error: (error as Error).message }, duration });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (phase === "five9-e2e") return handleFive9Test();
    if (phase === "pre-call") return handleLookupTest();

    if (!selectedTenant) { toast.error("Please select a tenant"); return; }
    setIsLoading(true);
    setResponse(null);
    const startTime = Date.now();
    try {
      let actualPayload: unknown = null;
      let actualEndpoint = endpoint;
      let actualMethod = method;

      if (phase === "during-call") {
        // Send as post-disposition event to five9-main
        actualPayload = {
          callId: `test-during-${Date.now()}`,
          direction: "inbound",
          ani: lookupPhone || "416-555-0000",
          disposition,
          durationSeconds: parseInt(callDuration),
          agentName: "Test Agent",
          agentNotes,
        };
        const { data, error } = await supabase.functions.invoke("five9-main", {
          body: actualPayload,
          headers: { "x-tenant-id": selectedTenant },
        });
        const duration = Date.now() - startTime;
        setResponse({
          status: error ? 500 : 200,
          statusText: error ? "Error" : "OK",
          data: error ? { error: error.message } : data,
          duration,
        });
        const entry: HistoryEntry = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), method: "POST", endpoint: "five9-main/disposition", status: error ? 500 : 200, payload: JSON.stringify(actualPayload) };
        setHistory((prev) => [entry, ...prev]);
        if (error) toast.error(`Failed: ${error.message}`);
        else toast.success("During-call test completed");
        return;
      }

      // Post-call generic
      actualPayload = method !== "GET" ? JSON.parse(payload) : null;

      const simulatedResponse = {
        success: true,
        tenant_id: selectedTenant,
        endpoint: actualEndpoint,
        method: actualMethod,
        message: "Simulated response — use Five9 E2E tab for real edge function tests",
        payload: actualPayload,
      };

      await new Promise((r) => setTimeout(r, 300));
      const duration = Date.now() - startTime;

      setResponse({ status: 200, statusText: "OK", data: simulatedResponse, duration });
      const entry: HistoryEntry = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), method: actualMethod, endpoint: actualEndpoint, status: 200, payload: actualPayload ? JSON.stringify(actualPayload) : undefined };
      setHistory((prev) => [entry, ...prev]);
      toast.success("Request completed");
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setResponse({ status: 500, statusText: "Error", data: { error: errorMessage }, duration });
      toast.error(`Request failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveTemplate = () => {
    const name = prompt("Template name:");
    if (!name) return;
    setTemplates((prev) => [...prev, { name, method, endpoint, payload }]);
    toast.success("Template saved");
  };

  const handleLoadTemplate = (t: SavedTemplate) => {
    setMethod(t.method as "GET" | "POST" | "PATCH");
    setEndpoint(t.endpoint);
    setPayload(t.payload);
    setPhase("post-call");
    toast.success(`Loaded template: ${t.name}`);
  };

  const handleReplayHistory = (entry: HistoryEntry) => {
    if (entry.endpoint === "five9-main" && entry.payload) {
      setPhase("five9-e2e");
      setScenarioPayload(entry.payload);
      if (entry.scenario) setSelectedScenario(entry.scenario);
    } else {
      setMethod(entry.method as "GET" | "POST" | "PATCH");
      setEndpoint(entry.endpoint);
      if (entry.payload) setPayload(entry.payload);
      setPhase("post-call");
    }
  };

  // Interpret response for scenario verdict
  const getVerdict = () => {
    if (!response) return null;
    const d = response.data as any;
    if (d?.skipped) return { icon: <AlertTriangle className="h-4 w-4" />, label: "Idempotent Skip", color: "text-warning" };
    if (d?.error || response.status >= 400) return { icon: <XCircle className="h-4 w-4" />, label: "Failed", color: "text-destructive" };
    if (d?.clio?.communicationId) return { icon: <CheckCircle2 className="h-4 w-4" />, label: "Clio: Contact + Communication created", color: "text-success" };
    if (d?.mycase?.noteId) return { icon: <CheckCircle2 className="h-4 w-4" />, label: "MyCase: Contact + Note created", color: "text-success" };
    if (d?.success) return { icon: <CheckCircle2 className="h-4 w-4" />, label: "Success (no CRM action)", color: "text-success" };
    return null;
  };

  const verdict = getVerdict();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Test Console</h1>
        <p className="text-muted-foreground">Send real Five9 payloads to edge functions and verify E2E flows</p>
      </div>

      <Tabs value={phase} onValueChange={setPhase}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="five9-e2e" className="gap-2"><Play className="h-4 w-4" />Five9 E2E</TabsTrigger>
          <TabsTrigger value="pre-call" className="gap-2"><Phone className="h-4 w-4" />Pre-Call Lookup</TabsTrigger>
          <TabsTrigger value="during-call" className="gap-2"><Headphones className="h-4 w-4" />During Call</TabsTrigger>
          <TabsTrigger value="post-call" className="gap-2"><PhoneOff className="h-4 w-4" />Post-Call</TabsTrigger>
        </TabsList>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Request Builder */}
          <Card>
            <CardHeader>
              <CardTitle>Request Builder</CardTitle>
              <CardDescription>
                {phase === "five9-e2e" ? "Select a test scenario and send a real Five9 event to five9-main" : phase === "pre-call" ? "Send a real lookup request to five9-main" : phase === "during-call" ? "Send a post-disposition event to five9-main" : "Generic request builder"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target Tenant *</Label>
                <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                  <SelectTrigger><SelectValue placeholder="Select a tenant" /></SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-2">{t.name}<StatusBadge variant={t.crm_type as "clio" | "workiz" | "other"}>{t.crm_type}</StatusBadge></span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Five9 E2E Tab */}
              <TabsContent value="five9-e2e" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label>Test Scenario</Label>
                  <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(five9Scenarios).map(([key, s]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex flex-col">
                            <span>{s.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {five9Scenarios[selectedScenario as keyof typeof five9Scenarios]?.description}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Five9 Event Payload</Label>
                    <Badge variant="outline" className="text-xs">Sent to five9-main</Badge>
                  </div>
                  <Textarea
                    value={scenarioPayload}
                    onChange={(e) => setScenarioPayload(e.target.value)}
                    className="font-mono text-sm min-h-[220px]"
                  />
                </div>
              </TabsContent>

              <TabsContent value="pre-call" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label>Phone Number (ANI)</Label>
                  <Input value={lookupPhone} onChange={(e) => setLookupPhone(e.target.value)} placeholder="416-123-4567" />
                </div>
                <div className="space-y-2">
                  <Label>Email (optional)</Label>
                  <Input value={lookupEmail} onChange={(e) => setLookupEmail(e.target.value)} placeholder="john@example.com" />
                </div>
              </TabsContent>

              <TabsContent value="during-call" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label>Disposition</Label>
                  <Select value={disposition} onValueChange={setDisposition}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Qualified Lead", "Not Interested", "Callback Requested", "Wrong Number", "Voicemail"].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Call Duration (seconds)</Label>
                  <Input type="number" value={callDuration} onChange={(e) => setCallDuration(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Agent Notes</Label>
                  <Textarea value={agentNotes} onChange={(e) => setAgentNotes(e.target.value)} placeholder="Notes from the call..." rows={3} />
                </div>
              </TabsContent>

              <TabsContent value="post-call" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select value={method} onValueChange={(v) => setMethod(v as "GET" | "POST" | "PATCH")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-3">
                    <Label>Endpoint</Label>
                    <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="/contacts" />
                  </div>
                </div>
                {method === "GET" && (
                  <div className="space-y-2">
                    <Label>Query Parameters</Label>
                    <Input value={queryParams} onChange={(e) => setQueryParams(e.target.value)} placeholder="phone=416-123-4567" />
                  </div>
                )}
                {method !== "GET" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Request Payload</Label>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setPayload(samplePayloads.intake)}>Load Intake</Button>
                        <Button variant="ghost" size="sm" onClick={() => setPayload(samplePayloads.contact)}>Load Contact</Button>
                        <Button variant="ghost" size="sm" onClick={handleSaveTemplate}><Save className="mr-1 h-3 w-3" />Save Template</Button>
                      </div>
                    </div>
                    <Textarea value={payload} onChange={(e) => setPayload(e.target.value)} className="font-mono text-sm min-h-[200px]" placeholder='{"key": "value"}' />
                  </div>
                )}

                <Collapsible open={headersOpen} onOpenChange={setHeadersOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 w-full justify-start">
                      <ChevronDown className={`h-4 w-4 transition-transform ${headersOpen ? "rotate-180" : ""}`} />
                      Custom Headers ({customHeaders.filter((h) => h.key).length})
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {customHeaders.map((h, i) => (
                      <div key={i} className="flex gap-2">
                        <Input placeholder="Header name" value={h.key} onChange={(e) => { const next = [...customHeaders]; next[i].key = e.target.value; setCustomHeaders(next); }} className="flex-1" />
                        <Input placeholder="Value" value={h.value} onChange={(e) => { const next = [...customHeaders]; next[i].value = e.target.value; setCustomHeaders(next); }} className="flex-1" />
                        <Button variant="ghost" size="icon" onClick={() => setCustomHeaders(customHeaders.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setCustomHeaders([...customHeaders, { key: "", value: "" }])} className="gap-1"><Plus className="h-3 w-3" />Add Header</Button>
                  </CollapsibleContent>
                </Collapsible>

                {templates.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Saved Templates</Label>
                    <div className="flex flex-wrap gap-2">
                      {templates.map((t, i) => (
                        <Button key={i} variant="outline" size="sm" onClick={() => handleLoadTemplate(t)}>{t.name}</Button>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <Button onClick={handleTest} disabled={isLoading || !selectedTenant} className="w-full gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {isLoading ? "Sending..." : phase === "five9-e2e" ? "Run Five9 E2E Test" : phase === "pre-call" ? "Run Lookup" : "Send Request"}
              </Button>
            </CardContent>
          </Card>

          {/* Response Viewer */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Response</CardTitle>
                    <CardDescription>Live response from edge function</CardDescription>
                  </div>
                  {response && (
                    <div className="flex items-center gap-3">
                      <StatusBadge variant={response.status < 400 ? "success" : "error"}>{response.status} {response.statusText}</StatusBadge>
                      <span className="text-sm text-muted-foreground">{response.duration}ms</span>
                      <Button variant="ghost" size="icon" onClick={handleCopy}>
                        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {verdict && (
                  <div className={`flex items-center gap-2 mb-4 p-3 rounded-lg border ${verdict.color}`}>
                    {verdict.icon}
                    <span className="text-sm font-medium">{verdict.label}</span>
                  </div>
                )}
                {response ? (
                  <Tabs defaultValue="body" className="w-full">
                    <TabsList className="w-full justify-start">
                      <TabsTrigger value="body">Body</TabsTrigger>
                      <TabsTrigger value="raw">Raw</TabsTrigger>
                    </TabsList>
                    <TabsContent value="body" className="mt-4">
                      <pre className="rounded-lg bg-muted p-4 text-sm font-mono overflow-auto max-h-[400px]">{JSON.stringify(response.data, null, 2)}</pre>
                    </TabsContent>
                    <TabsContent value="raw" className="mt-4">
                      <pre className="rounded-lg bg-muted p-4 text-sm font-mono overflow-auto max-h-[400px]">{JSON.stringify(response, null, 2)}</pre>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">Send a request to see the response</div>
                )}
              </CardContent>
            </Card>

            {/* Request History */}
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base"><History className="h-5 w-5 text-primary" />Request History ({history.length})</CardTitle>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${historyOpen ? "rotate-180" : ""}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-2">
                    {history.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No requests yet</p>
                    ) : history.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => handleReplayHistory(entry)}>
                        <div className="flex items-center gap-3">
                          <span className={`font-mono text-xs font-medium ${entry.method === "GET" ? "text-success" : "text-primary"}`}>{entry.method}</span>
                          <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{entry.endpoint}</span>
                          {entry.scenario && <Badge variant="outline" className="text-xs">{entry.scenario}</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge variant={entry.status < 400 ? "success" : "error"}>{entry.status}</StatusBadge>
                          <span className="text-xs text-muted-foreground">{format(new Date(entry.timestamp), "HH:mm:ss")}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
