import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProvisioningHistory } from "@/types/provisioning";
import { DataTransferConfig, GRACE_PERIOD_OPTIONS } from "@/types/deprovisioning";
import { StatusBadge } from "@/components/agents/shared/StatusBadge";
import { AlertTriangle } from "lucide-react";

interface DeprovisioningModalProps {
  agents: ProvisioningHistory[];
  open: boolean;
  onClose: () => void;
  onConfirm: (gracePeriodHours: number, dataTransfer: DataTransferConfig, reason: string) => void;
}

export function DeprovisioningModal({ agents, open, onClose, onConfirm }: DeprovisioningModalProps) {
  const [gracePeriod, setGracePeriod] = useState("0");
  const [dataTransferEnabled, setDataTransferEnabled] = useState(false);
  const [targetEmail, setTargetEmail] = useState("");
  const [transferEmail, setTransferEmail] = useState(true);
  const [transferDrive, setTransferDrive] = useState(true);
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(parseInt(gracePeriod, 10), {
      enabled: dataTransferEnabled,
      targetEmail: dataTransferEnabled ? targetEmail : undefined,
      transferEmail,
      transferDrive,
    }, reason);
    onClose();
  };

  const isBatch = agents.length > 1;
  const gracePeriodHours = parseInt(gracePeriod, 10);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg dark">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {isBatch ? `Offboard ${agents.length} Agents` : `Offboard ${agents[0]?.agentName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Agent preview */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 max-h-32 overflow-y-auto">
            {agents.map(agent => (
              <div key={agent.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{agent.agentName}</p>
                  <p className="text-xs text-muted-foreground">{agent.role} · Ext {agent.extension}</p>
                </div>
                <StatusBadge status={agent.status} />
              </div>
            ))}
          </div>

          {/* Grace period */}
          <div className="space-y-1.5">
            <Label>Grace Period</Label>
            <Select value={gracePeriod} onValueChange={setGracePeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRACE_PERIOD_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data transfer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Data Transfer</Label>
              <Switch checked={dataTransferEnabled} onCheckedChange={setDataTransferEnabled} />
            </div>
            {dataTransferEnabled && (
              <div className="space-y-2 pl-4 border-l-2 border-border">
                <div className="space-y-1.5">
                  <Label className="text-xs">Target Email</Label>
                  <Input placeholder="manager@company.com" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} className="h-8" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Switch checked={transferEmail} onCheckedChange={setTransferEmail} className="scale-75" />
                    Transfer Email
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Switch checked={transferDrive} onCheckedChange={setTransferDrive} className="scale-75" />
                    Transfer Drive
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>Reason <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
            <Textarea
              placeholder="e.g. Resignation, contract ended..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="h-20 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm}>
            {gracePeriodHours === 0 ? 'Offboard Now' : `Schedule Offboarding (${GRACE_PERIOD_OPTIONS.find(o => o.value === gracePeriodHours)?.label})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
