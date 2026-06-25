import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useUpdateWorkspaceCampaign,
  type CampaignStatus,
} from "@/hooks/useWorkspaceCampaignMutations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: { id: string; name: string; status: string };
};

const STATUSES: CampaignStatus[] = ["draft", "ready", "live", "paused", "archived"];

export function EditCampaignDialog({ open, onOpenChange, campaign }: Props) {
  const [name, setName] = useState(campaign.name);
  const [status, setStatus] = useState<CampaignStatus>(
    (STATUSES.includes(campaign.status as CampaignStatus)
      ? campaign.status
      : "draft") as CampaignStatus,
  );
  const update = useUpdateWorkspaceCampaign();

  useEffect(() => {
    if (open) {
      setName(campaign.name);
      setStatus(
        (STATUSES.includes(campaign.status as CampaignStatus)
          ? campaign.status
          : "draft") as CampaignStatus,
      );
    }
  }, [open, campaign]);

  const submit = async () => {
    if (!name.trim()) return;
    await update.mutateAsync({ id: campaign.id, values: { name, status } });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit campaign</DialogTitle>
          <DialogDescription>Update the campaign name and status.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="campaign-name">Name</Label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CampaignStatus)}>
              <SelectTrigger id="campaign-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={update.isPending || !name.trim()}>
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
