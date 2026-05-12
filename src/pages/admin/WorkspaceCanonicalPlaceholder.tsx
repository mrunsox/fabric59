import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WORKSPACE_SECTIONS } from "@/config/navigation";

/**
 * WorkspaceCanonicalPlaceholder
 *
 * Canonical planned surface — not yet implemented. Renders the workspace-level
 * secondary nav from the master spec so reviewers can see the target IA.
 * Wired into routing in Phase 2.
 */
export default function WorkspaceCanonicalPlaceholder() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="outline" className="border-accent/40 text-accent">Canonical planned surface</Badge>
        <h1 className="text-2xl font-bold tracking-tight">Workspace shell — Phase 2</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          This page is a structural placeholder for the workspace-scoped routes defined in the
          Fabric59 Canonical Strip + Rebuild master spec. Real implementation lands in Phase 2
          (workspaces entity + /app/workspaces/:workspaceId/* routing).
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Workspace-level secondary nav (target)</CardTitle></CardHeader>
        <CardContent>
          <ul className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {WORKSPACE_SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.key} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/40">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{s.label}</span>
                  <code className="ml-auto text-[10px] text-muted-foreground">{s.href}</code>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
