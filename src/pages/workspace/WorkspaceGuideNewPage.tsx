import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FilePlus, LayoutTemplate } from "lucide-react";
import { useCreateNativeGuide, useCreateGuideFromTemplate } from "@/hooks/useGuideVersions";
import { useWorkspaceTemplates, type WorkspaceTemplate } from "@/hooks/useWorkspaceTemplates";

export default function WorkspaceGuideNewPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [picked, setPicked] = useState<WorkspaceTemplate | null>(null);

  const { data: templates = [], isLoading } = useWorkspaceTemplates({ kind: "guide" });
  const createNative = useCreateNativeGuide();
  const createFromTemplate = useCreateGuideFromTemplate();

  const onCreate = async () => {
    if (!name.trim()) return;
    const guide = picked
      ? await createFromTemplate.mutateAsync({ template: picked, name })
      : await createNative.mutateAsync({ name, description: description || undefined });
    navigate(`/w/${workspaceId}/guides/${guide.id}/edit`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/w/${workspaceId}/guides`}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to guides
        </Link>
      </Button>

      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <FilePlus className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">New guide</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Native canonical guide. Start blank or seed from a guide-kind template.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guide name" />
          </div>
          {!picked && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" /> Seed from template
          </CardTitle>
          {picked && (
            <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>Clear selection</Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading guide templates…</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No guide templates available. Create one in <Link to={`/w/${workspaceId}/templates`} className="text-primary hover:underline">Templates</Link>, or start blank.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPicked(t)}
                  className={`text-left rounded-md border p-3 transition-colors ${
                    picked?.id === t.id ? "border-primary bg-primary/5" : "hover:border-primary/40"
                  }`}
                >
                  <div className="text-sm font-medium truncate">{t.name}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="secondary" className="capitalize text-[10px]">{t.scope_type}</Badge>
                    {t.parent_template_id && (
                      <Badge variant="outline" className="text-[10px]">forked</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link to={`/w/${workspaceId}/guides`}>Cancel</Link>
        </Button>
        <Button
          onClick={onCreate}
          disabled={!name.trim() || createNative.isPending || createFromTemplate.isPending}
        >
          {picked ? "Create from template" : "Create blank guide"}
        </Button>
      </div>
    </div>
  );
}
