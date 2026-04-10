import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateLegalCampaign, useUpdateLegalCampaign, useLegalConnections } from "@/hooks/useLegalConnect";

interface CampaignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  editData?: Record<string, any> | null;
}

export default function CampaignFormDialog({ open, onOpenChange, clientId, editData }: CampaignFormDialogProps) {
  const isEdit = !!editData;
  const [name, setName] = useState(editData?.five9_campaign_name ?? "");
  const [type, setType] = useState(editData?.campaign_type ?? "inbound");
  const [dnis, setDnis] = useState(editData?.dnis ?? "");
  const [connectionId, setConnectionId] = useState(editData?.provider_connection_id ?? "");
  const [active, setActive] = useState(editData?.active ?? true);

  const { data: connections } = useLegalConnections(clientId);
  const create = useCreateLegalCampaign();
  const update = useUpdateLegalCampaign();

  const handleSubmit = () => {
    const payload: Record<string, unknown> = {
      five9_campaign_name: name,
      campaign_type: type,
      dnis: dnis || null,
      provider_connection_id: connectionId || null,
      active,
      ...(clientId ? { client_id: clientId } : {}),
    };

    if (isEdit) {
      update.mutate({ id: editData!.id, data: payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Campaign Mapping" : "Add Campaign Mapping"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Five9 Campaign Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Legal Intake — Inbound" />
          </div>
          <div className="space-y-1.5">
            <Label>Campaign Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
                <SelectItem value="blended">Blended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>DNIS (optional)</Label>
            <Input value={dnis} onChange={(e) => setDnis(e.target.value)} placeholder="+18005551234" />
          </div>
          <div className="space-y-1.5">
            <Label>Provider Connection</Label>
            <Select value={connectionId} onValueChange={setConnectionId}>
              <SelectTrigger><SelectValue placeholder="Select connection…" /></SelectTrigger>
              <SelectContent>
                {(connections ?? []).filter(c => c.status === "connected").map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.connection_name || c.provider}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name || create.isPending || update.isPending}>
            {isEdit ? "Save Changes" : "Add Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
