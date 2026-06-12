import { CheckCircle2, Circle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CAMPAIGN_FLOW_SENTINEL_NAME } from "@/types/campaign-flow";
import { WORKSPACE_GUIDE_SINGLETON_NAME } from "@/types/workspace-guide";

/**
 * Canonical campaign readiness — 4 checks fed by canonical tables only.
 *  1. Firm (workspace) guide published
 *  2. Decision tree (campaign flow) published
 *  3. Intake form attached
 *  4. Notifications configured (campaign flow contains a notification_trigger step)
 */
export function CampaignReadinessChecklist({
  workspaceId, campaignId,
}: { workspaceId: string; campaignId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["canonical-campaign-readiness", workspaceId, campaignId],
    enabled: !!workspaceId && !!campaignId,
    queryFn: async () => {
      // Firm guide
      const { data: firm } = await supabase.from("guides")
        .select("id, status").eq("workspace_id", workspaceId)
        .eq("name", WORKSPACE_GUIDE_SINGLETON_NAME).is("source_type", null).maybeSingle();
      // Flow + content
      const { data: flow } = await supabase.from("guides")
        .select("id, status").eq("workspace_id", workspaceId)
        .eq("campaign_id", campaignId).eq("name", CAMPAIGN_FLOW_SENTINEL_NAME).maybeSingle();
      let hasNotification = false;
      let flowPublished = false;
      if (flow?.id) {
        flowPublished = flow.status === "published";
        const { data: ver } = await supabase.from("guide_versions")
          .select("content").eq("guide_id", flow.id).eq("is_current", true).maybeSingle();
        const steps = (ver?.content as { steps?: { type?: string }[] } | null)?.steps ?? [];
        hasNotification = steps.some((s) => s.type === "notification_trigger");
      }
      // Intake form
      const { data: assignment } = await supabase.from("form_campaign_assignments")
        .select("id").eq("workspace_id", workspaceId).eq("campaign_id", campaignId)
        .limit(1).maybeSingle();
      return {
        firmGuide: firm?.status === "published",
        flow: flowPublished,
        intake: !!assignment,
        notifications: hasNotification,
      };
    },
  });

  const items = [
    { label: "Firm guide published", done: !!data?.firmGuide },
    { label: "Decision tree published", done: !!data?.flow },
    { label: "Intake form attached", done: !!data?.intake },
    { label: "Notifications configured", done: !!data?.notifications },
  ];
  const completed = items.filter((i) => i.done).length;

  return (
    <Card data-testid="campaign-readiness-checklist">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Campaign readiness · {completed}/{items.length}
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
