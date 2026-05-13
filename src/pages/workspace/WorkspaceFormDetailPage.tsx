import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useWorkspaceForm } from "@/hooks/useWorkspaceForms";

export default function WorkspaceFormDetailPage() {
  const { workspaceId, formId } = useParams<{ workspaceId: string; formId: string }>();
  const { data: form, isLoading } = useWorkspaceForm(formId);

  return (
    <div className="max-w-3xl space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to={`/w/${workspaceId}/forms`}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to forms
        </Link>
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !form ? (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">Form not found.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">{form.name}</CardTitle>
                {form.description && <p className="text-sm text-muted-foreground mt-1">{form.description}</p>}
              </div>
              <StatusBadge status={form.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <Badge variant="outline" className="border-accent/40 text-accent">
              Canonical placeholder
            </Badge>
            <p>
              The canonical Forms entity, URL, and storage are now in place. The visual builder
              and submission inbox arrive in the next phase. The form schema is currently empty
              and can be populated by the upcoming builder.
            </p>
            <div className="text-xs grid grid-cols-2 gap-2 pt-2">
              <div>Created: {new Date(form.created_at).toLocaleString()}</div>
              <div>Updated: {new Date(form.updated_at).toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
