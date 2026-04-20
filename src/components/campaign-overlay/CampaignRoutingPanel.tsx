import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Route, AlertTriangle, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { useFive9Routes, useUpsertFive9Route } from "@/hooks/useFive9Overlay";
import { useLegalConnections } from "@/hooks/useLegalConnect";
import { toast } from "sonner";

interface Props {
  clientId: string;
  organizationId: string;
  campaignRouteId?: string;
}

const CAMPAIGN_TYPES = [
  { value: "intake", label: "Intake (new client)" },
  { value: "existing_client_support", label: "Existing client support" },
  { value: "callback", label: "Callback" },
  { value: "consult_booking", label: "Consult booking" },
  { value: "other", label: "Other" },
];

export default function CampaignRoutingPanel({ clientId, organizationId, campaignRouteId }: Props) {
  const { data: routes } = useFive9Routes(clientId);
  const { data: connections } = useLegalConnections(clientId);
  const upsert = useUpsertFive9Route();

  const route = useMemo(
    () => (routes ?? []).find((r: any) => r.id === campaignRouteId) ?? null,
    [routes, campaignRouteId],
  );

  const [draft, setDraft] = useState<any>(() => ({
    five9_domain: route?.five9_domain ?? "",
    campaign_name: route?.campaign_name ?? "",
    dnis: route?.dnis ?? "",
    queue_id: route?.queue_id ?? "",
    provider_target: route?.provider_target ?? "",
    connection_id: route?.connection_id ?? "",
    campaign_type: route?.campaign_type ?? "intake",
    priority: route?.priority ?? 100,
  }));

  const connectedProviders = (connections ?? []).filter((c: any) => c.status === "connected");
  const eligibleConnections = draft.provider_target
    ? connectedProviders.filter((c: any) => c.provider === draft.provider_target)
    : connectedProviders;

  const save = async () => {
    if (!draft.five9_domain) {
      toast.error("Five9 domain is required");
      return;
    }
    await upsert.mutateAsync({
      ...draft,
      id: route?.id,
      client_id: clientId,
      organization_id: organizationId,
      provider_target: draft.provider_target || null,
      connection_id: draft.connection_id || null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Campaign Routing</CardTitle>
        </div>
        <CardDescription>
          Bind this Five9 campaign/profile to the client and pick which already-connected provider
          to write to. Secrets and OAuth never appear here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Five9 domain *</Label>
            <Input
              value={draft.five9_domain}
              onChange={(e) => setDraft({ ...draft, five9_domain: e.target.value })}
              placeholder="acme.five9.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Campaign name</Label>
            <Input
              value={draft.campaign_name ?? ""}
              onChange={(e) => setDraft({ ...draft, campaign_name: e.target.value })}
              placeholder="Inbound Intake"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">DNIS</Label>
            <Input
              value={draft.dnis ?? ""}
              onChange={(e) => setDraft({ ...draft, dnis: e.target.value })}
              placeholder="optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Queue ID</Label>
            <Input
              value={draft.queue_id ?? ""}
              onChange={(e) => setDraft({ ...draft, queue_id: e.target.value })}
              placeholder="optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Campaign type</Label>
            <Select
              value={draft.campaign_type}
              onValueChange={(v) => setDraft({ ...draft, campaign_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Priority</Label>
            <Input
              type="number"
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Provider target</Label>
            <Badge variant="outline" className="text-[10px]">
              {connectedProviders.length} connected
            </Badge>
          </div>

          {connectedProviders.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No providers connected for this client</AlertTitle>
              <AlertDescription className="text-xs">
                You can save the campaign without a provider, but tests and live writes are blocked
                until you{" "}
                <Link
                  to={`/admin/clients/${clientId}/legal-connect`}
                  className="text-primary underline"
                >
                  connect one in Client → Legal Connect
                </Link>
                .
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Provider</Label>
                <Select
                  value={draft.provider_target || "none"}
                  onValueChange={(v) =>
                    setDraft({
                      ...draft,
                      provider_target: v === "none" ? "" : v,
                      connection_id: "",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— none —</SelectItem>
                    {Array.from(new Set(connectedProviders.map((c: any) => c.provider))).map(
                      (p: any) => (
                        <SelectItem key={p} value={p} className="capitalize">
                          {p}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Connection</Label>
                <Select
                  value={draft.connection_id || "none"}
                  onValueChange={(v) =>
                    setDraft({ ...draft, connection_id: v === "none" ? "" : v })
                  }
                  disabled={!draft.provider_target}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick connection" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— none —</SelectItem>
                    {eligibleConnections.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.provider} • {c.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={upsert.isPending}>
            <Save className="h-3.5 w-3.5 mr-1.5" /> Save Routing
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
