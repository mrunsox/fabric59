import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Radio, Eye, PlayCircle } from "lucide-react";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import WorkspaceAgentCockpitPage from "@/pages/workspace/WorkspaceAgentCockpitPage";
import WorkspaceSupervisorPage from "@/pages/workspace/WorkspaceSupervisorPage";
import WorkspaceRunsPage from "@/pages/workspace/WorkspaceRunsPage";

/**
 * Phase 4 — Canonical Cockpit shell.
 *
 * Tabs Live / Supervisor / Runs over the existing pages without changing
 * their behavior. The selected tab is encoded in `?tab=` so deep links and
 * back/forward navigation are preserved. The standalone /agent, /runs and
 * /supervisor routes remain mounted for back-compat.
 */
type TabKey = "live" | "supervisor" | "runs";

const TABS: Array<{
  key: TabKey;
  label: string;
  icon: typeof Radio;
  description: string;
}> = [
  { key: "live", label: "Live", icon: Radio, description: "Take a call." },
  {
    key: "supervisor",
    label: "Supervisor",
    icon: Eye,
    description: "Monitor in-flight calls.",
  },
  {
    key: "runs",
    label: "Runs",
    icon: PlayCircle,
    description: "Flow execution history.",
  },
];

export default function WorkspaceCockpitShell() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab") as TabKey | null;
  const active: TabKey = useMemo(
    () => (TABS.some((t) => t.key === requested) ? (requested as TabKey) : "live"),
    [requested],
  );

  const setActive = (key: TabKey) => {
    const next = new URLSearchParams(params);
    if (key === "live") next.delete("tab");
    else next.set("tab", key);
    setParams(next, { replace: true });
  };

  const lede = TABS.find((t) => t.key === active)?.description;

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Cockpit"
        title="Cockpit"
        lede={lede}
      />
      <Tabs value={active} onValueChange={(v) => setActive(v as TabKey)}>
        <TabsList>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.key} value={t.key} data-testid={`cockpit-tab-${t.key}`}>
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <TabsContent value="live" className="mt-4">
          {active === "live" && <WorkspaceAgentCockpitPage />}
        </TabsContent>
        <TabsContent value="supervisor" className="mt-4">
          {active === "supervisor" && <WorkspaceSupervisorPage />}
        </TabsContent>
        <TabsContent value="runs" className="mt-4">
          {active === "runs" && <WorkspaceRunsPage />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
