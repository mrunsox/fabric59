import { useFive9EventLog } from "@/hooks/useFive9Overlay";
import EventLogViewer from "@/components/five9-overlay/EventLogViewer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface Props {
  clientId: string;
  campaignRouteId?: string;
}

export default function CampaignHealthPanel({ clientId, campaignRouteId }: Props) {
  const { data: events, isLoading } = useFive9EventLog({ client_id: clientId });

  // Filter to events tagged with this campaign route if column populated.
  const filtered = (events ?? []).filter((e: any) =>
    campaignRouteId ? e.matched_route_id === campaignRouteId || !e.matched_route_id : true,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Campaign Event Log</CardTitle>
        </div>
        <CardDescription>
          Events scoped to this campaign route. Connection-level health lives under Client → Legal
          Connect → Health.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EventLogViewer events={filtered as any} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}
