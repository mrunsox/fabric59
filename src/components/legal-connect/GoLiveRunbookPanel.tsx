import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ArrowRightCircle, PauseCircle, LifeBuoy, Mail, Plug2 } from "lucide-react";

const STEPS: {
  icon: any;
  title: string;
  tone: "primary" | "warning" | "destructive";
  steps: string[];
}[] = [
  {
    icon: ArrowRightCircle,
    tone: "primary",
    title: "Approved → Live pilot → Steady",
    steps: [
      "Confirm pilot approval is green and required GA checklist items are done.",
      "On Readiness, set Rollout stage to Live pilot. Health panel should populate within minutes.",
      "After 5–7 calm pilot days with success ≥ 95% and no open critical alerts, move to Live steady.",
    ],
  },
  {
    icon: PauseCircle,
    tone: "warning",
    title: "Pause a tenant",
    steps: [
      "Set Rollout stage to Paused. Producer stops dispatching new jobs immediately.",
      "Existing in-flight jobs finish or fail naturally; no retries are scheduled while paused.",
      "Document the reason in the design-partner notes so the ops view shows why it is paused.",
    ],
  },
  {
    icon: ShieldAlert,
    tone: "warning",
    title: "Downgrade to Safe mode",
    steps: [
      "Toggle Safe mode on the Readiness tab. Outcomes that would write to a CRM are recorded but not dispatched.",
      "Email-only outcomes still send so the firm keeps receiving notifications.",
      "Use during incident windows, suspected mis-mappings, or vendor-side instability.",
    ],
  },
  {
    icon: Mail,
    tone: "primary",
    title: "Email-only fallback",
    steps: [
      "If a CRM provider is degraded, set its policy to email_only on the Policies tab.",
      "Outcomes route to the configured notification email address until the provider is reinstated.",
      "Toggle back to crm_and_email once health green-lights and a manual test passes.",
    ],
  },
  {
    icon: Plug2,
    tone: "destructive",
    title: "Provider outage / auth break",
    steps: [
      "Health panel auth_failure or high_failure_rate alerts → open the connection on the Connections tab.",
      "Reconnect / refresh tokens. If the provider is out, flip that provider to email_only and pause sync jobs.",
      "Once recovered, run the guided test for that provider before re-enabling normal routing.",
    ],
  },
  {
    icon: LifeBuoy,
    tone: "destructive",
    title: "Full rollback",
    steps: [
      "Set Rollout stage to Paused, Safe mode on, and switch all providers to email_only.",
      "Notify the firm contact (design-partner notes) and post a release note (audience: design partners).",
      "Capture root-cause + GA checklist regression items before re-attempting live traffic.",
    ],
  },
];

const TONE_BADGE: Record<string, string> = {
  primary: "bg-primary/15 text-primary border-primary/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  destructive: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function GoLiveRunbookPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-primary" /> Go-live & rollback runbook
        </CardTitle>
        <CardDescription className="text-xs">
          The operational procedure for pushing a tenant live, pausing, downgrading to safe mode,
          falling back to email-only, and handling provider outages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={TONE_BADGE[s.tone]}>
                  <Icon className="h-3 w-3 mr-1" /> {s.title}
                </Badge>
              </div>
              <ol className="mt-2 space-y-1 text-xs text-muted-foreground list-decimal pl-5">
                {s.steps.map((line, i) => <li key={i}>{line}</li>)}
              </ol>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
