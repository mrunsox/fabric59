import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useCreateWorkspaceForm } from "@/hooks/useWorkspaceForms";

export default function WorkspaceFormNewPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const create = useCreateWorkspaceForm();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const created = await create.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
    navigate(`/w/${workspaceId}/forms/${created.id}`);
  };

  return (
    <div className="max-w-xl space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to={`/w/${workspaceId}/forms`}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to forms
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">New form</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Lead capture form" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <Button type="submit" disabled={create.isPending || !name.trim()}>
              {create.isPending ? "Creating…" : "Create form"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
