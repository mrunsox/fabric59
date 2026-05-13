import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput, Plus, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { useWorkspaceForms } from "@/hooks/useWorkspaceForms";

export default function WorkspaceFormsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: forms = [], isLoading } = useWorkspaceForms();
  const base = `/w/${workspaceId}/forms`;

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Forms"
        title="Forms"
        lede="Workspace-scoped intake forms that capture inbound leads and route them into campaigns."
        action={
          <Button asChild size="sm">
            <Link to={`${base}/new`}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New form
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading forms…</p>
      ) : forms.length === 0 ? (
        <EmptyState
          icon={FormInput}
          title="No forms in this workspace yet"
          description="Forms capture inbound leads and route them into campaigns. Create your first one below."
          action={
            <Button asChild size="sm">
              <Link to={`${base}/new`}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New form
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {forms.map((f) => (
            <Link key={f.id} to={`${base}/${f.id}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FormInput className="h-4 w-4 text-muted-foreground" /> {f.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={f.status} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground pt-0">
                  {f.description || "No description"}
                  <span className="mx-2">·</span>
                  Updated {new Date(f.updated_at).toLocaleDateString()}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
