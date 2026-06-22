import { CheckCircle2, Circle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  EMPTY_CAMPAIGN_READINESS,
  countReady,
  fetchCanonicalCampaignReadiness,
} from "@/lib/readiness/canonicalCampaignReadiness";

/**
 * Canonical campaign readiness — 4 checks fed by canonical tables only.
 *  1. Firm (workspace) guide published
 *  2. Decision tree (campaign flow) published
 *  3. Intake form attached
 *  4. Notifications configured (campaign flow contains a notification_trigger step)
 *
 * The query body lives in `@/lib/readiness/canonicalCampaignReadiness` and is
 * shared with `useWorkspaceSetupReadiness` so the workspace-level checklist
 * cannot diverge from this per-campaign view.
 */
export function CampaignReadinessChecklist({
  workspaceId,
  campaignId,
}: {
  workspaceId: string;
  campaignId: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["canonical-campaign-readiness", workspaceId, campaignId],
    enabled: !!workspaceId && !!campaignId,
    queryFn: () => fetchCanonicalCampaignReadiness(workspaceId, campaignId),
  });

  const r = data ?? EMPTY_CAMPAIGN_READINESS;
  const items = [
    { label: "Firm guide published", done: r.firmGuide },
    { label: "Decision tree published", done: r.flow },
    { label: "Intake form attached", done: r.intake },
    { label: "Notifications configured", done: r.notifications },
  ];

  return (
    <Card data-testid="campaign-readiness-checklist">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Campaign readiness · {countReady(r)}/{items.length}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Checking…</p>
        ) : (
          items.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40" />
              )}
              <span className={cn(item.done ? "text-foreground" : "text-muted-foreground")}>
                {item.label}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
