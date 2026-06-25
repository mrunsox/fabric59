import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { ClientFormDialog } from "@/components/workspace/clients/ClientFormDialog";
import { DeleteClientDialog } from "@/components/workspace/clients/DeleteClientDialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceClients } from "@/hooks/useWorkspaceClients";
import type { CrmType } from "@/types/database";

type WorkspaceClient = {
  id: string;
  name: string;
  status?: string | null;
  crm_type?: CrmType | null;
};

export default function WorkspaceClientsPage() {
  const { workspace } = useWorkspace();
  const { data: clients = [], isLoading } = useWorkspaceClients();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkspaceClient | null>(null);
  const [deleting, setDeleting] = useState<WorkspaceClient | null>(null);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(c: WorkspaceClient) {
    setEditing(c);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Clients"
        title="Clients"
        lede={
          workspace
            ? `Clients available to ${workspace.name}. Owned at the organization level.`
            : "Clients available to this workspace."
        }
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1.5" /> New client
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading clients…</p>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add your first client to start building campaigns."
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-1.5" /> New client
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(clients as WorkspaceClient[]).map((c) => (
            <Card key={c.id} className="h-full group">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <Link
                  to={`./${c.id}`}
                  className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"
                >
                  <Users className="h-4 w-4 text-primary" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`./${c.id}`} className="block">
                    <CardTitle className="text-sm truncate hover:text-primary">{c.name}</CardTitle>
                  </Link>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleting(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <StatusBadge status={c.status ?? "active"} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editing} />
      <DeleteClientDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        client={deleting}
      />
    </div>
  );
}
