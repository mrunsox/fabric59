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
import { Play, Loader2, Copy, Check, Phone, Headphones, PhoneOff, History, Save, ChevronDown, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

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
}

interface SavedTemplate {
  name: string;
  method: string;
  endpoint: string;
  payload: string;
}

const samplePayloads = {
  intake: JSON.stringify({ contact: { name: "John Doe", phone: "416-123-4567", email: "john@example.com" }, intake: { type: "consultation", service: "divorce", urgency: "high", custom: { gate_code: "1234", notes: "Urgent matter" } } }, null, 2),
  contact: JSON.stringify({ name: "Jane Smith", phone: "416-987-6543", email: "jane@example.com" }, null, 2),
};

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem("test-console-history") || "[]"); } catch { return []; }
}
function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem("test-console-history", JSON.stringify(entries.slice(0, 20)));
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
  const [phase, setPhase] = useState("post-call");
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

  useEffect(() => { saveHistory(history); }, [history]);
  useEffect(() => { saveTemplates(templates); }, [templates]);

  const handleTest = async () => {
    if (!selectedTenant) { toast.error("Please select a tenant"); return; }
    setIsLoading(true);
    setResponse(null);
    const startTime = Date.now();
    try {
      let actualPayload: unknown = null;
      let actualEndpoint = endpoint;
      let actualMethod = method;

      if (phase === "pre-call") {
        actualEndpoint = `/contacts?phone=${lookupPhone}${lookupEmail ? `&email=${lookupEmail}` : ""}`;
        actualMethod = "GET";
      } else if (phase === "during-call") {
        actualPayload = { disposition, call_duration_seconds: parseInt(callDuration), agent_notes: agentNotes };
        actualEndpoint = "/call-variables";
        actualMethod = "POST";
      } else {
        actualPayload = method !== "GET" ? JSON.parse(payload) : null;
      }

      const simulatedResponse = {
        success: true,
        tenant_id: selectedTenant,
        endpoint: actualEndpoint,
        method: actualMethod,
        message: phase === "pre-call"
          ? "Contact lookup completed"
          : phase === "during-call"
          ? "Call variables captured"
          : "Simulated response — Edge functions will handle real CRM calls",
        ...(phase === "pre-call" ? { contact: { name: "John Doe", crm_id: "CL-12345", open_matters: 2, last_interaction: "2026-02-15" } } : {}),
        payload: actualPayload,
      };

      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      const duration = Date.now() - startTime;

      setResponse({ status: 200, statusText: "OK", data: simulatedResponse, duration });

      const entry: HistoryEntry = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), method: actualMethod, endpoint: actualEndpoint, status: 200, payload: actualPayload ? JSON.stringify(actualPayload) : undefined };
      setHistory((prev) => [entry, ...prev]);

      await supabase.from("api_logs").insert([{
        tenant_id: selectedTenant,
        endpoint: `/api/v1/tenants/${selectedTenant}${actualEndpoint}`,
        method: actualMethod,
        request_payload: (actualPayload ?? null) as Record<string, string> | null,
        response: JSON.parse(JSON.stringify(simulatedResponse)),
        status: "success",
        response_time_ms: duration,
      }]);

      toast.success("Request completed successfully");
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
    setMethod(entry.method as "GET" | "POST" | "PATCH");
    setEndpoint(entry.endpoint);
    if (entry.payload) setPayload(entry.payload);
    setPhase("post-call");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Test Console</h1>
        <p className="text-muted-foreground">Simulate Five9 API calls across call phases</p>
      </div>

      {/* Call Phase Tabs */}
      <Tabs value={phase} onValueChange={setPhase}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pre-call" className="gap-2"><Phone className="h-4 w-4" />Pre-Call Lookup</TabsTrigger>
          <TabsTrigger value="during-call" className="gap-2"><Headphones className="h-4 w-4" />During Call</TabsTrigger>
          <TabsTrigger value="post-call" className="gap-2"><PhoneOff className="h-4 w-4" />Post-Call Intake</TabsTrigger>
        </TabsList>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Request Builder */}
          <Card>
            <CardHeader>
              <CardTitle>Request Builder</CardTitle>
              <CardDescription>
                {phase === "pre-call" ? "Simulate a contact lookup by phone or email" : phase === "during-call" ? "Capture call variables and disposition" : "Full request builder for post-call intake"}
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

              <TabsContent value="pre-call" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
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

                {/* Headers Editor */}
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

                {/* Saved Templates */}
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
                {isLoading ? "Sending..." : "Send Request"}
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
                    <CardDescription>View the response from your test request</CardDescription>
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
