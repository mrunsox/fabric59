import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, Loader2, Copy, Check } from "lucide-react";

interface TestResponse {
  status: number;
  statusText: string;
  data: unknown;
  duration: number;
}

const samplePayloads = {
  intake: JSON.stringify(
    {
      contact: {
        name: "John Doe",
        phone: "416-123-4567",
        email: "john@example.com",
      },
      intake: {
        type: "consultation",
        service: "divorce",
        urgency: "high",
        custom: {
          gate_code: "1234",
          notes: "Urgent matter",
        },
      },
    },
    null,
    2
  ),
  contact: JSON.stringify(
    {
      name: "Jane Smith",
      phone: "416-987-6543",
      email: "jane@example.com",
    },
    null,
    2
  ),
  lookup: "",
};

export default function TestConsolePage() {
  const { data: tenants = [] } = useTenants();
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [endpoint, setEndpoint] = useState("/contacts");
  const [method, setMethod] = useState<"GET" | "POST" | "PATCH">("POST");
  const [payload, setPayload] = useState(samplePayloads.intake);
  const [queryParams, setQueryParams] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<TestResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTest = async () => {
    if (!selectedTenant) {
      toast.error("Please select a tenant");
      return;
    }

    setIsLoading(true);
    setResponse(null);
    const startTime = Date.now();

    try {
      // For now, simulate the API call since edge functions aren't deployed yet
      // In production, this would call the actual edge function
      const simulatedResponse = {
        success: true,
        tenant_id: selectedTenant,
        endpoint,
        method,
        message: "Simulated response - Edge functions will handle real CRM calls",
        payload: method !== "GET" ? JSON.parse(payload) : null,
      };

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));

      const duration = Date.now() - startTime;

      setResponse({
        status: 200,
        statusText: "OK",
        data: simulatedResponse,
        duration,
      });

      // Log the API call
      await supabase.from("api_logs").insert([
        {
          tenant_id: selectedTenant,
          endpoint: `/api/v1/tenants/${selectedTenant}${endpoint}`,
          method,
          request_payload: method !== "GET" ? JSON.parse(payload) : null,
          response: simulatedResponse,
          status: "success",
          response_time_ms: duration,
        },
      ]);

      toast.success("Request completed successfully");
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      setResponse({
        status: 500,
        statusText: "Error",
        data: { error: errorMessage },
        duration,
      });

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

  const handleLoadSample = (type: keyof typeof samplePayloads) => {
    setPayload(samplePayloads[type]);
    if (type === "lookup") {
      setMethod("GET");
      setEndpoint("/contacts");
      setQueryParams("phone=416-123-4567");
    } else if (type === "contact") {
      setMethod("POST");
      setEndpoint("/contacts");
    } else {
      setMethod("POST");
      setEndpoint("/intakes");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Test Console</h1>
        <p className="text-muted-foreground">
          Simulate Five9 API calls to test your CRM integrations
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Request Builder</CardTitle>
            <CardDescription>
              Configure and send test requests to the integration fabric
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tenant Selection */}
            <div className="space-y-2">
              <Label>Target Tenant *</Label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      <span className="flex items-center gap-2">
                        {tenant.name}
                        <StatusBadge variant={tenant.crm_type as "clio" | "workiz" | "other"}>
                          {tenant.crm_type}
                        </StatusBadge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Method & Endpoint */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>Method</Label>
                <Select
                  value={method}
                  onValueChange={(v) => setMethod(v as "GET" | "POST" | "PATCH")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label>Endpoint</Label>
                <Input
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="/contacts"
                />
              </div>
            </div>

            {method === "GET" && (
              <div className="space-y-2">
                <Label>Query Parameters</Label>
                <Input
                  value={queryParams}
                  onChange={(e) => setQueryParams(e.target.value)}
                  placeholder="phone=416-123-4567&email=john@example.com"
                />
              </div>
            )}

            {method !== "GET" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Request Payload</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLoadSample("intake")}
                    >
                      Load Intake
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLoadSample("contact")}
                    >
                      Load Contact
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  className="font-mono text-sm min-h-[200px]"
                  placeholder='{"key": "value"}'
                />
              </div>
            )}

            <Button
              onClick={handleTest}
              disabled={isLoading || !selectedTenant}
              className="w-full gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isLoading ? "Sending..." : "Send Request"}
            </Button>
          </CardContent>
        </Card>

        {/* Response Viewer */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Response</CardTitle>
                <CardDescription>
                  View the response from your test request
                </CardDescription>
              </div>
              {response && (
                <div className="flex items-center gap-3">
                  <StatusBadge
                    variant={response.status < 400 ? "success" : "error"}
                  >
                    {response.status} {response.statusText}
                  </StatusBadge>
                  <span className="text-sm text-muted-foreground">
                    {response.duration}ms
                  </span>
                  <Button variant="ghost" size="icon" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
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
                  <pre className="rounded-lg bg-muted p-4 text-sm font-mono overflow-auto max-h-[400px]">
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                </TabsContent>
                <TabsContent value="raw" className="mt-4">
                  <pre className="rounded-lg bg-muted p-4 text-sm font-mono overflow-auto max-h-[400px]">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                Send a request to see the response
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
