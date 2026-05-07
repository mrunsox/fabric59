import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Rocket,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Mail,
  Search,
  PenLine,
  ListChecks,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { openGuideDrawer } from "./GuideDrawer";
import { cn } from "@/lib/utils";
import {
  CHECKLIST_ITEMS,
  READINESS_LABEL,
  SAFE_MODE_LABEL,
  useClientReadiness,
  useUpdateClientReadiness,
  type ChecklistState,
  type ReadinessState,
  type SafeMode,
} from "@/hooks/useClientReadiness";
import { useLegalConnections } from "@/hooks/useLegalConnect";
import { toast } from "sonner";

interface Props {
  clientId: string;
}

const STATE_ORDER: ReadinessState[] = [
  "draft",
  "setup_in_progress",
  "test_passed",
  "ready_for_live",
  "live",
];

const STATE_BADGE: Record<ReadinessState, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  setup_in_progress: "bg-warning/15 text-warning border-warning/30",
  test_passed: "bg-primary/15 text-primary border-primary/30",
  ready_for_live: "bg-primary/15 text-primary border-primary/30",
  live: "bg-success/15 text-success border-success/30",
  paused: "bg-destructive/15 text-destructive border-destructive/30",
};

// Plain-English capability map per provider.
const PROVIDER_CAPS: Record<
  string,
  { label: string; lookup: boolean; intake: boolean; note: boolean; task: boolean; contact: boolean; email_fallback: boolean }
> = {
  clio: { label: "Clio Manage", lookup: true, intake: true, note: true, task: true, contact: true, email_fallback: true },
  clio_grow: { label: "Clio Grow", lookup: false, intake: true, note: false, task: false, contact: false, email_fallback: true },
  mycase: { label: "MyCase", lookup: true, intake: true, note: true, task: true, contact: true, email_fallback: true },
  smokeball: { label: "Smokeball", lookup: false, intake: false, note: false, task: false, contact: false, email_fallback: true },
};

function CapabilityRow({ on, label, icon: Icon }: { on: boolean; label: string; icon: any }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className={cn("h-3.5 w-3.5", on ? "text-success" : "text-muted-foreground/50")} />
      <span className={cn(on ? "text-foreground" : "text-muted-foreground line-through")}>{label}</span>
    </div>
  );
}

