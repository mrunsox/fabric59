import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardCheck, AlertTriangle, CheckCircle2, ShieldAlert, Layers } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PILOT_CHECKLIST,
  PILOT_STATUS_LABEL,
  PILOT_TEMPLATES,
  PilotChecklistState,
  PilotItemStatus,
  PilotStatus,
  computePilotReadiness,
} from "@/data/legal-connect-pilot";
import { usePilotApproval, useUpdatePilot } from "@/hooks/usePilotApproval";

const STATUS_BADGE: Record<PilotStatus, string> = {
  not_ready: "bg-muted text-muted-foreground border-border",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
  ready_for_pilot: "bg-primary/15 text-primary border-primary/30",
  approved: "bg-success/15 text-success border-success/30",
};

export default function PilotApprovalPanel({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const { data } = usePilotApproval(clientId);
  const update = useUpdatePilot(clientId);
  const [blockReason, setBlockReason] = useState("");
  const [approveNotes, setApproveNotes] = useState("");

  const checklist: PilotChecklistState = data?.pilot_checklist ?? {};
  const readiness = useMemo(() => computePilotReadiness(checklist), [checklist]);
  const status = data?.pilot_status ?? "not_ready";
  const blockedReasonExisting = data?.pilot_block_reason ?? "";
  const templateId = data?.pilot_template ?? "";
  const activeTemplate = PILOT_TEMPLATES.find((t) => t.id === templateId);
  const userId = user?.id;

  const setItem = (id: string, patch: { status?: PilotItemStatus; note?: string }) => {
    const prev = checklist[id] ?? { status: "pending" as PilotItemStatus };
    const next: PilotChecklistState = {
      ...checklist,
      [id]: {
        ...prev,
        ...patch,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      },
    };
    update.mutate({ pilot_checklist: next });
  };

  const setTemplate = (id: string) => {
    update.mutate({ pilot_template: id || null });
    if (id) toast.success("Pilot template assigned");
  };

  const markReady = async () => {
    if (readiness.missingRequired.length > 0) {
      toast.error(`Missing ${readiness.missingRequired.length} required item(s)`);
      return;
    }
    await update.mutateAsync({ pilot_status: "ready_for_pilot", pilot_block_reason: null });
    toast.success("Marked ready for pilot");
  };

  const approve = async () => {
    if (readiness.missingRequired.length > 0) {
      const ok = confirm(
        `There are ${readiness.missingRequired.length} required items not complete. Approve anyway?`,
      );
      if (!ok) return;
    }
    await update.mutateAsync({
      pilot_status: "approved",
      pilot_approval: {
        approved_at: new Date().toISOString(),
        approved_by: userId,
        notes: approveNotes || data?.pilot_approval?.notes,
        template_id: templateId || undefined,
      },
      pilot_block_reason: null,
      // advance rollout if currently behind
      ...(data && ["not_started", "onboarding_in_progress", "testing"].includes(data.rollout_status)
        ? { rollout_status: "ready_for_live" }
        : {}),
    });
    toast.success("Pilot approved");
  };

  const block = async () => {
    if (!blockReason.trim()) {
      toast.error("Provide a reason");
      return;
    }
    await update.mutateAsync({
      pilot_status: "blocked",
      pilot_block_reason: blockReason.trim(),
    });
    setBlockReason("");
    toast.success("Marked blocked");
  };

  const hold = async () => {
    await update.mutateAsync({ pilot_status: "not_ready" });
    toast.success("Moved back to Not ready");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Go / no-go pilot approval
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Internal checklist that decides whether this client can move into pilot traffic.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("capitalize", STATUS_BADGE[status])}>
              {PILOT_STATUS_LABEL[status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {readiness.completeRequired}/{readiness.totalRequired} required complete
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {status === "blocked" && blockedReasonExisting && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive mt-0.5" />
            <div className="text-xs">
              <div className="font-medium text-destructive">Reason we are holding this client</div>
              <div className="text-foreground/80 mt-0.5">{blockedReasonExisting}</div>
            </div>
          </div>
        )}

        {/* Checklist */}
        <div className="space-y-2">
          {PILOT_CHECKLIST.map((item) => {
            const cur = checklist[item.id];
            const s = (cur?.status ?? "pending") as PilotItemStatus;
            const checked = s === "complete";
            return (
              <div
                key={item.id}
                className="rounded-md border border-border p-3 flex items-start gap-3 bg-card/40"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => setItem(item.id, { status: v ? "complete" : "pending" })}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.required ? (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        Required
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">
                        Optional
                      </Badge>
                    )}
                    <Select
                      value={s}
                      onValueChange={(v) => setItem(item.id, { status: v as PilotItemStatus })}
                    >
                      <SelectTrigger className="h-6 w-[110px] text-[11px] ml-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="complete">Complete</SelectItem>
                        <SelectItem value="na">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                  <Input
                    value={cur?.note ?? ""}
                    onChange={(e) => setItem(item.id, { note: e.target.value })}
                    placeholder="Optional note"
                    className="h-7 text-xs mt-2"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pilot template */}
        <div className="rounded-lg border border-border p-3 space-y-3 bg-card/40">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <div className="text-sm font-medium">Pilot template</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={templateId} onValueChange={setTemplate}>
              <SelectTrigger className="w-[260px] h-8 text-xs">
                <SelectValue placeholder="Select a pilot template…" />
              </SelectTrigger>
              <SelectContent>
                {PILOT_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeTemplate && (
              <Badge variant="outline" className="capitalize">
                Safe mode hint: {activeTemplate.recommendedSafeMode.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
          {activeTemplate && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-md border border-border p-2 bg-success/5">
                <div className="font-medium text-success mb-1">Allows</div>
                <ul className="list-disc list-inside text-foreground/80 space-y-0.5">
                  {activeTemplate.allows.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-border p-2 bg-destructive/5">
                <div className="font-medium text-destructive mb-1">Restricts</div>
                <ul className="list-disc list-inside text-foreground/80 space-y-0.5">
                  {activeTemplate.restricts.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-2 text-muted-foreground">{activeTemplate.summary}</div>
            </div>
          )}
        </div>

        {/* Decision */}
        <div className="rounded-lg border border-border p-3 space-y-3 bg-card/40">
          <div className="text-sm font-medium">Decision</div>
          {readiness.missingRequired.length > 0 ? (
            <div className="text-xs text-warning flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
              <div>
                Missing {readiness.missingRequired.length} required item(s):{" "}
                {readiness.missingRequired
                  .map((id) => PILOT_CHECKLIST.find((i) => i.id === id)?.label)
                  .filter(Boolean)
                  .join(", ")}
              </div>
            </div>
          ) : (
            <div className="text-xs text-success flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" /> All required items complete.
            </div>
          )}

          <div>
            <Label className="text-xs">Approval notes</Label>
            <Textarea
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              rows={2}
              placeholder="Anything the team should know about this approval."
              className="text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={markReady} disabled={update.isPending}>
              Mark ready for pilot
            </Button>
            <Button size="sm" onClick={approve} disabled={update.isPending}>
              Approve for pilot
            </Button>
            <Button size="sm" variant="outline" onClick={hold} disabled={update.isPending}>
              Hold / not ready
            </Button>
          </div>

          <div className="pt-2 border-t border-border space-y-2">
            <Label className="text-xs">Reason we are holding this client (required to block)</Label>
            <div className="flex gap-2">
              <Input
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Clio sandbox returns 403 on contact lookup"
                className="h-8 text-xs"
              />
              <Button size="sm" variant="destructive" onClick={block} disabled={update.isPending}>
                Block
              </Button>
            </div>
          </div>

          {data?.pilot_approval?.approved_at && (
            <div className="text-[11px] text-muted-foreground pt-2 border-t border-border">
              Last approved {new Date(data.pilot_approval.approved_at).toLocaleString()}
              {data.pilot_approval.approved_by ? ` by ${data.pilot_approval.approved_by}` : ""}.
              {data.pilot_approval.notes ? ` Notes: ${data.pilot_approval.notes}` : ""}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
