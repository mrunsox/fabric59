import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { History, LayoutTemplate, RotateCcw, Save, Send } from "lucide-react";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { SectionList } from "@/components/workspace-guide/SectionList";
import { SectionEditor } from "@/components/workspace-guide/SectionEditor";
import {
  useWorkspaceCanonicalGuide,
  useLatestSingletonVersion,
  useSaveSingletonDraft,
  usePublishSingletonVersion,
  useSingletonGuideVersions,
  useRestoreSingletonVersion,
} from "@/hooks/useWorkspaceCanonicalGuide";
import {
  DEFAULT_SECTION_LABELS,
  WORKSPACE_GUIDE_TEMPLATES,
  getTemplate,
} from "@/lib/workspace-guide/templates";
import { newId } from "@/lib/workspace-guide/schema";
import {
  EMPTY_WORKSPACE_GUIDE,
  type WorkspaceGuideContentV2,
  type WorkspaceGuideSection,
  type WorkspaceGuideSectionKind,
} from "@/types/workspace-guide";

/**
 * Phase 4 — Canonical workspace guide builder.
 *
 * One singleton guide per workspace, structured by sections.
 * Mounted at /w/:workspaceId/guide (and reachable via the legacy
 * /app/workspaces/:workspaceId/guide redirect through LegacyWorkspaceRedirect).
 */
export default function WorkspaceGuideBuilderPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: guide, isLoading } = useWorkspaceCanonicalGuide();
  const { data: latest } = useLatestSingletonVersion(guide?.id);
  const { data: versions = [] } = useSingletonGuideVersions(guide?.id);

  const saveDraft = useSaveSingletonDraft();
  const publish = usePublishSingletonVersion();
  const restore = useRestoreSingletonVersion();

  const [content, setContent] = useState<WorkspaceGuideContentV2>(EMPTY_WORKSPACE_GUIDE);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (latest) {
      setContent(latest.content);
      setActiveId((prev) => prev ?? latest.content.sections[0]?.id ?? null);
    }
  }, [latest]);

  const activeSection = useMemo(
    () => content.sections.find((s) => s.id === activeId) ?? null,
    [content.sections, activeId],
  );

  if (isLoading || !guide) {
    return <p className="text-sm text-muted-foreground">Loading workspace guide…</p>;
  }

  const updateSections = (next: WorkspaceGuideSection[]) =>
    setContent({ ...content, sections: next });

  const onAdd = (kind: WorkspaceGuideSectionKind) => {
    const fresh: WorkspaceGuideSection = {
      id: newId("sec"),
      kind,
      label: DEFAULT_SECTION_LABELS[kind],
      visibility: kind === "internal_notes" ? "internal" : "agent",
      required: false,
      enabled: true,
      fields: [{ id: newId("fld"), label: "Body", value: "" }],
    };
    updateSections([...content.sections, fresh]);
    setActiveId(fresh.id);
  };

  const onMove = (id: string, dir: -1 | 1) => {
    const i = content.sections.findIndex((s) => s.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= content.sections.length) return;
    const next = content.sections.slice();
    [next[i], next[j]] = [next[j], next[i]];
    updateSections(next);
  };

  const onRemove = (id: string) => {
    updateSections(content.sections.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const onPatchActive = (next: WorkspaceGuideSection) =>
    updateSections(content.sections.map((s) => (s.id === next.id ? next : s)));

  const onApplyTemplate = (templateId: string) => {
    const tpl = getTemplate(templateId);
    if (!tpl) return;
    const next = tpl.build();
    setContent(next);
    setActiveId(next.sections[0]?.id ?? null);
  };

  const onSaveDraft = () => saveDraft.mutate({ guideId: guide.id, content });

  const onPublishLatest = () => {
    if (!latest) return;
    publish.mutate({ guideId: guide.id, version: latest.version });
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="workspace-guide-builder">
      <WorkspacePageHeader
        eyebrow="Workspace guide"
        title="Workspace guide"
        lede="Structured, section-based agent guide for this workspace. Agents see the published version in the live call runner."
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{guide.status}</Badge>
            <Badge variant="outline">v{guide.current_version} live</Badge>
            {latest && latest.version > guide.current_version && (
              <Badge variant="secondary">latest v{latest.version}</Badge>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" data-testid="apply-template">
                <LayoutTemplate className="h-4 w-4" /> Apply template
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {WORKSPACE_GUIDE_TEMPLATES.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onSelect={() => onApplyTemplate(t.id)}
                  className="flex flex-col items-start gap-0.5 py-2"
                  data-testid={`template-${t.id}`}
                >
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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
                {versions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No versions yet.</p>
                )}
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-md border border-border p-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">v{v.version}</span>
                        {v.is_current && <Badge variant="default" className="text-[10px]">live</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()} · {v.content.sections.length} sections
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      onClick={async () => {
                        await restore.mutateAsync({ guideId: guide.id, content: v.content });
                        setContent(v.content);
                        setActiveId(v.content.sections[0]?.id ?? null);
                        setHistoryOpen(false);
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restore
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onSaveDraft}
            disabled={saveDraft.isPending}
            data-testid="save-draft"
          >
            <Save className="h-4 w-4" /> Save draft
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={onPublishLatest}
            disabled={!latest || publish.isPending}
            data-testid="publish-latest"
          >
            <Send className="h-4 w-4" /> Publish v{latest?.version ?? "?"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <SectionList
              sections={content.sections}
              activeId={activeId}
              onSelect={setActiveId}
              onMove={onMove}
              onRemove={onRemove}
              onAdd={onAdd}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {activeSection ? activeSection.label : "Pick a section"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeSection ? (
              <SectionEditor section={activeSection} onChange={onPatchActive} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a section on the left, add one from the picker, or apply a template to get started.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
