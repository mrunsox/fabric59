import { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/hooks/useTenants";
import { useLegalConnections } from "@/hooks/useLegalConnect";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowLeft, Plug, Webhook, Shield, Map, HeartPulse, Sparkles, Rocket, TestTube2, BookOpen } from "lucide-react";
import ClientReadinessPanel from "@/components/legal-connect/ClientReadinessPanel";
import DesignPartnerPanel from "@/components/legal-connect/DesignPartnerPanel";
import PilotApprovalPanel from "@/components/legal-connect/PilotApprovalPanel";
import RateLimitsPanel from "@/components/legal-connect/RateLimitsPanel";
import GuidedTestRunner from "@/components/legal-connect/GuidedTestRunner";
import GuidesPanel from "@/components/legal-connect/GuidesPanel";
import GuideDrawer from "@/components/legal-connect/GuideDrawer";
import WhatsNewDrawer from "@/components/legal-connect/WhatsNewDrawer";
import FeedbackDialog from "@/components/legal-connect/FeedbackDialog";
import TenantGAReadinessPanel from "@/components/legal-connect/TenantGAReadinessPanel";
import GoLiveRunbookPanel from "@/components/legal-connect/GoLiveRunbookPanel";
import ProviderConnectionCard from "@/components/legal-connect/ProviderConnectionCard";
import ClioConnectWizard from "@/components/legal-connect/wizards/ClioConnectWizard";
import ClioGrowConnectWizard from "@/components/legal-connect/wizards/ClioGrowConnectWizard";
import MyCaseConnectWizard from "@/components/legal-connect/wizards/MyCaseConnectWizard";
import SmokeballConnectWizard from "@/components/legal-connect/wizards/SmokeballConnectWizard";
import Five9ConnectWizard from "@/components/legal-connect/wizards/Five9ConnectWizard";
import WebhookSettingsPanel from "@/components/legal-connect/WebhookSettingsPanel";
import ProviderPoliciesPanel from "@/components/legal-connect/ProviderPoliciesPanel";
import FieldMappingPanel from "@/components/legal-connect/FieldMappingPanel";
import ConnectionHealthPanel from "@/components/legal-connect/ConnectionHealthPanel";
import { SEOHead } from "@/components/seo/SEOHead";
import { useDeleteLegalConnection } from "@/hooks/useLegalConnect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const PROVIDERS = ["five9", "clio", "clio_grow", "mycase", "smokeball"] as const;
type ProviderKey = (typeof PROVIDERS)[number];

