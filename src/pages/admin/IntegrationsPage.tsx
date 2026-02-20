import { useState, useMemo } from "react";
import { Search, Plug } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { IntegrationDetailDialog } from "@/components/integrations/IntegrationDetailDialog";
import {
  integrationsCatalog,
  CATEGORIES,
  type Integration,
} from "@/data/integrations-catalog";

const ALL_TAB = "All";

export default function IntegrationsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(ALL_TAB);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

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
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {[ALL_TAB, ...CATEGORIES].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1.5 text-xs"
            >
              {tab === ALL_TAB ? "All" : tab.split(" / ")[0]}{" "}
              <span className="ml-1 opacity-70">({counts[tab] ?? 0})</span>
            </TabsTrigger>
          ))}
        </TabsList>

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
