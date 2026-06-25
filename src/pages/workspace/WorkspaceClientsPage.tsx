import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { SeedAssurewayButton } from "@/components/dashboard/SeedAssurewayButton";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceClients } from "@/hooks/useWorkspaceClients";

/**
 * Workspace Clients list.
 *
 * Clients are owned at the organization level and inherited into every
 * workspace under that organization. This list reads them via the parent
 * organization; the Clients detail page surfaces full ownership context.
 */
export default function WorkspaceClientsPage() {
  const { workspace } = useWorkspace();
  const { data: clients = [], isLoading } = useWorkspaceClients();


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
          clients.length === 0 && !isLoading ? (
            <SeedAssurewayButton variant="secondary" hasExistingAssureway={false} />
          ) : undefined
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading clients…</p>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add a client to start building campaigns. You can also load the Assureway client to explore a working setup."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <Link key={c.id} to={`./${c.id}`} className="block group">

              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm truncate group-hover:text-primary">{c.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <StatusBadge status={c.status ?? "active"} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
