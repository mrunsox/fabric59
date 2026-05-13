import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GitFork } from "lucide-react";
import { useWorkspaceTemplate, useForkTemplate } from "@/hooks/useWorkspaceTemplates";

export default function WorkspaceTemplateDetailPage() {
  const { workspaceId, templateId } = useParams<{ workspaceId: string; templateId: string }>();
  const { data: template, isLoading } = useWorkspaceTemplate(templateId);
  const fork = useForkTemplate();

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!template) return <div className="text-sm text-muted-foreground">Template not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        to={`/w/${workspaceId}/templates`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to templates
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{template.name}</h1>
          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="capitalize">{template.kind}</Badge>
            <Badge variant="secondary" className="capitalize">{template.scope_type}</Badge>
            <Badge variant="outline" className="capitalize">{template.status}</Badge>
            {template.source_type && (
              <Badge variant="outline" className="text-muted-foreground">
                legacy source: {template.source_type}
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          disabled={fork.isPending}
          onClick={() => fork.mutate(template)}
        >
          <GitFork className="h-4 w-4" /> Fork to workspace
        </Button>
      </div>

      {template.parent_template_id && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Lineage</CardTitle></CardHeader>
          <CardContent>
            <Link
              to={`/w/${workspaceId}/templates/${template.parent_template_id}`}
              className="text-sm text-primary hover:underline"
            >
              ← Forked from parent template
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Content</CardTitle></CardHeader>
        <CardContent>
          <pre className="rounded-md bg-muted/40 p-4 text-xs font-mono overflow-auto max-h-[480px]">
{JSON.stringify(template.content, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Metadata</CardTitle></CardHeader>
        <CardContent>
          <pre className="rounded-md bg-muted/40 p-4 text-xs font-mono overflow-auto max-h-[240px]">
{JSON.stringify({
  current_version: template.current_version,
  source_type: template.source_type,
  source_id: template.source_id,
  metadata: template.metadata,
  created_at: template.created_at,
  updated_at: template.updated_at,
}, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
