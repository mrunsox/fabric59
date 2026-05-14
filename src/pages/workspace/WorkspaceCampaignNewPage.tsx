import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Info, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import CampaignIntakePage from "@/pages/admin/CampaignIntakePage";
import type { CampaignIntakeData } from "@/types/campaign";

/**
 * Phase 6 — Canonical workspace campaign creation.
 *
 * The 10-section intake form (CampaignIntakePage) is the only safe authoring
 * surface for campaigns; it is mounted in-place under the canonical workspace
 * route so the workspace shell renders around it.
 *
 * AI handoff:
 *   AIBlueprintBuilder navigates here with router state
 *   `{ prefill: Partial<CampaignIntakeData>, source: "ai-blueprint" }` and
 *   `?source=ai` in the URL. CampaignIntakePage already reads
 *   `location.state.prefill` to seed its form, so the prefill survives the
 *   navigation without any extra wiring on this page. We render a small
 *   AI-source banner so the user understands the form is pre-populated.
 *
 * Residual compatibility leak (documented):
 *   On successful save, CampaignIntakePage internally navigates to legacy
 *   /admin/campaigns/edit/:id (autosave) and /admin/campaigns/:id (final).
 *   Re-homing those targets is deferred to a follow-up slice.
 */
export default function WorkspaceCampaignNewPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as {
    prefill?: Partial<CampaignIntakeData>;
    source?: string;
  };
  const isAiPrefill = state.source === "ai-blueprint" && !!state.prefill;

  useEffect(() => {
    if (isAiPrefill) {
      // Lightweight observability for the new AI→workspace handoff while we
      // wire up richer analytics. Keeps the prefill discoverable in dev tools.
      // eslint-disable-next-line no-console
      console.info("[ai-handoff] workspace campaign intake received prefill", {
        workspaceId,
        keys: Object.keys(state.prefill ?? {}),
      });
    }
  }, [isAiPrefill, state.prefill, workspaceId]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/w/${workspaceId}/campaigns`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to campaigns
          </Link>
        </Button>
      </div>

      {isAiPrefill ? (
        <div
          data-testid="ai-prefill-banner"
          className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground flex items-start gap-2"
        >
          <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
          <span>
            AI-seeded intake. Fields below were pre-populated from your uploaded
            documents — review every section before saving.
          </span>
        </div>
      ) : (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Canonical campaign intake. Drafts autosave; once submitted the campaign appears in this
            workspace's canonical campaign list. Edits to in-progress drafts currently continue at the
            legacy edit URL until the canonical edit route ships.
          </span>
        </div>
      )}

      <CampaignIntakePage />
    </div>
  );
}
