// Phase 10 — Workspace knowledge & AI configuration page.
// Tabs: Overview, Sources, AI Configuration.
import { useParams } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Database, Sparkles, ShieldCheck } from "lucide-react";
import { KpiCard } from "@/components/common/KpiCard";
import { EmptyState } from "@/components/common/EmptyState";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import {
  useWorkspaceAiConfig,
  useUpdateWorkspaceAiConfig,
  useWorkspaceKnowledgeSources,
  useToggleKnowledgeSource,
} from "@/hooks/useWorkspaceAi";

const SOURCE_LABELS: Record<string, { label: string; description: string }> = {
  kb_articles: { label: "Knowledge base articles", description: "Published KB content for the organization." },
  guides: { label: "Guides", description: "Canonical workspace guides as procedural knowledge." },
  templates: { label: "Templates", description: "Workspace + org templates available for grounding." },
  call_summaries: { label: "Call summaries", description: "Recent summarized call sessions (opt-in per workspace)." },
  call_outcomes: { label: "Call outcomes", description: "Outcome metadata for post-call intelligence." },
  uploads: { label: "Uploaded documents", description: "Workspace document uploads — deferred (Phase 10 follow-up)." },
  urls: { label: "External URLs", description: "Whitelisted external URLs — deferred (Phase 10 follow-up)." },
};

export default function WorkspaceKnowledgePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: config } = useWorkspaceAiConfig(workspaceId);
  const updateConfig = useUpdateWorkspaceAiConfig();
  const { data: sources = [] } = useWorkspaceKnowledgeSources(workspaceId);
  const toggleSource = useToggleKnowledgeSource();

  const [tone, setTone] = useState(config?.tone ?? "professional");
  const [industry, setIndustry] = useState(config?.industry ?? "");
  const [jurisdiction, setJurisdiction] = useState(config?.jurisdiction ?? "");

  // Sync local state when config loads
  if (config && tone !== config.tone && !updateConfig.isPending) {
    // first hydrate
  }

  const enabledCount = sources.filter((s) => s.enabled).length;

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Workspace knowledge"
        title="Knowledge"
        lede="What this workspace knows, how the assistant grounds its answers, and which sources are live."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Enabled sources" value={`${enabledCount}/${sources.length}`} icon={Database} />
        <KpiCard label="AI assistant" value={config?.enabled ? "On" : "Off"} icon={Sparkles} />
        <KpiCard label="Mode" value={config?.knowledge_only ? "KB only" : "Balanced"} icon={ShieldCheck} />
        <KpiCard label="Tone" value={config?.tone ?? "—"} icon={BookOpen} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="config">AI configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">How grounding works in this workspace</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3 text-muted-foreground">
              <p>
                The workspace AI assistant pulls from the sources you enable here, scoped strictly to this workspace and
                organization. Nothing crosses tenants.
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong className="text-foreground">Layer 1 — Live assist:</strong> in-builder suggestions surface in the
                  guide and campaign editors. They propose; humans apply.
                </li>
                <li>
                  <strong className="text-foreground">Layer 2 — Workspace knowledge:</strong> the assistant at{" "}
                  <code className="text-xs">/assistant</code> grounds in the sources below.
                </li>
                <li>
                  <strong className="text-foreground">Layer 3 — Post-call intelligence:</strong> QA + analytics surfaces
                  use call summaries and outcomes to suggest commentary and follow-ups.
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="mt-6 space-y-3">
          {sources.length === 0 ? (
            <EmptyState icon={Database} title="No knowledge sources yet" description="Sources are seeded automatically per workspace." />
          ) : (
            sources.map((s) => {
              const meta = SOURCE_LABELS[s.source_type] ?? { label: s.source_type, description: "" };
              return (
                <Card key={s.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{meta.label}</span>
                        <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        {s.last_indexed_at
                          ? `Last indexed ${new Date(s.last_indexed_at).toLocaleString()}`
                          : "Indexed on demand at query time."}
                        {s.item_count ? ` · ${s.item_count} items` : ""}
                      </p>
                    </div>
                    <Switch
                      checked={s.enabled}
                      onCheckedChange={(enabled) =>
                        toggleSource.mutate({ id: s.id, workspaceId: workspaceId!, enabled })
                      }
                    />
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="config" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Workspace AI behavior</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Assistant enabled</Label>
                  <p className="text-xs text-muted-foreground">Turn the workspace assistant on or off.</p>
                </div>
                <Switch
                  checked={config?.enabled ?? true}
                  onCheckedChange={(v) => updateConfig.mutate({ workspaceId: workspaceId!, enabled: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Knowledge only mode</Label>
                  <p className="text-xs text-muted-foreground">Restrict answers to workspace-grounded knowledge.</p>
                </div>
                <Switch
                  checked={config?.knowledge_only ?? false}
                  onCheckedChange={(v) => updateConfig.mutate({ workspaceId: workspaceId!, knowledge_only: v })}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Tone</Label>
                  <select
                    className="w-full mt-1 h-10 rounded-md border bg-background px-3 text-sm"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                  >
                    <option value="professional">Professional</option>
                    <option value="conversational">Conversational</option>
                    <option value="concise">Concise</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Industry context</Label>
                  <Input
                    placeholder="e.g. personal injury law"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Jurisdiction</Label>
                  <Input
                    placeholder="e.g. US, Ontario"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Button
                  size="sm"
                  onClick={() =>
                    updateConfig.mutate({
                      workspaceId: workspaceId!,
                      tone,
                      industry: industry || null,
                      jurisdiction: jurisdiction || null,
                    })
                  }
                  disabled={updateConfig.isPending}
                >
                  Save behavior
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Platform-level system prompts are read-only. Workspace admins can adjust tone, industry, and jurisdiction.
                All changes are logged.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
