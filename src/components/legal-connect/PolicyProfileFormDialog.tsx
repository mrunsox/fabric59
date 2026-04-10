import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateLegalPolicyProfile, useUpdateLegalPolicyProfile } from "@/hooks/useLegalConnect";

interface PolicyProfileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  editData?: Record<string, any> | null;
}

export default function PolicyProfileFormDialog({ open, onOpenChange, clientId, editData }: PolicyProfileFormDialogProps) {
  const isEdit = !!editData;
  const [name, setName] = useState(editData?.name ?? "");
  const [isDefault, setIsDefault] = useState(editData?.is_default ?? false);
  const [allowContactCreate, setAllowContactCreate] = useState(editData?.allow_contact_create ?? true);
  const [allowMatterCreate, setAllowMatterCreate] = useState(editData?.allow_matter_create ?? false);
  const [ambiguousMode, setAmbiguousMode] = useState(editData?.ambiguous_match_mode ?? "review");
  const [dupMode, setDupMode] = useState(editData?.duplicate_prevention_mode ?? "phone_email");

  const create = useCreateLegalPolicyProfile();
  const update = useUpdateLegalPolicyProfile();

  const handleSubmit = () => {
    const payload: Record<string, unknown> = {
      name,
      is_default: isDefault,
      allow_contact_create: allowContactCreate,
      allow_matter_create: allowMatterCreate,
      ambiguous_match_mode: ambiguousMode,
      duplicate_prevention_mode: dupMode,
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
          <DialogTitle>{isEdit ? "Edit Policy Profile" : "New Policy Profile"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Profile Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Default Legal Intake" />
          </div>
          <div className="flex items-center justify-between">
            <Label>Default Profile</Label>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Allow Contact Creation</Label>
            <Switch checked={allowContactCreate} onCheckedChange={setAllowContactCreate} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Allow Matter Creation</Label>
            <Switch checked={allowMatterCreate} onCheckedChange={setAllowMatterCreate} />
          </div>
          <div className="space-y-1.5">
            <Label>Ambiguous Match Mode</Label>
            <Select value={ambiguousMode} onValueChange={setAmbiguousMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="review">Manual Review</SelectItem>
                <SelectItem value="auto_merge">Auto Merge</SelectItem>
                <SelectItem value="create_new">Create New</SelectItem>
                <SelectItem value="skip">Skip</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Duplicate Prevention Mode</Label>
            <Select value={dupMode} onValueChange={setDupMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="phone_email">Phone + Email</SelectItem>
                <SelectItem value="phone_only">Phone Only</SelectItem>
                <SelectItem value="email_only">Email Only</SelectItem>
                <SelectItem value="name_phone">Name + Phone</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name || create.isPending || update.isPending}>
            {isEdit ? "Save Changes" : "Create Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