export default function ClientReadinessPanel({ clientId }: Props) {
  const { data: readiness } = useClientReadiness(clientId);
  const { data: connections } = useLegalConnections(clientId);
  const update = useUpdateClientReadiness(clientId);
  const [pending, setPending] = useState(false);

  const checklist = readiness?.checklist ?? {};
  const state = readiness?.state ?? "draft";
  const safeMode = readiness?.safe_mode ?? "none";

  const totalChecks = CHECKLIST_ITEMS.length;
  const passedChecks = CHECKLIST_ITEMS.filter((i) => checklist[i.key]?.confirmed).length;
  const score = Math.round((passedChecks / totalChecks) * 100);

  const connectedProviders = useMemo(
    () =>
      (connections ?? [])
        .filter((c: any) => c.status === "connected")
        .map((c: any) => c.provider as string),
    [connections],
  );

  const canGoLive = passedChecks === totalChecks && connectedProviders.length > 0;

  const setItem = async (key: keyof ChecklistState, confirmed: boolean) => {
    const next: ChecklistState = {
      ...checklist,
      [key]: { confirmed, at: new Date().toISOString() },
    };
    setPending(true);
    try {
      await update.mutateAsync({ checklist: next });
    } finally {
      setPending(false);
    }
  };

  const setState = async (next: ReadinessState) => {
    if (next === "live" && !canGoLive) {
      toast.error("Complete all checks and connect a provider before going live");
      return;
    }
    await update.mutateAsync({ state: next });
    toast.success(`Status set to ${READINESS_LABEL[next]}`);
  };

  const setSafe = async (next: SafeMode) => {
    await update.mutateAsync({ safe_mode: next });
    toast.success(`Safe mode set to ${SAFE_MODE_LABEL[next]}`);
  };

  return (
    <div className="space-y-4">
      {/* Hero status card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary" />
                Client readiness
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {passedChecks} of {totalChecks} go-live checks confirmed.{" "}
                {connectedProviders.length === 0
                  ? "No providers connected yet."
                  : `${connectedProviders.length} provider(s) connected.`}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("capitalize", STATE_BADGE[state])}>
                {READINESS_LABEL[state]}
              </Badge>
              {safeMode !== "none" && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {SAFE_MODE_LABEL[safeMode]}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={score} className="h-2" />

          {/* State stepper */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {STATE_ORDER.map((s, i) => {
              const idx = STATE_ORDER.indexOf(state === "paused" ? "draft" : state);
              const reached = i <= idx;
              return (
                <div key={s} className="flex items-center gap-2 shrink-0">
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full grid place-items-center text-[10px] font-semibold border",
                      reached
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border",
                    )}
                  >
                    {i + 1}
                  </div>
                  <span className={cn("text-xs", reached ? "text-foreground" : "text-muted-foreground")}>
                    {READINESS_LABEL[s]}
                  </span>
                  {i < STATE_ORDER.length - 1 && <div className="h-px w-6 bg-border" />}
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground mr-1">Set status:</span>
            {(["setup_in_progress", "test_passed", "ready_for_live", "live"] as ReadinessState[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={state === s ? "default" : "outline"}
                onClick={() => setState(s)}
                disabled={update.isPending || (s === "live" && !canGoLive)}
                title={s === "live" && !canGoLive ? "Complete all checks first" : undefined}
              >
                {s === "live" && <PlayCircle className="h-3.5 w-3.5 mr-1.5" />}
                {READINESS_LABEL[s]}
              </Button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              {state === "paused" ? (
                <Button size="sm" variant="outline" onClick={() => setState("setup_in_progress")}>
                  <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                  Resume
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/40 hover:bg-destructive/5"
                  onClick={() => setState("paused")}
                >
                  <PauseCircle className="h-3.5 w-3.5 mr-1.5" />
                  Pause client
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safe-mode / fallback */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Safe mode &amp; fallback
          </CardTitle>
          <CardDescription className="text-xs">
            Downgrade outcomes safely if a provider breaks or the client is not yet ready for full write-back.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={safeMode} onValueChange={(v) => setSafe(v as SafeMode)}>
              <SelectTrigger className="w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Full mode (lookup + write-back + email)</SelectItem>
                <SelectItem value="email_only">Email-only (skip CRM write-back)</SelectItem>
                <SelectItem value="no_writeback">No write-back (lookup + email only)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {safeMode === "none" && "All outcomes route to the connected legal software."}
              {safeMode === "email_only" && "CRM jobs are skipped. Outcomes deliver as email summaries only."}
              {safeMode === "no_writeback" && "Read/lookup still happens. Write-back jobs are skipped."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Capability summary per connected provider */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> What each connected system can do
          </CardTitle>
          <CardDescription className="text-xs">
            Plain-English capabilities for connected legal software. Unsupported actions automatically fall back to
            email-only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connectedProviders.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No providers connected yet. Connect Clio, Clio Grow, MyCase, or Smokeball to see what they can do for
              this client.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {connectedProviders.map((p) => {
                const caps = PROVIDER_CAPS[p];
                if (!caps) return null;
                return (
                  <div key={p} className="rounded-lg border border-border bg-card/40 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{caps.label}</p>
                      <Badge variant="outline" className="text-[10px]">
                        Connected
                      </Badge>
                    </div>
                    <CapabilityRow on={caps.lookup} icon={Search} label="Find caller in legal software" />
                    <CapabilityRow on={caps.intake} icon={PenLine} label="Create new intake / lead" />
                    <CapabilityRow on={caps.note} icon={ListChecks} label="Add note to existing client or matter" />
                    <CapabilityRow on={caps.task} icon={CheckCircle2} label="Create follow-up task" />
                    <CapabilityRow on={caps.contact} icon={PenLine} label="Update contact details" />
                    <CapabilityRow on={caps.email_fallback} icon={Mail} label="Send email summary as fallback" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Go-live checklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ListChecks className="h-3.5 w-3.5 text-primary" /> Go-live checklist
          </CardTitle>
          <CardDescription className="text-xs">
            Confirm each item before promoting this client to live traffic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const c = checklist[item.key];
            const done = !!c?.confirmed;
            return (
              <label
                key={item.key}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  done ? "border-success/30 bg-success/5" : "border-border bg-card/40 hover:bg-muted/30",
                )}
              >
                <Checkbox
                  checked={done}
                  disabled={pending}
                  onCheckedChange={(v) => setItem(item.key, !!v)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <p className="text-sm font-medium">{item.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 ml-5">{item.hint}</p>
                  {done && c?.at && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 ml-5">
                      Confirmed {new Date(c.at).toLocaleString()}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
