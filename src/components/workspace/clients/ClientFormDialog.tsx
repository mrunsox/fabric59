import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CrmType } from "@/types/database";
import {
  useCreateWorkspaceClient,
  useUpdateWorkspaceClient,
  type ClientFormValues,
} from "@/hooks/useWorkspaceClientMutations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: { id: string; name: string; crm_type?: CrmType | null; status?: string | null } | null;
};

const CRM_OPTIONS: { value: CrmType; label: string }[] = [
  { value: "other", label: "Other" },
  { value: "clio", label: "Clio" },
  { value: "workiz", label: "Workiz" },
  { value: "salesforce", label: "Salesforce" },
  { value: "hubspot", label: "HubSpot" },
  { value: "zendesk", label: "Zendesk" },
  { value: "generic_rest", label: "Generic REST" },
];

export function ClientFormDialog({ open, onOpenChange, client }: Props) {
  const isEdit = !!client;
  const create = useCreateWorkspaceClient();
  const update = useUpdateWorkspaceClient();
  const [values, setValues] = useState<ClientFormValues>({
    name: "",
    crm_type: "other",
    status: "active",
  });

  useEffect(() => {
    if (open) {
      setValues({
        name: client?.name ?? "",
        crm_type: (client?.crm_type as CrmType) ?? "other",
        status: (client?.status as "active" | "inactive") ?? "active",
      });
    }
  }, [open, client]);

  const busy = create.isPending || update.isPending;

  async function handleSave() {
    if (!values.name.trim()) return;
    if (isEdit && client) {
      await update.mutateAsync({ id: client.id, values });
    } else {
      await create.mutateAsync(values);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this client's profile."
              : "Add a client to this workspace. CRM type and status can be changed later."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="client-name">Name</Label>
            <Input
              id="client-name"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="e.g. Assureway"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CRM type</Label>
              <Select
                value={values.crm_type}
                onValueChange={(v) => setValues((s) => ({ ...s, crm_type: v as CrmType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CRM_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={values.status}
                onValueChange={(v) => setValues((s) => ({ ...s, status: v as "active" | "inactive" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy || !values.name.trim()}>
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