export default function ClientLegalConnectPage() {
  const { clientId, provider } = useParams<{ clientId: string; provider?: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tab = params.get("tab") ?? (provider ? "setup" : "connections");

  const { data: tenant } = useTenant(clientId ?? "");
  const { data: connections } = useLegalConnections(clientId);
  const remove = useDeleteLegalConnection();

  const orgId = tenant?.organization_id ?? "";

  useEffect(() => {
    const clio = params.get("clio");
    if (!clio) return;
    if (clio === "connected") toast.success("Clio connected");
    else toast.error(`Clio: ${params.get("reason") || clio}`);
    const next = new URLSearchParams(params);
    next.delete("clio");
    next.delete("reason");
    setParams(next, { replace: true });
    qc.invalidateQueries({ queryKey: ["legal-connect", "connections"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTab = (t: string) => setParams({ tab: t });

  const findConn = (p: string) => connections?.find((c: any) => c.provider === p) ?? null;

  const handleTest = async (p: string) => {
    const c = findConn(p);
    if (!c) return;
    try {
      const { data, error } = await supabase.functions.invoke("legal-connect-test", {
        body: { connection_id: c.id },
      });
      if (error) throw error;
      const ok = data?.success !== false;
      if (ok) toast.success(`${p}: connection OK`);
      else toast.error(data?.message || `${p}: test failed`);
      qc.invalidateQueries({ queryKey: ["legal-connect", "connections"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <SEOHead
        title={`Legal Connect — ${tenant?.name ?? "Client"} | Fabric59`}
        description="Client-level provider connections, webhooks, and policies"
      />

      <div className="space-y-6">
        <PageHeader
          title="Legal Connect"
          subtitle={tenant?.name ? `Connection setup for ${tenant.name}` : "Client-level provider setup"}
          icon={
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Plug className="h-5 w-5 text-primary" />
            </div>
          }
        >
          <div className="flex items-center gap-2">
            <WhatsNewDrawer audience="design_partners" />
            <FeedbackDialog clientId={clientId} organizationId={orgId} source="in_product" />
            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/clients/${clientId}`)}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Client
            </Button>
          </div>
        </PageHeader>

        {provider ? (
          <div className="max-w-2xl">
            {provider === "five9" && (
              <Five9ConnectWizard
                clientId={clientId!}
                organizationId={orgId}
                onComplete={() => navigate(`/admin/clients/${clientId}/legal-connect`)}
              />
            )}
            {provider === "clio" && (
              <ClioConnectWizard
                clientId={clientId!}
                organizationId={orgId}
                onComplete={() => navigate(`/admin/clients/${clientId}/legal-connect`)}
              />
            )}
            {provider === "mycase" && (
              <MyCaseConnectWizard
                clientId={clientId!}
                organizationId={orgId}
                onComplete={() => navigate(`/admin/clients/${clientId}/legal-connect`)}
              />
            )}
            {provider === "clio_grow" && (
              <ClioGrowConnectWizard
                clientId={clientId!}
                organizationId={orgId}
                onComplete={() => navigate(`/admin/clients/${clientId}/legal-connect`)}
              />
            )}
            {provider === "smokeball" && (
              <SmokeballConnectWizard
                clientId={clientId!}
                organizationId={orgId}
                onComplete={() => navigate(`/admin/clients/${clientId}/legal-connect`)}
              />
            )}
            {!["five9", "clio", "clio_grow", "mycase", "smokeball"].includes(provider) && (
              <div className="text-sm text-muted-foreground">Unknown provider: {provider}</div>
            )}
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="connections" className="gap-1.5">
                <Plug className="h-3.5 w-3.5" /> Connections
              </TabsTrigger>
              <TabsTrigger value="readiness" className="gap-1.5">
                <Rocket className="h-3.5 w-3.5" /> Readiness
              </TabsTrigger>
              <TabsTrigger value="tests" className="gap-1.5">
                <TestTube2 className="h-3.5 w-3.5" /> Tests
              </TabsTrigger>
              <TabsTrigger value="guides" className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Guides
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="gap-1.5">
                <Webhook className="h-3.5 w-3.5" /> Webhooks
              </TabsTrigger>
              <TabsTrigger value="policies" className="gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Policies
              </TabsTrigger>
              <TabsTrigger value="mappings" className="gap-1.5">
                <Map className="h-3.5 w-3.5" /> Field Mappings
              </TabsTrigger>
              <TabsTrigger value="health" className="gap-1.5">
                <HeartPulse className="h-3.5 w-3.5" /> Health
              </TabsTrigger>
            </TabsList>

            <TabsContent value="connections" className="mt-4 space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {PROVIDERS.map((p) => (
                  <ProviderConnectionCard
                    key={p}
                    clientId={clientId!}
                    provider={p}
                    connection={findConn(p)}
                    onTest={() => handleTest(p)}
                    disabledReason={null}
                    onDisconnect={async () => {
                      const c = findConn(p);
                      if (!c) return;
                      if (!confirm(`Disconnect ${p}?`)) return;
                      await remove.mutateAsync(c.id);
                    }}
                  />
                ))}
              </div>
              <div className="rounded-lg border border-dashed border-border p-4 flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  Provider credentials, OAuth tokens, and webhook secrets live exclusively at this
                  client level. Campaign setup never asks for secrets — it only references already
                  connected providers.
                </div>
              </div>
            </TabsContent>

            <TabsContent value="readiness" className="mt-4 space-y-4">
              <DesignPartnerPanel clientId={clientId!} />
              <PilotApprovalPanel clientId={clientId!} />
              <RateLimitsPanel clientId={clientId!} />
              <ClientReadinessPanel clientId={clientId!} />
            </TabsContent>

            <TabsContent value="tests" className="mt-4">
              <GuidedTestRunner clientId={clientId!} />
            </TabsContent>

            <TabsContent value="guides" className="mt-4">
              <GuidesPanel />
            </TabsContent>

            <TabsContent value="webhooks" className="mt-4">
              <WebhookSettingsPanel clientId={clientId!} />
            </TabsContent>

            <TabsContent value="policies" className="mt-4">
              <ProviderPoliciesPanel clientId={clientId!} />
            </TabsContent>

            <TabsContent value="mappings" className="mt-4">
              <FieldMappingPanel clientId={clientId!} />
            </TabsContent>

            <TabsContent value="health" className="mt-4">
              <ConnectionHealthPanel clientId={clientId!} />
            </TabsContent>
          </Tabs>
        )}
      </div>
      <GuideDrawer />
    </>
  );
}
