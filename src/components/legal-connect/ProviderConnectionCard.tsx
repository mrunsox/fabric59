import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  Plug,
  RefreshCw,
  Settings,
  TestTube2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export interface ProviderConnectionCardProps {
  clientId: string;
  provider: "clio" | "mycase" | "smokeball" | "five9";
  connection: {
    id: string;
    status: string;
    last_sync_at?: string | null;
    last_error?: string | null;
    last_event_at?: string | null;
  } | null;
  onTest?: () => void;
  onReconnect?: () => void;
  onDisconnect?: () => void;
  testing?: boolean;
  /** When set, render Connect as disabled with this tooltip explanation. */
  disabledReason?: string | null;
}

const providerMeta: Record<
  "clio" | "mycase" | "smokeball" | "five9",
  { label: string; color: string; desc: string }
> = {
  clio: { label: "Clio", color: "text-primary", desc: "Practice management for law firms" },
  mycase: { label: "MyCase", color: "text-accent-foreground", desc: "Cloud legal case management" },
  smokeball: { label: "Smokeball", color: "text-warning", desc: "Intake-first legal automation" },
  five9: { label: "Five9", color: "text-primary", desc: "Contact center credentials for this client" },
};

function fmt(d?: string | null) {
  if (!d) return "—";
  const ts = new Date(d).getTime();
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function ProviderConnectionCard({
  clientId,
  provider,
  connection,
  onTest,
  onReconnect,
  onDisconnect,
  testing,
}: ProviderConnectionCardProps) {
  const meta = providerMeta[provider];
  const status = connection?.status ?? "not_connected";
  const isConnected = status === "connected";
  const isError = status === "error" || status === "expired" || status === "revoked";

  return (
    <Card className="overflow-hidden border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                "rounded-lg p-2.5",
                isConnected ? "bg-success/10" : isError ? "bg-destructive/10" : "bg-muted",
              )}
            >
              {isConnected ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : isError ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                <Plug className={cn("h-5 w-5", meta.color)} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-foreground">{meta.label}</h3>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    isConnected && "border-success/40 text-success",
                    isError && "border-destructive/40 text-destructive",
                    !isConnected && !isError && "text-muted-foreground",
                  )}
                >
                  {status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
            </div>
          </div>
        </div>

        {connection && (
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Last sync</p>
              <p className="font-medium text-foreground mt-0.5">{fmt(connection.last_sync_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last event</p>
              <p className="font-medium text-foreground mt-0.5">{fmt(connection.last_event_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last error</p>
              <p
                className={cn(
                  "font-medium mt-0.5 truncate",
                  connection.last_error ? "text-destructive" : "text-muted-foreground",
                )}
                title={connection.last_error ?? undefined}
              >
                {connection.last_error ? "see details" : "none"}
              </p>
            </div>
          </div>
        )}

        {!connection && (
          <p className="mt-4 text-xs text-muted-foreground">
            Not connected. Set up {meta.label} to start syncing call outcomes.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {!connection ? (
            <Button asChild size="sm">
              <Link to={`/admin/clients/${clientId}/legal-connect/setup/${provider}`}>
                <Plug className="h-3.5 w-3.5 mr-1.5" />
                Connect {meta.label}
              </Link>
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={onTest} disabled={testing}>
                <TestTube2 className={cn("h-3.5 w-3.5 mr-1.5", testing && "animate-pulse")} />
                Test
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to={`/admin/clients/${clientId}/legal-connect/setup/${provider}`}>
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Manage
                </Link>
              </Button>
              {isError && (
                <Button size="sm" variant="outline" onClick={onReconnect}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Reconnect
                </Button>
              )}
              {onDisconnect && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive ml-auto"
                  onClick={onDisconnect}
                >
                  Disconnect
                </Button>
              )}
            </>
          )}
        </div>

        {connection?.last_error && (
          <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive break-words">{connection.last_error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
