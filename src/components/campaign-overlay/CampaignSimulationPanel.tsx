import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Play, AlertTriangle, TestTube2 } from "lucide-react";
import { useRunFive9Simulation, useFive9Routes } from "@/hooks/useFive9Overlay";
import { useLegalConnections } from "@/hooks/useLegalConnect";
import { toast } from "sonner";

interface Props {
  clientId: string;
  campaignRouteId?: string;
}

const DEFAULT_PAYLOAD = {
  call_id: "demo-call-1",
  campaign_name: "Inbound Intake",
  ani: "+15551234567",
  dnis: "+15555550100",
  disposition: "Qualified Lead",
  agent_first_name: "Test",
  agent_last_name: "Agent",
  call_variables: { caller_first_name: "Jane", caller_last_name: "Doe", intake_type: "PI" },
};

export default function CampaignSimulationPanel({ clientId, campaignRouteId }: Props) {
  const { data: routes } = useFive9Routes(clientId);
  const { data: connections } = useLegalConnections(clientId);
  const route = (routes ?? []).find((r: any) => r.id === campaignRouteId);
  const hasProvider = !!route?.connection_id;
  const providerConnected = (connections ?? []).some(
    (c: any) => c.id === route?.connection_id && c.status === "connected",
  );

  const [payload, setPayload] = useState(JSON.stringify(DEFAULT_PAYLOAD, null, 2));
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<any>(null);
  const run = useRunFive9Simulation();

  const handleRun = async () => {
    let parsed;
    try {
      parsed = JSON.parse(payload);
    } catch {
      toast.error("Invalid JSON payload");
      return;
    }
    try {
      const r = await run.mutateAsync({
        raw_payload: { ...parsed, _dry_run: dryRun },
        target_client_id: clientId,
        target_provider: route?.provider_target,
      });
      setResult(r);
      toast.success("Simulation complete");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TestTube2 className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Campaign Simulation</CardTitle>
        </div>
        <CardDescription>
          Send a Five9-style payload through this campaign's pipeline. Toggle dry-run to preview the
          action chain without writing to the provider.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasProvider || !providerConnected ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No connected provider for this campaign</AlertTitle>
            <AlertDescription className="text-xs">
              Live tests are blocked until a provider is connected for this client.{" "}
              <Link
                to={`/admin/clients/${clientId}/legal-connect`}
                className="text-primary underline"
              >
                Connect one in Client → Legal Connect
              </Link>
              .
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="dry-run" className="text-sm cursor-pointer">
                Dry run (no provider writes)
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When off, the simulation calls the real provider adapter.
              </p>
            </div>
            <Switch id="dry-run" checked={dryRun} onCheckedChange={setDryRun} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Five9-style payload</Label>
          <Textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            className="font-mono text-xs h-48"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleRun} disabled={run.isPending || !hasProvider}>
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Run {dryRun ? "Dry Run" : "Live Test"}
          </Button>
        </div>

        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-success/40 text-success">
                {result.success ? "ok" : "failed"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {result.stages?.action_chain?.length ?? 0} action(s) in chain
              </span>
            </div>
            <pre className="text-[10px] bg-muted p-3 rounded-md overflow-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
