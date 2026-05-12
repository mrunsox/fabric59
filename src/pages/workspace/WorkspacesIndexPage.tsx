import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Building } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WORKSPACE_SECTIONS } from "@/config/navigation";

/**
 * Workspaces index — canonical /app/workspaces.
 * Lists workspaces (currently adapted from Organizations) and links into the canonical shell.
 */
export default function WorkspacesIndexPage() {
  const { workspaces, isLoading } = useWorkspace();

  return (
    <div className="mx-auto max-w-[1440px] px-8 py-10 space-y-6">
      <div>
        <Badge variant="outline" className="border-accent/40 text-accent mb-2">
          Canonical
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Workspaces</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          The canonical operating boundary in Fabric59. Each workspace contains its own clients,
          campaigns, guides, agents, and integrations.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : workspaces.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No workspaces available yet for your account.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((w) => (
            <Link key={w.id} to={`/app/workspaces/${w.id}/home`}>
              <Card className="hover:border-primary/40 transition-colors h-full">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{w.name}</CardTitle>
                    <p className="text-xs text-muted-foreground truncate">{w.id}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {WORKSPACE_SECTIONS.length} canonical sections
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
