import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * WorkspaceScopeContext — minimal client / ownership signaling.
 *
 * Dashboard Consolidation — Phase 1.
 *
 * Pages with authoritative scope context (currently: Clients detail) call
 * `useSetWorkspaceScope({ client, ownership })` from an effect. The scope
 * strip in `WorkspaceContextBar` reads the value and renders chips. Pages
 * without authoritative context don't set anything and no chips appear.
 *
 * No backend, no inference — this is purely a UI signaling channel.
 */

export type WorkspaceOwnership =
  | "inherited-from-org"
  | "workspace-local"
  | "client-level";

export type WorkspaceScope = {
  /** Optional human-readable client name to display as a chip. */
  client?: string;
  /** Optional ownership badge label. */
  ownership?: WorkspaceOwnership;
};

type Ctx = {
  scope: WorkspaceScope;
  setScope: (next: WorkspaceScope) => void;
  clearScope: () => void;
};

const WorkspaceScopeCtx = createContext<Ctx | null>(null);

export function WorkspaceScopeProvider({ children }: { children: React.ReactNode }) {
  const [scope, setScopeState] = useState<WorkspaceScope>({});
  const setScope = useCallback((next: WorkspaceScope) => setScopeState(next), []);
  const clearScope = useCallback(() => setScopeState({}), []);
  const value = useMemo(() => ({ scope, setScope, clearScope }), [scope, setScope, clearScope]);
  return <WorkspaceScopeCtx.Provider value={value}>{children}</WorkspaceScopeCtx.Provider>;
}

export function useWorkspaceScope(): WorkspaceScope {
  return useContext(WorkspaceScopeCtx)?.scope ?? {};
}

/**
 * Effect helper for pages that have authoritative scope. Sets on mount /
 * dependency change, clears on unmount so chips don't bleed across routes.
 */
export function useSetWorkspaceScope(scope: WorkspaceScope) {
  const ctx = useContext(WorkspaceScopeCtx);
  const client = scope.client;
  const ownership = scope.ownership;
  useEffect(() => {
    if (!ctx) return;
    ctx.setScope({ client, ownership });
    return () => ctx.clearScope();
  }, [ctx, client, ownership]);
}

export const OWNERSHIP_LABEL: Record<WorkspaceOwnership, string> = {
  "inherited-from-org": "Inherited from org",
  "workspace-local": "Workspace-local",
  "client-level": "Client-level",
};
