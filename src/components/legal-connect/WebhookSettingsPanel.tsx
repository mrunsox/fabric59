import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, Webhook, AlertTriangle, ShieldCheck } from "lucide-react";

interface Props {
  clientId: string;
}

export default function WebhookSettingsPanel({ clientId }: Props) {
  const { data: subs, isLoading } = useQuery({
    queryKey: ["webhook-subscriptions", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_connect_webhook_subscriptions")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Webhook Subscriptions</CardTitle>
        </div>
        <CardDescription>
          Per-provider webhook setup lives at the client level — campaigns consume events but never
          own credentials.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <Skeleton className="h-20 w-full" />}
        {!isLoading && (subs?.length ?? 0) === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No webhook subscriptions</AlertTitle>
            <AlertDescription className="text-xs">
              Connect a provider first, then register a webhook subscription to receive
              provider-side events (matter updates, contact changes, etc.).
            </AlertDescription>
          </Alert>
        )}
        {(subs ?? []).map((s: any) => (
          <div
            key={s.id}
            className="rounded-lg border border-border p-3 flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm capitalize">{s.provider}</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    s.health_status === "healthy"
                      ? "border-success/40 text-success"
                      : s.health_status === "degraded"
                        ? "border-warning/40 text-warning"
                        : "border-destructive/40 text-destructive"
                  }`}
                >
                  {s.health_status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Expires {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "—"} • Failures{" "}
                {s.failure_count ?? 0}
              </p>
            </div>
            <Button size="sm" variant="outline">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Renew
            </Button>
          </div>
        ))}
        <Alert className="border-primary/30 bg-primary/5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs">
            Webhook secrets are stored encrypted server-side and never appear in any campaign UI.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
