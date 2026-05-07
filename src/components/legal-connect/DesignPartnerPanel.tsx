import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import {
  ROLLOUT_LABEL,
  ROLLOUT_ORDER,
  useDesignPartner,
  useUpdateDesignPartner,
  type RolloutStatus,
} from "@/hooks/useDesignPartner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_BADGE: Record<RolloutStatus, string> = {
  not_started: "bg-muted text-muted-foreground border-border",
  onboarding_in_progress: "bg-warning/15 text-warning border-warning/30",
  testing: "bg-warning/15 text-warning border-warning/30",
  ready_for_live: "bg-primary/15 text-primary border-primary/30",
  live_pilot: "bg-primary/15 text-primary border-primary/30",
  live_steady: "bg-success/15 text-success border-success/30",
  paused: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function DesignPartnerPanel({ clientId }: { clientId: string }) {
  const { data } = useDesignPartner(clientId);
  const update = useUpdateDesignPartner(clientId);
  const [notes, setNotes] = useState({ contact_name: "", contact_email: "", sla: "", constraints: "", notes: "" });

  useEffect(() => {
    if (data?.design_partner_notes) {
      setNotes({
        contact_name: data.design_partner_notes.contact_name ?? "",
        contact_email: data.design_partner_notes.contact_email ?? "",
        sla: data.design_partner_notes.sla ?? "",
        constraints: data.design_partner_notes.constraints ?? "",
        notes: data.design_partner_notes.notes ?? "",
      });
    }
  }, [data?.id]);

  const status = data?.rollout_status ?? "not_started";
  const idx = ROLLOUT_ORDER.indexOf(status);
  const canBack = idx > 0;
  const canFwd = idx >= 0 && idx < ROLLOUT_ORDER.length - 1;

  const setStatus = async (s: RolloutStatus) => {
    await update.mutateAsync({ rollout_status: s });
    toast.success(`Rollout stage: ${ROLLOUT_LABEL[s]}`);
  };

  const saveNotes = async () => {
    await update.mutateAsync({ design_partner_notes: notes });
    toast.success("Notes saved");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Design partner
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Mark this client as a first-rollout design partner for extra visibility and rollout tracking.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={cn("capitalize", STATUS_BADGE[status])}>
              {ROLLOUT_LABEL[status]}
            </Badge>
            <div className="flex items-center gap-2">
              <Label htmlFor="dp-flag" className="text-xs text-muted-foreground">
                Design partner
              </Label>
              <Switch
                id="dp-flag"
                checked={!!data?.is_design_partner}
                onCheckedChange={(v) => update.mutate({ is_design_partner: v })}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rollout stage controls */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">Rollout stage:</span>
          <Select value={status} onValueChange={(v) => setStatus(v as RolloutStatus)}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {([...ROLLOUT_ORDER, "paused"] as RolloutStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {ROLLOUT_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={!canBack || update.isPending}
            onClick={() => setStatus(ROLLOUT_ORDER[idx - 1])}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
          <Button
            size="sm"
            disabled={!canFwd || update.isPending}
            onClick={() => setStatus(ROLLOUT_ORDER[idx + 1])}
          >
            Advance <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>

        {/* Notes */}
        {data?.is_design_partner && (
          <div className="space-y-3 rounded-lg border border-border bg-card/40 p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Internal contact name</Label>
                <Input
                  value={notes.contact_name}
                  onChange={(e) => setNotes({ ...notes, contact_name: e.target.value })}
                  placeholder="e.g. Jane at Smith Law"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Contact email</Label>
                <Input
                  value={notes.contact_email}
                  onChange={(e) => setNotes({ ...notes, contact_email: e.target.value })}
                  placeholder="jane@smithlaw.com"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">SLA expectation</Label>
                <Input
                  value={notes.sla}
                  onChange={(e) => setNotes({ ...notes, sla: e.target.value })}
                  placeholder="e.g. 24h response, weekly check-in"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Constraints</Label>
                <Input
                  value={notes.constraints}
                  onChange={(e) => setNotes({ ...notes, constraints: e.target.value })}
                  placeholder="e.g. email-only first 2 weeks"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={notes.notes}
                onChange={(e) => setNotes({ ...notes, notes: e.target.value })}
                rows={3}
                placeholder="Anything else the team should know about this design partner."
                className="text-sm"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={saveNotes} disabled={update.isPending}>
                Save notes
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
