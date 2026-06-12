import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, History, LayoutTemplate, Play, RotateCcw, Save, Send, Copy } from "lucide-react";
import { StepList } from "@/components/campaign-flow/StepList";
import { StepEditor } from "@/components/campaign-flow/StepEditor";
import { OutputMappings } from "@/components/campaign-flow/OutputMappings";
import { PreviewRunner } from "@/components/campaign-flow/PreviewRunner";
import {
  useCampaignFlow,
  useLatestCampaignFlowVersion,
  useCampaignFlowVersions,
  useSaveCampaignFlowDraft,
  usePublishCampaignFlow,
  useRestoreCampaignFlowVersion,
} from "@/hooks/useCampaignFlow";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceCampaign } from "@/hooks/useWorkspaceCampaigns";
import {
  CAMPAIGN_FLOW_TEMPLATES,
  DEFAULT_STEP_TITLES,
  getCampaignFlowTemplate,
} from "@/lib/campaign-flow/templates";
import { newFlowId } from "@/lib/campaign-flow/schema";
import {
  EMPTY_CAMPAIGN_FLOW,
  type CampaignFlowContent,
  type FlowStep,
  type FlowStepType,
} from "@/types/campaign-flow";

/**
 * Phase 5 — Canonical campaign flow builder.
 * Mounted at /w/:workspaceId/campaigns/:campaignId/builder (and reachable
 * via the legacy /app/workspaces/:workspaceId/... redirect).
 */
