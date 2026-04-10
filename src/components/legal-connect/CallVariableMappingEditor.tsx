import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PremiumTable } from "@/components/ui/premium-table";
import { Badge } from "@/components/ui/badge";
import { Plus, Variable, Trash2 } from "lucide-react";
import {
  useLegalCallVariableMappings, useCreateLegalCallVariableMapping,
  useDeleteLegalCallVariableMapping,
} from "@/hooks/useLegalConnect";

interface Props { clientId?: string; campaignId?: string; }

const defaultForm = { variable_name: "", source_location: "call_variable", pass_through_mode: "always", target_entity: "contact", provider_field_path: "", is_sensitive: false };

export default function CallVariableMappingEditor({ clientId, campaignId }: Props) {
  const { data, isLoading } = useLegalCallVariableMappings(clientId, campaignId);
  const create = useCreateLegalCallVariableMapping();
  const del = useDeleteLegalCallVariableMapping();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const handleAdd = () => {
    create.mutate({ ...form, client_id: clientId, campaign_id: campaignId }, { onSuccess: () => { setAddOpen(false); setForm(defaultForm); } });
  };

  const columns = [
    { key: "var", header: "Variable", render: (r: any) => <span className="font-mono text-sm text-foreground">{r.variable_name}</span> },
    { key: "source", header: "Source", render: (r: any) => <Badge variant="outline" className="text-xs">{r.source_location}</Badge> },
    { key: "mode", header: "Pass-through", render: (r: any) => <Badge variant="outline" className="text-xs">{r.pass_through_mode}</Badge> },
    { key: "target", header: "Target Entity", render: (r: any) => <span className="text-muted-foreground capitalize">{r.target_entity}</span> },
    { key: "path", header: "Provider Field", render: (r: any) => <span className="font-mono text-xs text-muted-foreground">{r.provider_field_path || "—"}</span> },
    { key: "sensitive", header: "Sensitive", className: "w-24", render: (r: any) => r.is_sensitive ? <Badge variant="outline" className="text-xs border-warning/30 text-warning">Yes</Badge> : <span className="text-muted-foreground text-xs">No</span> },
    { key: "actions", header: "", className: "w-12", render: (r: any) => <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => del.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} variable mappings</p>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5 mr-1.5" /> Add Mapping</Button>
      </div>
      <PremiumTable columns={columns} data={data ?? []} keyExtractor={(r) => r.id} isLoading={isLoading} emptyIcon={Variable} emptyTitle="No Variable Mappings" emptyDescription="Map Five9 call variables to CRM fields." />
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Call Variable Mapping</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Variable Name</Label><Input value={form.variable_name} onChange={(e) => setForm(f => ({ ...f, variable_name: e.target.value }))} placeholder="e.g. CallerPhone" /></div>
            <div className="space-y-1.5">
              <Label>Source Location</Label>
              <Select value={form.source_location} onValueChange={(v) => setForm(f => ({ ...f, source_location: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call_variable">Call Variable</SelectItem>
                  <SelectItem value="contact_field">Contact Field</SelectItem>
                  <SelectItem value="ivr_variable">IVR Variable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pass-through Mode</Label>
              <Select value={form.pass_through_mode} onValueChange={(v) => setForm(f => ({ ...f, pass_through_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Always</SelectItem>
                  <SelectItem value="on_create">On Create</SelectItem>
                  <SelectItem value="on_update">On Update</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Target Entity</Label>
              <Select value={form.target_entity} onValueChange={(v) => setForm(f => ({ ...f, target_entity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="matter">Matter</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Provider Field Path</Label><Input value={form.provider_field_path} onChange={(e) => setForm(f => ({ ...f, provider_field_path: e.target.value }))} placeholder="e.g. phone_numbers.0.number" /></div>
            <div className="flex items-center justify-between"><Label>Sensitive Data</Label><Switch checked={form.is_sensitive} onCheckedChange={(v) => setForm(f => ({ ...f, is_sensitive: v }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.variable_name || create.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
