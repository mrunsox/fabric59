import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { Building, Plus, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Phase 3 — Canonical /org/workspaces.
 *
 * Real list of workspaces (from the canonical `workspaces` table via
 * WorkspaceContext) with a real create flow that lands the user at
 * /w/:newWorkspaceId/home.
 *
 * Set-default / archive controls are intentionally omitted: the underlying
 * mutations are not wired to safe org-scoped behavior yet, and we don't
 * ship dead toggles.
 */
export default function OrgWorkspacesPage() {
  const { organization, isMasterAdmin, membership } = useAuth();
  const { workspaces, isLoading, refetch } = useWorkspace();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const canCreate = isMasterAdmin || membership?.role === "owner" || membership?.role === "admin";

  const createMutation = useMutation({
    mutationFn: async (workspaceName: string) => {
      if (!organization) throw new Error("No organization");
      const { data, error } = await supabase
        .from("workspaces")
        .insert({
          organization_id: organization.id,
          name: workspaceName,
          is_default: workspaces.length === 0,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (newId) => {
      toast.success("Workspace created");
      setOpen(false);
      setName("");
      qc.invalidateQueries({ queryKey: ["canonical-workspaces"] });
      refetch();
      navigate(`/w/${newId}/home`);
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to create workspace"),
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6 animate-fade-in">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Each workspace is its own working surface — clients, campaigns, guides, and forms.
          </p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                New workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create workspace</DialogTitle>
                <DialogDescription>
                  Workspaces are scoped to {organization?.name ?? "your organization"}.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!name.trim()) return;
                  createMutation.mutate(name.trim());
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="ws-name">Workspace name</Label>
                  <Input
                    id="ws-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Operations"
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {isLoading ? (
        <Card><CardContent className="py-8 text-sm text-muted-foreground">Loading workspaces…</CardContent></Card>
      ) : workspaces.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No workspaces yet"
          description={canCreate ? "Create your first workspace to start working." : "Ask your org admin to create a workspace."}
          action={canCreate ? <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New workspace</Button> : undefined}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((w) => (
            <Card key={w.id} className="hover:border-primary/40 transition-colors">
              <CardHeader className="flex-row items-center gap-3 space-y-0 pb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{w.name}</CardTitle>
                  {w.is_default && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">Default</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to={`/w/${w.id}/home`}>
                    Open workspace
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
