import { createContext, useContext, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * WorkspaceContext (Phase 2B — real canonical workspace foundation)
 *
 * Sources from the real `workspaces` table introduced in Phase 2B. RLS guarantees
 * the user only sees workspaces they belong to (directly via workspace_members or
 * transitionally via organization_members of the workspace's parent org).
 *
 * Each workspace exposes its parent organization_id, which lets reused legacy
 * pages keep their org-scoped queries until they are individually rebound to
 * workspace-aware data sources in Phase 2B follow-ups and Phase 3.
 *
 * The Phase 2A "workspace = organization at URL level" adapter is removed.
 */
export type CanonicalWorkspace = {
  id: string;
  name: string;
  organization_id: string;
  is_default: boolean;
  slug: string | null;
};

type WorkspaceContextValue = {
  workspace: CanonicalWorkspace | null;
  workspaces: CanonicalWorkspace[];
  isLoading: boolean;
  notFound: boolean;
  /** Workspace's parent organization id — convenience for org-scoped legacy queries. */
  organizationId: string | null;
  refetch: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["canonical-workspaces", user?.id ?? "anon"],
    enabled: !!user && !authLoading,
    queryFn: async (): Promise<CanonicalWorkspace[]> => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name, organization_id, is_default, slug")
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CanonicalWorkspace[];
    },
  });

  const value = useMemo<WorkspaceContextValue>(() => {
    const workspaces = data ?? [];
    const workspace = workspaceId ? workspaces.find((w) => w.id === workspaceId) ?? null : null;
    const loading = authLoading || isLoading;
    return {
      workspaces,
      workspace,
      isLoading: loading,
      notFound: !loading && !!workspaceId && !workspace,
      organizationId: workspace?.organization_id ?? null,
      refetch: () => void refetch(),
    };
  }, [data, workspaceId, authLoading, isLoading, refetch]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}

/**
 * Canonical workspace roles. Wired into `workspace_members.role` (Phase 2B schema).
 * Page-level RBAC enforcement using these constants will arrive incrementally;
 * org-level role checks (useAuth().workspaceRole) remain authoritative for now.
 */
// Phase 13 — Canonical roles per spec, ordered most → least privileged.
// `manager` and `member` retained for back-compat with existing rows.
export const WORKSPACE_ROLES = [
  "owner",
  "admin",
  "supervisor",
  "manager",
  "analyst",
  "agent",
  "member",
  "viewer",
] as const;
export type WorkspaceRoleLiteral = (typeof WORKSPACE_ROLES)[number];

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRoleLiteral, string> = {
  owner: "Owner",
  admin: "Admin",
  supervisor: "Supervisor",
  manager: "Manager",
  analyst: "Analyst / QA",
  agent: "Agent",
  member: "Member",
  viewer: "Viewer",
};
