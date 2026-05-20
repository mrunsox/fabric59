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
import { GuideContentEditor } from "@/components/guides/GuideContentEditor";
import { migrateGuideContentToV1 } from "@/lib/guides/guideContentSchema";
import { EMPTY_GUIDE_CONTENT, type GuideContentV1 } from "@/types/guide-content";

/**
 * Phase 6 — Native canonical guide editor.
 *
 * Legacy script-mirrored guides (source_type='script') deep-link to
 * ScriptBuilder. Native canonical guides use the structured
 * GuideContentV1 block editor against guide_versions.content.
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
  const [content, setContent] = useState<GuideContentV1>(EMPTY_GUIDE_CONTENT);

  useEffect(() => {
    if (guide) {
      setName(guide.name);
      setDescription(guide.description ?? "");
    }
  }, [guide]);

  useEffect(() => {
    setContent(migrateGuideContentToV1(latest?.content));
  }, [latest]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading guide…</p>;
  }
  if (!guide) {
    return <p className="text-sm text-muted-foreground">Guide not found.</p>;
  }

  // Compatibility deep link for legacy script-sourced guides — checked
  // before any V1 migration so legacy content never silently collapses
  // to an empty renderer state.
  if (guide.source_type === "script" && guide.source_id) {
    return <Navigate to={`/admin/scripts/${guide.source_id}/builder`} replace />;
  }

  const onSaveDraft = async () => {
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
    await saveDraft.mutateAsync({
      guideId: guide.id,
      content: content as unknown as Record<string, unknown>,
    });
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
          <CardTitle className="text-base">Content</CardTitle>
          <Button variant="link" size="sm" asChild className="h-auto p-0">
            <Link to={`/w/${workspaceId}/guides/${guide.id}/preview`}>
              <ExternalLink className="h-3 w-3 mr-1" /> Preview
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <GuideContentEditor value={content} onChange={setContent} />
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
