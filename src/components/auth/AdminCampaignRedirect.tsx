import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Dashboard consolidation — demotes legacy /admin/campaigns/:id.
 *
 * Resolves the campaign's workspace_id from the canonical `campaigns` table
 * and redirects to /w/:workspaceId/campaigns/:id (the Phase 5+ canonical
 * campaign hub). If the lookup fails or the row is missing we fall back to
 * /admin/campaigns rather than serving a 404, so older bookmarks never break.
 */
export function AdminCampaignRedirect() {
  const { id } = useParams<{ id: string }>();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setTarget("/admin/campaigns");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("id, workspace_id")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      const ws = (data as { workspace_id?: string | null } | null)?.workspace_id;
      setTarget(ws ? `/w/${ws}/campaigns/${id}` : "/admin/campaigns");
    })().catch(() => {
      if (!cancelled) setTarget("/admin/campaigns");
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (target) return <Navigate to={target} replace />;
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground gap-2">
      <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
    </div>
  );
}

export default AdminCampaignRedirect;
