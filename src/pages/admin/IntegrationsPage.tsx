import { useState, useMemo } from "react";
import { Search, Plug } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { IntegrationDetailDialog } from "@/components/integrations/IntegrationDetailDialog";
import {
  integrationsCatalog,
  CATEGORIES,
  type Integration,
} from "@/data/integrations-catalog";
import { useTenants } from "@/hooks/useTenants";

const ALL_TAB = "All";

export default function IntegrationsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(ALL_TAB);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const { data: tenants } = useTenants();

  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    if (!tenants) return ids;
    for (const t of tenants) {
      if (t.crm_type && t.crm_type !== "other") ids.add(t.crm_type);
      if (t.slack_webhook_url) ids.add("slack");
      if (t.zapier_webhook_url) ids.add("zapier");
      if (t.make_webhook_url) ids.add("make");
      if (t.n8n_webhook_url) ids.add("n8n");
      if (t.pabbly_webhook_url) ids.add("pabbly");
      if ((t as any).teams_webhook_url) ids.add("ms-teams");
      if ((t as any).twilio_account_sid) ids.add("twilio");
      if ((t as any).zoom_api_key) ids.add("zoom");
      if ((t as any).google_calendar_id) { ids.add("google-calendar"); ids.add("google-drive"); }
      if ((t as any).stripe_api_key) ids.add("stripe");
      if ((t as any).quickbooks_api_key) ids.add("quickbooks");
      if ((t as any).calendly_api_key) ids.add("calendly");
      if ((t as any).docusign_api_key) ids.add("docusign");
      if ((t as any).dropbox_api_key) ids.add("dropbox");
      if ((t as any).microsoft365_api_key) ids.add("microsoft-365");
      if ((t as any).asana_api_key) ids.add("asana");
      if ((t as any).openai_api_key) ids.add("openai");
      if ((t as any).power_automate_webhook_url) ids.add("power-automate");
    }
    return ids;
  }, [tenants]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return integrationsCatalog.filter((i) => {
      const matchesCategory = activeTab === ALL_TAB || i.category === activeTab;
      const matchesSearch =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, activeTab]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { [ALL_TAB]: integrationsCatalog.length };
    for (const cat of CATEGORIES) {
      map[cat] = integrationsCatalog.filter((i) => i.category === cat).length;
    }
    return map;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Plug className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Browse available integrations for your Five9 call center. Connect CRMs, messaging tools,
          document storage, billing platforms, and more.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search integrations..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs + Grid */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex h-auto gap-1 bg-transparent p-0 pb-2">
            {[ALL_TAB, ...CATEGORIES].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1.5 text-xs flex-shrink-0"
              >
                {tab === ALL_TAB ? "All" : tab.split(" / ")[0]}{" "}
                <span className="ml-1 opacity-70">({counts[tab] ?? 0})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {/* Single content area for all tabs since filtering is JS-driven */}
        <TabsContent value={activeTab} className="mt-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Plug className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No integrations found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  isConnected={connectedIds.has(integration.id)}
                  onSelect={setSelectedIntegration}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <IntegrationDetailDialog
        integration={selectedIntegration}
        open={!!selectedIntegration}
        onOpenChange={(open) => !open && setSelectedIntegration(null)}
      />
    </div>
  );
}
