import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle, MinusCircle, Loader2 } from "lucide-react";
import type { ConnectorDef } from "@/data/connector-actions";

type Outcome = "verified" | "skipped" | "failed";
interface Result {
  outcome: Outcome;
  latency_ms: number;
  detail: string;
  ranAt: string;
}

const CHECK_LABEL: Record<ConnectorDef["capabilities"]["healthCheckType"], string> = {
  ping: "Ping endpoint",
  test_action: "Test action call",
  none: "No health check available",
};

export function HealthCheckPanel({
  connector,
  actionKey,
}: {
  connector: ConnectorDef | undefined;
  actionKey?: string;
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  if (!connector) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
        Choose a connector to enable health checks.
      </div>
    );
  }

  const checkType = connector.capabilities.healthCheckType;
  const disabled = checkType === "none" || running;

  const run = async () => {
    setRunning(true);
    setResult(null);
    const started = performance.now();
    // Simulated check: in production this hits the connector gateway's
    // verify_credentials (ping) or invokes a no-op connector action (test_action).
    await new Promise((r) => setTimeout(r, 350 + Math.random() * 600));
    const latency_ms = Math.round(performance.now() - started);

    let outcome: Outcome;
    let detail: string;
    if (checkType === "none") {
      outcome = "skipped";
      detail = "Connector does not expose a health check.";
    } else if (checkType === "test_action") {
      if (!actionKey) {
        outcome = "skipped";
        detail = "Pick an action to run a test_action check.";
      } else {
        outcome = "verified";
        detail = `Dry-run of ${actionKey} succeeded.`;
      }
    } else {
      outcome = "verified";
      detail = `${connector.name} responded to ping.`;
    }

    setResult({ outcome, latency_ms, detail, ranAt: new Date().toISOString() });
    setRunning(false);
  };

  const Icon =
    result?.outcome === "verified"
      ? CheckCircle2
      : result?.outcome === "failed"
      ? XCircle
      : MinusCircle;
  const tone =
    result?.outcome === "verified"
      ? "text-emerald-600"
      : result?.outcome === "failed"
      ? "text-destructive"
      : "text-muted-foreground";

  return (
    <div className="rounded-md border border-border/60 p-4 space-y-3 bg-secondary/10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Connector health check</p>
          <Badge variant="outline" className="text-[10px]">{CHECK_LABEL[checkType]}</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={disabled}>
          {running ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
          {running ? "Running" : "Run check"}
        </Button>
      </div>
      {result ? (
        <div className="flex items-start gap-2 text-xs">
          <Icon className={`h-4 w-4 mt-0.5 ${tone}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-medium capitalize ${tone}`}>{result.outcome}</span>
              <span className="text-muted-foreground">· {result.latency_ms}ms</span>
            </div>
            <p className="text-muted-foreground mt-0.5">{result.detail}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Run a {checkType === "none" ? "check (unavailable)" : CHECK_LABEL[checkType].toLowerCase()} before saving or deploying to confirm credentials and reachability.
        </p>
      )}
    </div>
  );
}
