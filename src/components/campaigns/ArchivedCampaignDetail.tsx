import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, CloudOff, RotateCcw } from "lucide-react";
import type { CampaignArchive } from "@/hooks/useCampaignArchive";
import { format } from "date-fns";

interface ArchivedCampaignDetailProps {
  archive: CampaignArchive;
}

export function ArchivedCampaignDetail({ archive }: ArchivedCampaignDetailProps) {
  const five9Config = (archive.config_snapshot?.five9Config || {}) as Record<string, unknown>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">{archive.campaign_name}</h2>
          <p className="text-sm text-muted-foreground">
            {archive.client_name} · Archived {format(new Date(archive.archived_at), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{archive.status}</Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled className="gap-1.5 opacity-50">
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </Button>
            </TooltipTrigger>
            <TooltipContent>Coming Soon</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Archived Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">DNIS:</span> {(five9Config.dnisList as string[] || []).join(", ") || "None"}</p>
            <p><span className="text-muted-foreground">Skills:</span> {(five9Config.skills as string[] || []).join(", ") || "None"}</p>
            <p><span className="text-muted-foreground">Dispositions:</span> {(five9Config.dispositions as string[] || []).join(", ") || "None"}</p>
            <p><span className="text-muted-foreground">Profile:</span> {(five9Config.profileName as string) || "N/A"}</p>
            <p><span className="text-muted-foreground">State:</span> {(five9Config.state as string) || "N/A"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Deprovisioning Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(archive.deprovisioning_log || []).map((step) => (
              <div key={step.id} className="flex items-center gap-2 text-sm">
                {step.status === "done" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <CloudOff className="h-3.5 w-3.5 text-destructive shrink-0" />
                )}
                <span className={step.status === "error" ? "text-destructive" : ""}>{step.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
