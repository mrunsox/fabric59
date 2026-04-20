import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, PhoneCall, Route, Variable, ListChecks, Shield, FlaskConical, HeartPulse, Plug } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { useTenant } from "@/hooks/useTenants";
import { useFive9Routes } from "@/hooks/useFive9Overlay";
import { useLegalConnections } from "@/hooks/useLegalConnect";
import CampaignRoutingPanel from "@/components/campaign-overlay/CampaignRoutingPanel";
import CampaignVariablesPanel from "@/components/campaign-overlay/CampaignVariablesPanel";
import CampaignDispositionsPanel from "@/components/campaign-overlay/CampaignDispositionsPanel";
import CampaignPoliciesPanel from "@/components/campaign-overlay/CampaignPoliciesPanel";
import CampaignSimulationPanel from "@/components/campaign-overlay/CampaignSimulationPanel";
import CampaignHealthPanel from "@/components/campaign-overlay/CampaignHealthPanel";

export default function CampaignOverlayPage() {
  const { clientId, campaignRouteId } = useParams<{ clientId: string; campaignRouteId: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const tab = params.get("tab") ?? "routing";
  const setTab = (t: string) => setParams({ tab: t });

  const { data: tenant } = useTenant(clientId ?? "");
  const { data: routes } = useFive9Routes(clientId);
  const { data: connections } = useLegalConnections(clientId);

  const route = useMemo(
    () => (routes ?? []).find((r: any) => r.id === campaignRouteId) ?? null,
    [routes, campaignRouteId],
  );
  const connection = useMemo(
    () => (connections ?? []).find((c: any) => c.id === route?.connection_id) ?? null,
    [connections, route],
  );

  const orgId = tenant?.organization_id ?? "";

  return (
    <>
      <SEOHead
        title={`${route?.campaign_name ?? "Campaign"} — Five9 Overlay | Fabric59`}
        description="Campaign-scoped Five9 routing and provider write-back"
      />

      <div className="space-y-6">
        <PageHeader
          title={route?.campaign_name || route?.five9_domain || "Campaign"}
          subtitle={tenant?.name ? `${tenant.name} · ${route?.five9_domain ?? ""}` : route?.five9_domain ?? ""}
          icon={
            <div className="rounded-xl bg-primary/10 p-2.5">
              <PhoneCall className="h-5 w-5 text-primary" />
            </div>
          }
          breadcrumb={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/admin/clients/${clientId}/five9-overlay`)}
              className="text-muted-foreground gap-1.5 -ml-2 h-7"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Campaigns
            </Button>
          }
        >
          {route?.campaign_type && (
            <Badge variant="outline" className="text-[10px] capitalize">
              {route.campaign_type.replace(/_/g, " ")}
            </Badge>
          )}
          {route?.provider_target ? (
            connection?.status === "connected" ? (
              <Badge variant="outline" className="text-[10px] border-success/40 text-success capitalize">
                <Plug className="h-3 w-3 mr-1" /> {route.provider_target} connected
              </Badge>
            ) : (
              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link to={`/admin/clients/${clientId}/legal-connect`}>
                  <Plug className="h-3 w-3 mr-1" /> {route.provider_target} not connected — fix
                </Link>
              </Button>
            )
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              No provider assigned
            </Badge>
          )}
        </PageHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="routing" className="gap-1.5 text-xs">
              <Route className="h-3.5 w-3.5" /> Routing
            </TabsTrigger>
            <TabsTrigger value="variables" className="gap-1.5 text-xs">
              <Variable className="h-3.5 w-3.5" /> Variables
            </TabsTrigger>
            <TabsTrigger value="dispositions" className="gap-1.5 text-xs">
              <ListChecks className="h-3.5 w-3.5" /> Dispositions
            </TabsTrigger>
            <TabsTrigger value="policies" className="gap-1.5 text-xs">
              <Shield className="h-3.5 w-3.5" /> Policies
            </TabsTrigger>
            <TabsTrigger value="simulation" className="gap-1.5 text-xs">
              <FlaskConical className="h-3.5 w-3.5" /> Simulation
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-1.5 text-xs">
              <HeartPulse className="h-3.5 w-3.5" /> Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="routing" className="mt-4">
            <CampaignRoutingPanel
              clientId={clientId!}
              organizationId={orgId}
              campaignRouteId={campaignRouteId}
            />
          </TabsContent>
          <TabsContent value="variables" className="mt-4">
            <CampaignVariablesPanel
              clientId={clientId!}
              organizationId={orgId}
              campaignId={campaignRouteId}
            />
          </TabsContent>
          <TabsContent value="dispositions" className="mt-4">
            <CampaignDispositionsPanel clientId={clientId!} campaignId={campaignRouteId} />
          </TabsContent>
          <TabsContent value="policies" className="mt-4">
            <CampaignPoliciesPanel clientId={clientId!} campaignId={campaignRouteId} />
          </TabsContent>
          <TabsContent value="simulation" className="mt-4">
            <CampaignSimulationPanel clientId={clientId!} campaignRouteId={campaignRouteId} />
          </TabsContent>
          <TabsContent value="health" className="mt-4">
            <CampaignHealthPanel clientId={clientId!} campaignRouteId={campaignRouteId} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
