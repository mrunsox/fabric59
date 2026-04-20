import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, PhoneCall, Plus, Megaphone, Plug } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { useTenant } from "@/hooks/useTenants";
import { useFive9Routes, useUpsertFive9Route } from "@/hooks/useFive9Overlay";
import { useLegalConnections } from "@/hooks/useLegalConnect";
import { toast } from "sonner";

const CAMPAIGN_TYPES = [
  { value: "intake", label: "Intake (new client)" },
  { value: "existing_client_support", label: "Existing client support" },
  { value: "callback", label: "Callback" },
  { value: "consult_booking", label: "Consult booking" },
  { value: "other", label: "Other" },
];

export default function CampaignOverlayListPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { data: tenant } = useTenant(clientId ?? "");
  const { data: routes, isLoading } = useFive9Routes(clientId);
  const { data: connections } = useLegalConnections(clientId);
  const upsert = useUpsertFive9Route();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    five9_domain: "",
    campaign_name: "",
    campaign_type: "intake",
  });

  const connectedCount = (connections ?? []).filter((c: any) => c.status === "connected").length;

  const handleCreate = async () => {
    if (!draft.five9_domain.trim()) {
      toast.error("Five9 domain is required");
      return;
    }
    const created: any = await upsert.mutateAsync({
      client_id: clientId,
      organization_id: tenant?.organization_id,
      five9_domain: draft.five9_domain.trim(),
      campaign_name: draft.campaign_name.trim() || null,
      campaign_type: draft.campaign_type,
      priority: 100,
      is_active: true,
    });
    setOpen(false);
    setDraft({ five9_domain: "", campaign_name: "", campaign_type: "intake" });
    if (created?.id) navigate(`/admin/clients/${clientId}/five9-overlay/campaigns/${created.id}`);
  };

  return (
    <>
      <SEOHead
        title={`Five9 Overlay — ${tenant?.name ?? "Client"} | Fabric59`}
        description="Campaign-level Five9 routing, variables, dispositions"
      />

      <div className="space-y-6">
        <PageHeader
          title="Five9 Overlay"
          subtitle={tenant?.name ? `Campaign routes for ${tenant.name}` : "Campaign routes"}
          icon={
            <div className="rounded-xl bg-primary/10 p-2.5">
              <PhoneCall className="h-5 w-5 text-primary" />
            </div>
          }
        >
          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/clients/${clientId}`)}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Client
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New Campaign Route
          </Button>
        </PageHeader>

        <Card className="border-dashed">
          <CardContent className="flex items-start gap-3 p-4">
            <Plug className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-xs text-muted-foreground">
              Campaign routes never store provider secrets. They reference one of the{" "}
              <Link to={`/admin/clients/${clientId}/legal-connect`} className="text-primary underline">
                {connectedCount} connected provider{connectedCount === 1 ? "" : "s"}
              </Link>{" "}
              on this client.
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : !routes || routes.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center text-center gap-3">
              <div className="rounded-full bg-muted p-3">
                <Megaphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No campaign routes yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first Five9 campaign route to map a domain/campaign to a connected provider.
                </p>
              </div>
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Create campaign route
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {routes.map((r: any) => {
              const conn = (connections ?? []).find((c: any) => c.id === r.connection_id);
              return (
                <Card
                  key={r.id}
                  className="cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => navigate(`/admin/clients/${clientId}/five9-overlay/campaigns/${r.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">
                          {r.campaign_name || r.five9_domain}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1 font-mono truncate">
                          {r.five9_domain}
                          {r.dnis ? ` · ${r.dnis}` : ""}
                        </CardDescription>
                      </div>
                      <Badge variant={r.is_active ? "default" : "secondary"} className="text-[10px]">
                        {r.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.campaign_type && (
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {r.campaign_type.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {r.provider_target ? (
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${
                            conn?.status === "connected"
                              ? "border-success/40 text-success"
                              : "border-destructive/40 text-destructive"
                          }`}
                        >
                          {r.provider_target}
                          {conn?.status !== "connected" && " · not connected"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          No provider assigned
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New campaign route</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
                value={draft.campaign_name}
                onChange={(e) => setDraft({ ...draft, campaign_name: e.target.value })}
                placeholder="Inbound Intake"
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
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={upsert.isPending}>
              Create & open
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
