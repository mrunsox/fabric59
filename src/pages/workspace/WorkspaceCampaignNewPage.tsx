import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Info, Sparkles, ListChecks } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import CampaignIntakePage from "@/pages/admin/CampaignIntakePage";
import type { CampaignIntakeData } from "@/types/campaign";
import { useWorkspaceSetupReadiness } from "@/hooks/useWorkspaceSetupReadiness";

/**
 * Workspace campaign creation.
 *
 * Mounts the existing intake form (CampaignIntakePage) inside the workspace
 * shell so all the campaign-authoring chrome (autosave, validation, ASC
 * origin context) renders unchanged. Drafts appear in this workspace's
 * Campaigns list as soon as they're saved.
 *
 * AI handoff:
 *   AIBlueprintBuilder navigates here with router state
 *   `{ prefill: Partial<CampaignIntakeData>, source: "ai-blueprint" }` and
 *   `?source=ai` in the URL.
 *
 * ASC handoff:
 *   AscWizardPage navigates here with `{ prefill, source: "asc-wizard",
 *   ascDraftId }`. The translator populates `prefill.ascOrigin`, which the
 *   intake form persists in `intake_data` JSONB. Origin context is
 *   rendered by `AscOriginPanel` inside CampaignIntakePage. We do not
 *   render a duplicate banner here.
 */
export default function WorkspaceCampaignNewPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as {
    prefill?: Partial<CampaignIntakeData>;
    source?: string;
    ascDraftId?: string;
  };
  const isAiPrefill = state.source === "ai-blueprint" && !!state.prefill;
  const isAscPrefill = state.source === "asc-wizard" && !!state.prefill;
  const setup = useWorkspaceSetupReadiness();
  const missingPrereqs = setup.steps.filter(
    (s) =>
      !s.done &&
      (s.key === "knowledge" ||
        s.key === "channel" ||
        s.key === "dispositions" ||
        s.key === "workspace_guide"),
  );

  useEffect(() => {
    if (isAiPrefill) {
      // eslint-disable-next-line no-console
      console.info("[ai-handoff] workspace campaign intake received prefill", {
        workspaceId,
        keys: Object.keys(state.prefill ?? {}),
      });
    }
    if (isAscPrefill) {
      // eslint-disable-next-line no-console
      console.info("[asc-handoff] workspace campaign intake received ASC prefill", {
        workspaceId,
        ascDraftId: state.ascDraftId,
        keys: Object.keys(state.prefill ?? {}),
      });
    }
  }, [isAiPrefill, isAscPrefill, state.prefill, state.ascDraftId, workspaceId]);

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
      ) : !isAscPrefill ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            New campaign. Changes autosave as a draft; submitting publishes it to this workspace's
            Campaigns list. You can continue editing drafts at any time from the Campaigns list.
          </span>
        </div>
      ) : null}

      <CampaignIntakePage />
    </div>
  );
}
