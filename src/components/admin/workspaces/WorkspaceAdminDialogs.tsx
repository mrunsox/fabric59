import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useCreateWorkspace, useUpdateWorkspace, useDeleteWorkspace, useMoveTenantsToWorkspace,
} from "@/hooks/useAdminWorkspaces";

interface OrgOption { id: string; name: string }

interface BaseProps { open: boolean; onOpenChange: (v: boolean) => void }

/* ---------- Create ---------- */
export function CreateWorkspaceDialog({
  open, onOpenChange, orgs, defaultOrgId,
}: BaseProps & { orgs: OrgOption[]; defaultOrgId?: string }) {
  const [orgId, setOrgId] = useState<string>(defaultOrgId ?? "");
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const create = useCreateWorkspace();

  const submit = async () => {
    if (!orgId || !name.trim()) return;
    await create.mutateAsync({ organizationId: orgId, name: name.trim(), isDefault });
    setName(""); setIsDefault(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
          <DialogDescription>Create a workspace inside an organization.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Organization</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger><SelectValue placeholder="Pick organization" /></SelectTrigger>
              <SelectContent>
                {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workspace name" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(!!v)} />
            Set as default workspace for this organization
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!orgId || !name.trim() || create.isPending}>
            {create.isPending ? "Creating…" : "Create workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Rename ---------- */
export function RenameWorkspaceDialog({
  open, onOpenChange, workspace,
}: BaseProps & { workspace: { id: string; name: string; organization_id: string } | null }) {
  const [name, setName] = useState(workspace?.name ?? "");
  const update = useUpdateWorkspace();
  // Reset when workspace changes
  useMemo(() => { setName(workspace?.name ?? ""); }, [workspace?.id, workspace?.name]);

  const submit = async () => {
    if (!workspace || !name.trim()) return;
    await update.mutateAsync({
      workspaceId: workspace.id, organizationId: workspace.organization_id, name: name.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename workspace</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim() || update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Delete ---------- */
export function DeleteWorkspaceDialog({
  open, onOpenChange, workspace,
}: BaseProps & { workspace: { id: string; name: string } | null }) {
  const del = useDeleteWorkspace();
  const { data: counts } = useQuery({
    queryKey: ["admin-workspace-delete-counts", workspace?.id],
    enabled: !!workspace?.id && open,
    queryFn: async () => {
      if (!workspace) return { tenants: 0, campaigns: 0, forms: 0, guides: 0 };
      const [t, c, f, g] = await Promise.all([
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
        supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
        supabase.from("forms").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
        supabase.from("guides").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
      ]);
      return { tenants: t.count ?? 0, campaigns: c.count ?? 0, forms: f.count ?? 0, guides: g.count ?? 0 };
    },
  });

  const submit = async () => {
    if (!workspace) return;
    await del.mutateAsync(workspace.id);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete workspace "{workspace?.name}"?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>This cannot be undone. Cascading effects:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>{counts?.campaigns ?? "…"}</strong> campaigns — deleted (cascade)</li>
                <li><strong>{counts?.forms ?? "…"}</strong> forms — deleted (cascade)</li>
                <li><strong>{counts?.guides ?? "…"}</strong> guides — deleted (cascade)</li>
                <li><strong>{counts?.tenants ?? "…"}</strong> clients — orphaned (workspace_id set to null). Move them first if needed.</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={submit} disabled={del.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {del.isPending ? "Deleting…" : "Delete workspace"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---------- Move clients ---------- */
type TenantRow = {
  id: string; name: string;
  workspace_id: string | null;
  organization_id: string | null;
};

export function MoveTenantsDialog({
  open, onOpenChange, destination,
}: BaseProps & {
  destination: { workspaceId: string; workspaceName: string; organizationId: string; organizationName: string } | null;
}) {
  const move = useMoveTenantsToWorkspace();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const { data: tenants = [], isLoading } = useQuery<TenantRow[]>({
    queryKey: ["admin-tenants-all"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, workspace_id, organization_id")
        .order("name");
      if (error) throw error;
      return (data || []) as TenantRow[];
    },
  });

  const { data: workspaceLabels = {} } = useQuery<Record<string, string>>({
    queryKey: ["admin-workspaces-list"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces").select("id, name, organization_id");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const w of (data || []) as { id: string; name: string; organization_id: string }[]) {
        map[w.id] = w.name;
      }
      return map;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants
      .filter((t) => t.workspace_id !== destination?.workspaceId)
      .filter((t) => !q || t.name.toLowerCase().includes(q));
  }, [tenants, search, destination?.workspaceId]);

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const willChangeOrg = useMemo(() => {
    if (!destination) return 0;
    return [...selected].filter((id) => {
      const t = tenants.find((x) => x.id === id);
      return t && t.organization_id && t.organization_id !== destination.organizationId;
    }).length;
  }, [selected, tenants, destination]);

  const submit = async () => {
    if (!destination || selected.size === 0) return;
    await move.mutateAsync({
      tenantIds: [...selected],
      destinationWorkspaceId: destination.workspaceId,
      destinationOrganizationId: destination.organizationId,
    });
    setSelected(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Move clients to "{destination?.workspaceName}"</DialogTitle>
          <DialogDescription>
            Destination org: {destination?.organizationName}. Moving a client across organizations will update its org as well.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="max-h-80 overflow-y-auto border rounded-md divide-y">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No clients to move.</p>
          ) : filtered.map((t) => {
            const currentWs = t.workspace_id ? workspaceLabels[t.workspace_id] ?? "—" : "Unassigned";
            const crossOrg = t.organization_id && t.organization_id !== destination?.organizationId;
            return (
              <label key={t.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/40 cursor-pointer">
                <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    Currently: {currentWs}{crossOrg ? " · cross-org move" : ""}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {willChangeOrg > 0 && (
          <p className="text-xs text-amber-600">
            {willChangeOrg} of the selected clients will change organization.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={selected.size === 0 || move.isPending}>
            {move.isPending ? "Moving…" : `Move ${selected.size || ""} client${selected.size === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
