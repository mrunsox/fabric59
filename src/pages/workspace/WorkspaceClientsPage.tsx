import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceClients } from "@/hooks/useWorkspaceClients";

/**
 * Workspace Clients (Phase 2B) — workspace-aware listing.
 * Currently filters by the workspace's parent org (transitional);
 * swaps to workspace_id when clients gain workspace ownership.
 */
export default function WorkspaceClientsPage() {
  const { workspace } = useWorkspace();
  const { data: clients = [], isLoading } = useWorkspaceClients();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant="outline" className="border-accent/40 text-accent mb-2">
            Workspace clients
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Clients in <span className="font-medium text-foreground">{workspace?.name}</span>.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/clients">Open legacy clients view</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading clients…</p>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No clients in this workspace yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <Link key={c.id} to={`/admin/clients/${c.id}`}>
              <Card className="hover:border-primary/40 transition-colors h-full">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm truncate">{c.name}</CardTitle>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="text-[10px]">
                    {c.status ?? "active"}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
