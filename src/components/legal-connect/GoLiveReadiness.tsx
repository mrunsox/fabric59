import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Rocket, ShieldCheck } from "lucide-react";
import {
  useLegalConnections,
  useLegalCampaigns,
  useLegalPolicyProfiles,
} from "@/hooks/useLegalConnect";

interface GoLiveReadinessProps {
  clientId?: string;
}

interface Check {
  key: string;
  label: string;
  description: string;
  status: "pass" | "warn" | "fail";
}

export default function GoLiveReadiness({ clientId }: GoLiveReadinessProps) {
  const { data: connections } = useLegalConnections(clientId);
  const { data: campaigns } = useLegalCampaigns(clientId);
  const { data: policies } = useLegalPolicyProfiles(clientId);

  const checks: Check[] = useMemo(() => {
    const conn = connections ?? [];
    const camps = campaigns ?? [];
    const pols = policies ?? [];
    const connected = conn.filter((c: any) => c.status === "connected").length;
    const activeCamps = camps.filter((c: any) => c.active).length;

    return [
      {
        key: "client",
        label: "Client selected",
        description: "A specific client (tenant) is selected for review",
        status: clientId ? "pass" : "fail",
      },
      {
        key: "connection",
        label: "Provider connected",
        description: "At least one CRM provider connection is established",
        status: connected > 0 ? "pass" : conn.length > 0 ? "warn" : "fail",
      },
      {
        key: "campaign",
        label: "Active campaign mapped",
        description: "At least one Five9 campaign mapped to a Legal Connect flow",
        status: activeCamps > 0 ? "pass" : camps.length > 0 ? "warn" : "fail",
      },
      {
        key: "policy",
        label: "Policy profile assigned",
        description: "Field-level pass-through policy profile defined",
        status: pols.length > 0 ? "pass" : "fail",
      },
      {
        key: "review",
        label: "Test plan executed",
        description: "Run at least one Testing tab scenario before launch",
        status: "warn",
      },
    ];
  }, [clientId, connections, campaigns, policies]);

  const passed = checks.filter((c) => c.status === "pass").length;
  const total = checks.length;
  const score = Math.round((passed / total) * 100);
  const variant = score >= 80 ? "success" : score >= 50 ? "warning" : "destructive";

  const iconFor = (s: Check["status"]) => {
    if (s === "pass") return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (s === "warn") return <AlertTriangle className="h-4 w-4 text-warning" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  return (
    <div className="space-y-4">
      <Card className={`border-${variant}/30`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              Go-Live Readiness
            </CardTitle>
            <Badge
              variant="outline"
              className={
                variant === "success"
                  ? "bg-success/15 text-success border-success/30"
                  : variant === "warning"
                  ? "bg-warning/15 text-warning border-warning/30"
                  : "bg-destructive/15 text-destructive border-destructive/30"
              }
            >
              {score}% ready
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {passed} of {total} checks passed. Resolve warnings before launch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={score} className="h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Readiness checks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checks.map((c) => (
            <div
              key={c.key}
              className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/40"
            >
              {iconFor(c.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize">
                {c.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
