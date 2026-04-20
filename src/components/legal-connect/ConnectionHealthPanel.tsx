import { useFive9Health } from "@/hooks/useFive9Overlay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumStatCard } from "@/components/ui/premium-stat-card";
import { Activity, AlertTriangle, CheckCircle2, HeartPulse } from "lucide-react";

interface Props {
  clientId: string;
}

export default function ConnectionHealthPanel({ clientId }: Props) {
  const { data: health } = useFive9Health(clientId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PremiumStatCard
          title="Events 24h"
          value={health?.total_24h ?? 0}
          icon={Activity}
          variant="default"
        />
        <PremiumStatCard
          title="Completed"
          value={health?.completed_24h ?? 0}
          icon={CheckCircle2}
          variant="success"
        />
        <PremiumStatCard
          title="Failed"
          value={health?.failed_24h ?? 0}
          icon={AlertTriangle}
          variant={health?.failed_24h ? "destructive" : "default"}
        />
        <PremiumStatCard
          title="Review queued"
          value={health?.review_queued_24h ?? 0}
          icon={HeartPulse}
          variant={health?.review_queued_24h ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Errors</CardTitle>
          <CardDescription>Connection-level errors across all providers for this client.</CardDescription>
        </CardHeader>
        <CardContent>
          {(health?.recent_errors?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent errors</p>
          ) : (
            <ul className="space-y-2">
              {health!.recent_errors.map((e, i) => (
                <li
                  key={i}
                  className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md p-2.5 break-words"
                >
                  {e}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
