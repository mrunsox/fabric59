import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Send, ExternalLink } from "lucide-react";
import { useWorkspaceGuide } from "@/hooks/useWorkspaceGuides";
import {
  useCurrentGuideVersion,
  usePublishGuideVersion,
  useSaveGuideDraft,
  useUpdateGuideMeta,
} from "@/hooks/useGuideVersions";

/**
 * Phase 6 — Native canonical guide editor.
 *
 * For guides whose source_type='script' (mirrored from legacy scripts), this
 * still deep-links to the ScriptBuilderPage compatibility surface so legacy
 * authoring is not broken. For native canonical guides (source_type IS NULL,
 * which includes anything created via WorkspaceGuideNewPage or seeded from a
 * canonical template), this page is the real authoring surface and writes
 * directly to `guides` + `guide_versions`.
 */
export default function WorkspaceGuideEditPage() {
  const { workspaceId, guideId } = useParams<{ workspaceId: string; guideId: string }>();
  const { data: guide, isLoading } = useWorkspaceGuide(guideId);
  const { data: latest } = useCurrentGuideVersion(guideId);

  const updateMeta = useUpdateGuideMeta();
  const saveDraft = useSaveGuideDraft();
  const publish = usePublishGuideVersion();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contentText, setContentText] = useState("");
  const [contentError, setContentError] = useState<string | null>(null);

  useEffect(() => {
    if (guide) {
      setName(guide.name);
      setDescription(guide.description ?? "");
    }
  }, [guide]);

  useEffect(() => {
    if (latest) setContentText(JSON.stringify(latest.content, null, 2));
  }, [latest]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading guide…</p>;
  }
  if (!guide) {
    return <p className="text-sm text-muted-foreground">Guide not found.</p>;
  }

  // Compatibility deep link for legacy script-sourced guides.
  if (guide.source_type === "script" && guide.source_id) {
    return <Navigate to={`/admin/scripts/${guide.source_id}/builder`} replace />;
  }

  const onSaveDraft = async () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(contentText || "{}");
      setContentError(null);
    } catch (e) {
      setContentError((e as Error).message);
      return;
    }
    if (
      name.trim() !== guide.name ||
      (description ?? "") !== (guide.description ?? "")
    ) {
      await updateMeta.mutateAsync({
        guideId: guide.id,
        name: name.trim(),
        description: description || null,
      });
    }
    await saveDraft.mutateAsync({ guideId: guide.id, content: parsed });
  };

  const onPublishLatest = async () => {
    if (!latest) return;
    await publish.mutateAsync({ guideId: guide.id, version: latest.version });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/w/${workspaceId}/guides/${guide.id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to guide
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{guide.status}</Badge>
          <Badge variant="outline">v{guide.current_version} live</Badge>
          {latest && <Badge variant="secondary">latest v{latest.version}</Badge>}
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Edit guide</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Native canonical authoring. Save creates a new draft version. Publish promotes the latest version to live.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Content (JSON)</CardTitle>
          <Button variant="link" size="sm" asChild className="h-auto p-0">
            <Link to={`/w/${workspaceId}/guides/${guide.id}/preview`}>
              <ExternalLink className="h-3 w-3 mr-1" /> Preview
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Native canonical guide content is stored in <code>guide_versions.content</code>. The visual node
            editor will land in a Phase 6 follow-up; this raw JSON surface is the canonical write path today.
          </p>
          <Textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            rows={18}
            className="font-mono text-xs"
          />
          {contentError && <p className="text-xs text-destructive">Invalid JSON: {contentError}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={onSaveDraft}
          disabled={saveDraft.isPending || updateMeta.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" /> Save draft
        </Button>
        <Button onClick={onPublishLatest} disabled={!latest || publish.isPending} className="gap-2">
          <Send className="h-4 w-4" /> Publish v{latest?.version ?? "?"}
        </Button>
      </div>
    </div>
  );
}
