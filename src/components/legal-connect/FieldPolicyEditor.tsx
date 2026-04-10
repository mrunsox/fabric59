import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PremiumTable } from "@/components/ui/premium-table";
import { Badge } from "@/components/ui/badge";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import {
  useLegalFieldPolicies, useCreateLegalFieldPolicy, useDeleteLegalFieldPolicy,
} from "@/hooks/useLegalConnect";

interface Props { clientId?: string; }

const modeColors: Record<string, string> = {
  allow: "border-success/30 text-success",
  block: "border-destructive/30 text-destructive",
  review: "border-warning/30 text-warning",
  redact: "border-primary/30 text-primary",
  hash: "border-muted-foreground/30 text-muted-foreground",
};

const defaultForm = { entity_name: "", direction: "outbound", mode: "allow", sensitivity_level: "normal", provider: "clio" };

export default function FieldPolicyEditor({ clientId }: Props) {
  const { data, isLoading } = useLegalFieldPolicies(clientId);
  const create = useCreateLegalFieldPolicy();
  const del = useDeleteLegalFieldPolicy();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const handleAdd = () => {
    create.mutate({ ...form, client_id: clientId }, { onSuccess: () => { setAddOpen(false); setForm(defaultForm); } });
  };

  const columns = [
    { key: "entity", header: "Entity / Field", render: (r: any) => <span className="font-medium text-foreground">{r.entity_name}</span> },
    { key: "direction", header: "Direction", render: (r: any) => <Badge variant="outline" className="text-xs">{r.direction}</Badge> },
    { key: "mode", header: "Mode", render: (r: any) => <Badge variant="outline" className={`text-xs ${modeColors[r.mode] ?? ""}`}>{r.mode}</Badge> },
    { key: "sensitivity", header: "Sensitivity", render: (r: any) => <span className="text-muted-foreground text-xs capitalize">{r.sensitivity_level}</span> },
    { key: "provider", header: "Provider", render: (r: any) => <span className="text-muted-foreground capitalize">{r.provider}</span> },
    { key: "actions", header: "", className: "w-12", render: (r: any) => <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => del.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} field policies</p>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5 mr-1.5" /> Add Policy</Button>
      </div>
      <PremiumTable columns={columns} data={data ?? []} keyExtractor={(r) => r.id} isLoading={isLoading} emptyIcon={ShieldCheck} emptyTitle="No Field Policies" emptyDescription="Define pass-through rules for CRM fields." />
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Field Policy</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Entity / Field Name</Label><Input value={form.entity_name} onChange={(e) => setForm(f => ({ ...f, entity_name: e.target.value }))} placeholder="e.g. contact.ssn" /></div>
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select value={form.direction} onValueChange={(v) => setForm(f => ({ ...f, direction: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => setForm(f => ({ ...f, mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="redact">Redact</SelectItem>
                  <SelectItem value="hash">Hash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sensitivity Level</Label>
              <Select value={form.sensitivity_level} onValueChange={(v) => setForm(f => ({ ...f, sensitivity_level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="sensitive">Sensitive</SelectItem>
                  <SelectItem value="pii">PII</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={(v) => setForm(f => ({ ...f, provider: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clio">Clio</SelectItem>
                  <SelectItem value="mycase">MyCase</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.entity_name || create.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