export default function WorkspaceCampaignFlowBuilderPage() {
  const { workspaceId, campaignId } = useParams<{ workspaceId: string; campaignId: string }>();
  const { workspace } = useWorkspace();
  const { data: campaign } = useWorkspaceCampaign(campaignId);
  const { data: flow, isLoading } = useCampaignFlow(campaignId);
  const { data: latest } = useLatestCampaignFlowVersion(flow?.id);
  const { data: versions = [] } = useCampaignFlowVersions(flow?.id);

  const saveDraft = useSaveCampaignFlowDraft();
  const publish = usePublishCampaignFlow();
  const restore = useRestoreCampaignFlowVersion();

  const [content, setContent] = useState<CampaignFlowContent>(EMPTY_CAMPAIGN_FLOW);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (latest) {
      setContent(latest.content);
      setActiveId((prev) => prev ?? latest.content.steps[0]?.id ?? null);
    }
  }, [latest]);

  const activeStep = useMemo(
    () => content.steps.find((s) => s.id === activeId) ?? null,
    [content.steps, activeId],
  );

  if (isLoading || !flow || !workspace) {
    return <p className="text-sm text-muted-foreground">Loading campaign flow…</p>;
  }

  const base = `/w/${workspaceId}/campaigns`;

  const updateSteps = (next: FlowStep[]) =>
    setContent({ ...content, steps: next.map((s, i) => ({ ...s, order: i + 1 })) });

  const onAdd = (type: FlowStepType) => {
    const fresh: FlowStep = {
      id: newFlowId("stp"),
      type,
      title: DEFAULT_STEP_TITLES[type],
      order: content.steps.length + 1,
      required: false,
      enabled: true,
      nextStepId: null,
      rules: [],
      config: defaultConfigFor(type),
    };
    updateSteps([...content.steps, fresh]);
    setActiveId(fresh.id);
  };

  const onMove = (id: string, dir: -1 | 1) => {
    const i = content.steps.findIndex((s) => s.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= content.steps.length) return;
    const next = content.steps.slice();
    [next[i], next[j]] = [next[j], next[i]];
    updateSteps(next);
  };

  const onRemove = (id: string) => {
    updateSteps(content.steps.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const onDuplicate = (id: string) => {
    const i = content.steps.findIndex((s) => s.id === id);
    if (i < 0) return;
    const src = content.steps[i];
    const clone: FlowStep = { ...src, id: newFlowId("stp"), title: `${src.title} (copy)`, rules: src.rules.map((r) => ({ ...r, id: newFlowId("rule") })) };
    const next = [...content.steps.slice(0, i + 1), clone, ...content.steps.slice(i + 1)];
    updateSteps(next);
    setActiveId(clone.id);
  };

  const onPatchActive = (next: FlowStep) =>
    updateSteps(content.steps.map((s) => (s.id === next.id ? next : s)));

  const onApplyTemplate = (id: string) => {
    const tpl = getCampaignFlowTemplate(id);
    if (!tpl) return;
    const next = tpl.build();
    setContent(next);
    setActiveId(next.steps[0]?.id ?? null);
  };

  const onDuplicateDraft = () => {
    // Duplicate-current-draft: re-saves the current content as a new draft version.
    saveDraft.mutate({ flowId: flow.id, content });
  };

  const onSaveDraft = () => saveDraft.mutate({ flowId: flow.id, content });
  const onPublishLatest = () => {
    if (!latest) return;
    publish.mutate({ flowId: flow.id, version: latest.version });
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="campaign-flow-builder">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to={base} className="hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Campaigns
        </Link>
        <span>/</span>
        <Link to={`${base}/${campaignId}`} className="hover:text-foreground">{campaign?.name ?? "Campaign"}</Link>
        <span>/</span>
        <span className="text-foreground">Builder</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaign flow builder</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Structured decision tree run by the agent during a live call.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{flow.status}</Badge>
          <Badge variant="outline">v{flow.current_version} live</Badge>
          {latest && latest.version > flow.current_version && (
            <Badge variant="secondary">latest v{latest.version}</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" data-testid="apply-template">
                <LayoutTemplate className="h-4 w-4" /> Apply template
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {CAMPAIGN_FLOW_TEMPLATES.map((t) => (
                <DropdownMenuItem key={t.id} onSelect={() => onApplyTemplate(t.id)}
                  className="flex flex-col items-start gap-0.5 py-2" data-testid={`flow-template-${t.id}`}>
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" className="gap-1.5" onClick={onDuplicateDraft}
            data-testid="duplicate-draft">
            <Copy className="h-4 w-4" /> Duplicate draft
          </Button>

          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <History className="h-4 w-4" /> Version history
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Version history</DialogTitle>
                <DialogDescription>
                  Restore any prior version into a new draft. Publishing the new draft makes it live.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-80 overflow-y-auto space-y-1.5">
                {versions.length === 0 && <p className="text-sm text-muted-foreground">No versions yet.</p>}
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">v{v.version}</span>
                        {v.is_current && <Badge variant="default" className="text-[10px]">live</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()} · {v.content.steps.length} steps
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1.5"
                      onClick={async () => {
                        await restore.mutateAsync({ flowId: flow.id, content: v.content });
                        setContent(v.content);
                        setActiveId(v.content.steps[0]?.id ?? null);
                        setHistoryOpen(false);
                      }}>
                      <RotateCcw className="h-3.5 w-3.5" /> Restore
                    </Button>
                  </div>
                ))}
              </div>
              <DialogFooter />
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onSaveDraft}
            disabled={saveDraft.isPending} data-testid="save-draft">
            <Save className="h-4 w-4" /> Save draft
          </Button>
          <Button size="sm" className="gap-1.5" onClick={onPublishLatest}
            disabled={!latest || publish.isPending} data-testid="publish-latest">
            <Send className="h-4 w-4" /> Publish v{latest?.version ?? "?"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="edit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="mappings">Output mappings</TabsTrigger>
          <TabsTrigger value="preview" data-testid="preview-tab">
            <Play className="h-3.5 w-3.5 mr-1" /> Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Steps</CardTitle></CardHeader>
              <CardContent>
                <StepList
                  steps={content.steps}
                  activeId={activeId}
                  onSelect={setActiveId}
                  onMove={onMove}
                  onRemove={onRemove}
                  onDuplicate={onDuplicate}
                  onAdd={onAdd}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{activeStep ? activeStep.title : "Pick a step"}</CardTitle>
              </CardHeader>
              <CardContent>
                {activeStep ? (
                  <StepEditor step={activeStep} allSteps={content.steps} onChange={onPatchActive} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a step on the left, add one from the picker, or apply a template to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mappings">
          <OutputMappings content={content} onChange={setContent} />
        </TabsContent>

        <TabsContent value="preview">
          <PreviewRunner content={content} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function defaultConfigFor(type: FlowStepType): FlowStep["config"] {
  switch (type) {
    case "question_branch": return { prompt: "", options: [] };
    case "information_display": return { body: "" };
    case "field_capture": return { fieldKey: "", fieldType: "short_text" };
    case "outcome_disposition": return { allowedOutcomes: [] };
    case "escalation_trigger": return { targetRole: "" };
    case "notification_trigger": return { channel: "email", target: "" };
    case "end_flow": return { label: "End of call" };
    default: return {};
  }
}
