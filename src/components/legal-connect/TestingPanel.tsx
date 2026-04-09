import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  TestTube2, Play, CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight,
} from "lucide-react";
import { useRunTest, useLegalTestHistory } from "@/hooks/useLegalConnect";

interface TestingPanelProps {
  clientId?: string;
}

const clioScenarios = [
  { value: "contact_created", label: "Contact Created" },
  { value: "contact_updated", label: "Contact Updated" },
  { value: "matter_created", label: "Matter Created" },
  { value: "matter_updated", label: "Matter Updated" },
  { value: "task_created", label: "Task Created" },
];

const myCaseCapabilities = [
  { value: "contact_lookup", label: "Contact Lookup" },
  { value: "case_lookup", label: "Case Lookup" },
  { value: "note_create", label: "Note Creation" },
  { value: "task_create", label: "Task Creation" },
  { value: "contact_create", label: "Contact Creation" },
  { value: "webhook_receive", label: "Webhook Receive" },
];

const dispositionScenarios = [
  { value: "qualified_lead", label: "Qualified Lead" },
  { value: "callback_scheduled", label: "Callback Scheduled" },
  { value: "consult_booked", label: "Consult Booked" },
];

const outageTypes = [
  { value: "provider_unavailable", label: "Provider Unavailable" },
  { value: "token_expired", label: "Token Expired" },
  { value: "callback_endpoint_down", label: "Callback Endpoint Down" },
];

export default function TestingPanel({ clientId }: TestingPanelProps) {
  const [testTab, setTestTab] = useState("clio");
  const [selectedScenario, setSelectedScenario] = useState("contact_created");
  const [selectedCapability, setSelectedCapability] = useState("contact_lookup");
  const [selectedDisposition, setSelectedDisposition] = useState("qualified_lead");
  const [selectedOutage, setSelectedOutage] = useState("provider_unavailable");
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [expandedResult, setExpandedResult] = useState(false);

  const runTest = useRunTest();
  const { data: testHistory, isLoading: historyLoading } = useLegalTestHistory(clientId);

  const handleRunTest = (testAction: string, config: Record<string, unknown>) => {
    runTest.mutate(
      { action: testAction, ...config, client_id: clientId },
      { onSuccess: (data) => setLastResult(data?.data ?? data) }
    );
  };

  const statusIcon = (status: string) => {
    if (status === "passed") return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-warning" />;
  };

  return (
    <div className="space-y-4">
      <Tabs value={testTab} onValueChange={setTestTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="clio" className="text-xs">Clio Webhooks</TabsTrigger>
          <TabsTrigger value="mycase" className="text-xs">MyCase Events</TabsTrigger>
          <TabsTrigger value="dispositions" className="text-xs">Dispositions</TabsTrigger>
          <TabsTrigger value="lookups" className="text-xs">Lookups</TabsTrigger>
          <TabsTrigger value="reliability" className="text-xs">Reliability</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
        </TabsList>

        {/* Clio Webhook Tests */}
        <TabsContent value="clio" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Simulate Clio Webhook</CardTitle>
              <CardDescription>Test webhook normalization, policy evaluation, and sync job generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clioScenarios.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => handleRunTest("simulateClioWebhook", { scenario: selectedScenario })}
                  disabled={runTest.isPending || !clientId}
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Run Test
                </Button>
              </div>
              {!clientId && <p className="text-xs text-muted-foreground">Select a client to run tests</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MyCase Events */}
        <TabsContent value="mycase" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Simulate MyCase Event</CardTitle>
              <CardDescription>Test capability-aware event handling with fallback behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Select value={selectedCapability} onValueChange={setSelectedCapability}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {myCaseCapabilities.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => handleRunTest("simulateMyCaseEvent", { capability: selectedCapability })}
                  disabled={runTest.isPending || !clientId}
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Run Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dispositions */}
        <TabsContent value="dispositions" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Simulate Five9 Disposition</CardTitle>
              <CardDescription>Test disposition-to-action mapping and sync job generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Select value={selectedDisposition} onValueChange={setSelectedDisposition}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dispositionScenarios.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => handleRunTest("simulateDisposition", { scenario: selectedDisposition })}
                  disabled={runTest.isPending || !clientId}
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Run Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lookups */}
        <TabsContent value="lookups" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Simulate Contact/Matter Lookup</CardTitle>
              <CardDescription>Test canonical data matching and ambiguous match detection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => handleRunTest("simulateLookup", { provider: "clio", lookup_type: "contact", search_value: "555-0001" })}
                  disabled={runTest.isPending || !clientId}
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Test Contact Lookup
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRunTest("simulateLookup", { provider: "clio", lookup_type: "matter", search_value: "TEST-001" })}
                  disabled={runTest.isPending || !clientId}
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Test Matter Lookup
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reliability */}
        <TabsContent value="reliability" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Renewal Failure Simulation</CardTitle>
                <CardDescription>Simulates 3x renewal failure → auto-recreate flow</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="sm"
                  onClick={() => handleRunTest("simulateRenewalFailure", {})}
                  disabled={runTest.isPending}
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Run Simulation
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Outage Simulation</CardTitle>
                <CardDescription>Simulates provider outage recovery scenarios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedOutage} onValueChange={setSelectedOutage}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {outageTypes.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => handleRunTest("simulateOutage", { outage_type: selectedOutage })}
                  disabled={runTest.isPending}
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Run Simulation
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Test History</CardTitle>
              <CardDescription>Recent test runs for this client</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-foreground/80">Type</TableHead>
                    <TableHead className="text-foreground/80">Category</TableHead>
                    <TableHead className="text-foreground/80">Status</TableHead>
                    <TableHead className="text-foreground/80">Duration</TableHead>
                    <TableHead className="text-foreground/80">Run At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i} className="border-border">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : !testHistory || testHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        <TestTube2 className="h-6 w-6 mx-auto mb-2" />
                        No tests run yet. Select a test above to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    testHistory.map((t: any) => (
                      <TableRow key={t.id} className="border-border">
                        <TableCell className="font-medium text-foreground">{t.test_type}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{t.test_category}</Badge></TableCell>
                        <TableCell>{statusIcon(t.status)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{t.duration_ms ?? "—"}ms</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{new Date(t.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Last Result Panel */}
      {lastResult && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Test Result</CardTitle>
                {statusIcon((lastResult as any).status ?? "passed")}
                <Badge variant="outline" className="text-xs">{(lastResult as any).test_type ?? "test"}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedResult(!expandedResult)}
              >
                {expandedResult ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
            {(lastResult as any).correlation_id && (
              <p className="text-xs text-muted-foreground font-mono">ID: {(lastResult as any).correlation_id}</p>
            )}
          </CardHeader>
          {expandedResult && (
            <CardContent>
              <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-auto max-h-[400px] text-foreground">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
