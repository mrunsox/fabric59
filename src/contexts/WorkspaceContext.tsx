import { createContext, useContext, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Organization } from "@/types/database";

/**
 * WorkspaceContext (Phase 2A — canonical adapter)
 *
 * The canonical Fabric59 spec defines Platform > Organization > Workspace > Client > Campaign.
 * No `workspaces` table exists yet. Until Phase 2B introduces one, a Workspace is modelled as
 * an Organization the current user is a member of. The :workspaceId URL segment is matched
 * against AuthContext.organizations[].id.
 *
 * This adapter is intentionally thin so swapping in a real workspaces entity later requires
 * only changing the resolution function below.
 */
export type CanonicalWorkspace = {
  id: string;
  name: string;
  /** Source organization (current adapter mapping). */
  organization: Organization;
};

type WorkspaceContextValue = {
  workspace: CanonicalWorkspace | null;
  workspaces: CanonicalWorkspace[];
  isLoading: boolean;
  notFound: boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

function orgToWorkspace(o: Organization): CanonicalWorkspace {
  return { id: o.id, name: o.name, organization: o };
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { organizations, isLoading: loading } = useAuth();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const value = useMemo<WorkspaceContextValue>(() => {
    const workspaces = organizations.map(orgToWorkspace);
    const workspace = workspaceId ? workspaces.find((w) => w.id === workspaceId) ?? null : null;
    return {
      workspaces,
      workspace,
      isLoading: loading,
      notFound: !loading && !!workspaceId && !workspace,
    };
  }, [organizations, workspaceId, loading]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}
