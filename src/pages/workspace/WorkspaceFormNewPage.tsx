import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useCreateWorkspaceForm, useWorkspaceForms, useDuplicateForm } from "@/hooks/useWorkspaceForms";

/**
 * New-form intake. Replaces the legacy lead-capture copy with a name +
 * "Start from" picker (Blank / Template / Duplicate). On submit, lands the
 * author straight in the schema-driven builder.
 */
export default function WorkspaceFormNewPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const create = useCreateWorkspaceForm();
  const duplicate = useDuplicateForm();
  const { data: existing = [] } = useWorkspaceForms();

  const [name, setName] = useState("");
  const [startFrom, setStartFrom] = useState<"blank" | "template" | "duplicate">("blank");
  const [duplicateId, setDuplicateId] = useState<string>("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    let createdId: string;
    if (startFrom === "duplicate" && duplicateId) {
      const cloned = await duplicate.mutateAsync(duplicateId);
      createdId = cloned.id;
    } else {
      const created = await create.mutateAsync({ name: name.trim() });
      createdId = created.id;
    }
    navigate(`/w/${workspaceId}/forms/${createdId}/edit`);
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
          <p className="text-sm text-muted-foreground">
            Schema-driven decision-tree intake. Add sections, fields, and branching logic in the builder.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Intake — new matter"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Start from</Label>
              <Select value={startFrom} onValueChange={(v) => setStartFrom(v as typeof startFrom)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">Blank form</SelectItem>
                  <SelectItem value="template" disabled>Template (coming soon)</SelectItem>
                  <SelectItem value="duplicate" disabled={existing.length === 0}>
                    Duplicate existing
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {startFrom === "duplicate" && (
              <div className="space-y-1.5">
                <Label>Source form</Label>
                <Select value={duplicateId} onValueChange={setDuplicateId}>
                  <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>
                    {existing.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              type="submit"
              disabled={
                create.isPending || duplicate.isPending || !name.trim() ||
                (startFrom === "duplicate" && !duplicateId)
              }
            >
              {create.isPending || duplicate.isPending ? "Creating…" : "Create & open builder"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
