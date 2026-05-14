import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * useActiveWorkspaceId — resolves the user's "active" workspace id without
 * requiring a `:workspaceId` URL param. Mirrors the resolution order used by
 * <WorkspaceResolveRedirect> in App.tsx so out-of-shell CTAs (admin
 * dashboard quick actions, legacy admin pages) can link directly into the
 * canonical /w/:workspaceId/* surfaces instead of bouncing through a
 * redirect-only /admin/* write route.
 *
 * Resolution order:
 *   1. localStorage `lastWorkspaceId` (set by the canonical workspace shell)
 *   2. The org's `is_default = true` workspace
 *   3. The first workspace the user can see
 *
 * Returns `null` while loading or when the user has no resolvable workspace.
 * Callers should fall back gracefully (e.g. link to /admin/workspaces).
 */
export function useActiveWorkspaceId(): { workspaceId: string | null; isLoading: boolean } {
  const { user, organization, isLoading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["active-workspace-id", user?.id ?? "anon", organization?.id ?? "none"],
    enabled: !!user && !authLoading,
    queryFn: async (): Promise<{ id: string; is_default: boolean }[]> => {
      const q = supabase
        .from("workspaces")
        .select("id, is_default")
        .order("is_default", { ascending: false });
      const { data, error } = organization?.id
        ? await q.eq("organization_id", organization.id)
        : await q;
      if (error) throw error;
      return (data ?? []) as { id: string; is_default: boolean }[];
    },
  });

  if (authLoading || isLoading) return { workspaceId: null, isLoading: true };

  const last = typeof window !== "undefined" ? localStorage.getItem("lastWorkspaceId") : null;
  const candidate =
    (last && data?.find((w) => w.id === last)?.id) ||
    data?.find((w) => w.is_default)?.id ||
    data?.[0]?.id ||
    null;

  return { workspaceId: candidate, isLoading: false };
}
