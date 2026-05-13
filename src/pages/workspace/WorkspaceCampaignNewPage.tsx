import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import CampaignIntakePage from "@/pages/admin/CampaignIntakePage";

/**
 * Phase 6 — Canonical workspace campaign creation.
 *
 * The 10-section intake form (CampaignIntakePage) remains the only safe authoring
 * surface for campaigns; rather than redirecting users into /admin/campaigns/new,
 * we now mount it in-place under the canonical workspace route so route ownership
 * stays canonical and the canonical workspace shell renders around it.
 *
 * Residual compatibility leak (documented):
 * On successful save, CampaignIntakePage internally navigates to
 *   /admin/campaigns/edit/:id   (autosave)
 *   /admin/campaigns/:id        (final submit)
 * Those legacy detail/edit URLs are intentionally preserved during the rebuild
 * window; canonical detail at /w/:workspaceId/campaigns/:campaignId reads the
 * same row via the campaign_setup → campaigns mirror trigger. Re-homing the
 * legacy navigate() targets is deferred to a follow-up slice once a canonical
 * intake-edit URL exists.
 */
export default function WorkspaceCampaignNewPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/w/${workspaceId}/campaigns`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to campaigns
          </Link>
        </Button>
      </div>

      <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Canonical campaign intake. Drafts autosave; once submitted the campaign appears in this
          workspace's canonical campaign list. Edits to in-progress drafts currently continue at the
          legacy edit URL until the canonical edit route ships.
        </span>
      </div>

      <CampaignIntakePage />
    </div>
  );
}
