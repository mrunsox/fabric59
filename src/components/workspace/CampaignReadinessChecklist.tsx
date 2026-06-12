import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Circle, ArrowRight, BookMarked, Workflow, ClipboardList, Bell,
} from "lucide-react";
import { usePublishedCampaignFlow } from "@/hooks/useCampaignFlow";
import { usePublishedSingletonGuide } from "@/hooks/useWorkspaceCanonicalGuide";
import { useCampaignIntakeForm } from "@/hooks/useFormCampaignAssignments";

/**
 * Canonical campaign readiness checklist. Surfaces the four canonical
 * questions Fabric59 must answer — Who? What? Outcome? Notify? — by showing
 * the configuration state for the four artifacts that back them.
 *
 * Maps to canonical scope v2:
 *   - Greeting / firm guide (singleton "workspace guide" published)
 *   - Decision tree (campaign flow published)
 *   - Intake form (single active form assignment)
 *   - Notifications (workspace notification rules exist; placeholder check)
 *
 * Non-destructive: pure read of canonical hooks; never mutates or hides any
 * legacy admin paths.
 */
export function CampaignReadinessChecklist({
  workspaceId,
  campaignId,
}: {
  workspaceId: string;
  campaignId: string;
}) {
  const { data: guide } = usePublishedSingletonGuide();
  const { data: flow } = usePublishedCampaignFlow(campaignId);
  const { data: intake } = useCampaignIntakeForm(campaignId);

  // Phase 4 placeholder: notification readiness is workspace-scoped. Treat as
  // "open Notifications" until a per-campaign rule check ships.
  const notificationsConfigured = false;

  const items = [
    {
      key: "guide",
      label: "Firm guide published",
      hint: "Greeting, hours, escalation contacts, special handling.",
      done: !!guide && (guide.sections?.length ?? 0) > 0,
      icon: BookMarked,
      to: `/w/${workspaceId}/guide`,
    },
    {
      key: "flow",
      label: "Decision tree published",
      hint: "Question branches, field capture, outcome capture.",
      done: !!flow && (flow.steps?.length ?? 0) > 0,
      icon: Workflow,
      to: `/w/${workspaceId}/campaigns/${campaignId}/builder`,
    },
    {
      key: "intake",
      label: "Intake form attached",
      hint: "Single active form runs during live calls.",
      done: !!intake?.form_id,
      icon: ClipboardList,
      to: `/w/${workspaceId}/forms`,
    },
    {
      key: "notifications",
      label: "Notifications configured",
      hint: "Who to alert per outcome / urgency / after-hours.",
      done: notificationsConfigured,
      icon: Bell,
      to: `/w/${workspaceId}/notifications`,
    },
  ];

  const ready = items.filter((i) => i.done).length;
  const total = items.length;
  const allReady = ready === total;

  return (
    <Card data-testid="campaign-readiness-checklist">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">Readiness</CardTitle>
          <Badge variant={allReady ? "default" : "secondary"} className="text-[10px]">
            {ready}/{total} ready
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Configure these four artifacts so agents can run this campaign end-to-end.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const Status = item.done ? CheckCircle2 : Circle;
          return (
            <Link
              key={item.key}
              to={item.to}
              data-testid={`readiness-item-${item.key}`}
              className="flex items-start gap-3 rounded-md border border-border bg-card hover:bg-muted/50 transition-colors p-3"
            >
              <Status
                className={`h-4 w-4 mt-0.5 shrink-0 ${
                  item.done ? "text-success" : "text-muted-foreground"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium truncate">{item.label}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" />
            </Link>
          );
        })}
        {allReady && (
          <div className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span>This campaign is ready for live calls.</span>
            <Button size="sm" variant="ghost" className="ml-auto h-7 px-2" asChild>
              <Link to={`/app/agent/workspace/${workspaceId}/${campaignId}`}>
                Open agent cockpit
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
