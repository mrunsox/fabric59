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
      // First try direct match on the canonical `campaigns` table.
      const direct = await supabase
        .from("campaigns")
        .select("id, workspace_id")
        .eq("id", id)
        .maybeSingle();
      let row = (direct.data as { id: string; workspace_id?: string | null } | null) ?? null;
      // Fallback: legacy callers pass a campaign_setup id; canonical rows
      // mirror those via source_type='campaign_setup' + source_id=<setup id>.
      if (!row) {
        const mirrored = await supabase
          .from("campaigns")
          .select("id, workspace_id")
          .eq("source_type", "campaign_setup")
          .eq("source_id", id)
          .maybeSingle();
        row = (mirrored.data as { id: string; workspace_id?: string | null } | null) ?? null;
      }
      if (cancelled) return;
      const ws = row?.workspace_id;
      setTarget(ws && row ? `/w/${ws}/campaigns/${row.id}` : "/admin/campaigns");
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
