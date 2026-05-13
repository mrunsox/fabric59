import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { SURFACED_WORKSPACE_SECTIONS } from "@/config/navigation";

/**
 * Workspace Home — canonical /app/workspaces/:workspaceId.
 * Lightweight landing surface. Real metrics arrive in Phase 2B / Phase 3.
 */
export default function WorkspaceHomePage() {
  const { workspace } = useWorkspace();
  if (!workspace) return null;
  const base = `/app/workspaces/${workspace.id}`;

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline" className="border-accent/40 text-accent mb-2">Canonical</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">{workspace.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Workspace home. Jump into any canonical section below.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SURFACED_WORKSPACE_SECTIONS.filter((s) => s.key !== "home").map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.key} to={`${base}/${s.href}`}>
              <Card className="hover:border-primary/40 transition-colors h-full">
                <CardHeader className="flex-row items-center gap-3 space-y-0 pb-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm">{s.label}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <code className="text-[10px] text-muted-foreground">{base}/{s.href}</code>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
