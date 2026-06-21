import { Users } from "lucide-react";
import { OWNERSHIP_LABEL, useWorkspaceScope } from "@/contexts/WorkspaceScopeContext";

/**
 * WorkspaceScopeStrip — minimal client + ownership chips.
 *
 * Dashboard Consolidation — Phase 1.
 *
 * Renders nothing unless a page in the current route has explicitly set
 * scope via `useSetWorkspaceScope`. The workspace name itself is rendered
 * by `WorkspaceContextBar` and is always visible globally.
 */
export function WorkspaceScopeStrip() {
  const { client, ownership } = useWorkspaceScope();
  if (!client && !ownership) return null;
  return (
    <div
      data-testid="workspace-scope-strip"
      className="flex items-center gap-2 min-w-0 shrink-0"
    >
      {client && (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs text-foreground/80">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span className="truncate max-w-[180px]">{client}</span>
        </span>
      )}
      {ownership && (
        <span className="inline-flex items-center rounded-md border border-primary/25 bg-primary/5 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-primary">
          {OWNERSHIP_LABEL[ownership]}
        </span>
      )}
    </div>
  );
}

export default WorkspaceScopeStrip;
