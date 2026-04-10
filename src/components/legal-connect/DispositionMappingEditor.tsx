import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PremiumTable } from "@/components/ui/premium-table";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { Plus, Map, Trash2 } from "lucide-react";
import {
  useLegalDispositionMappings, useCreateLegalDispositionMapping,
  useUpdateLegalDispositionMapping, useDeleteLegalDispositionMapping,
} from "@/hooks/useLegalConnect";

interface Props { clientId?: string; campaignId?: string; }

export default function DispositionMappingEditor({ clientId, campaignId }: Props) {
  const { data, isLoading } = useLegalDispositionMappings(clientId, campaignId);
  const create = useCreateLegalDispositionMapping();
  const update = useUpdateLegalDispositionMapping();
  const del = useDeleteLegalDispositionMapping();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ disposition_code: "", label: "", priority: 10, create_contact: true, create_matter: false, trigger_writeback: true });

  const handleAdd = () => {
    create.mutate({ ...form, client_id: clientId, campaign_id: campaignId }, { onSuccess: () => { setAddOpen(false); setForm({ disposition_code: "", label: "", priority: 10, create_contact: true, create_matter: false, trigger_writeback: true }); } });
  };

  const toggleFlag = (id: string, field: string, current: boolean) => {
    update.mutate({ id, data: { [field]: !current } });
  };

  if (!isLoading && (!data || data.length === 0) && !campaignId) {
    return <PremiumEmptyState icon={Map} title="No Disposition Mappings" description="Select a campaign or add disposition mappings to control how Five9 dispositions map to CRM actions." action={{ label: "Add Mapping", onClick: () => setAddOpen(true) }} />;
  }

  const columns = [
    { key: "code", header: "Disposition Code", render: (r: any) => <span className="font-medium text-foreground">{r.disposition_code}</span> },
    { key: "label", header: "Label", render: (r: any) => <span className="text-muted-foreground">{r.label || "—"}</span> },
    { key: "priority", header: "Priority", className: "w-20", render: (r: any) => <span className="text-muted-foreground">{r.priority}</span> },
    { key: "contact", header: "Create Contact", className: "w-32", render: (r: any) => <Switch checked={r.create_contact} onCheckedChange={() => toggleFlag(r.id, "create_contact", r.create_contact)} /> },
    { key: "matter", header: "Create Matter", className: "w-32", render: (r: any) => <Switch checked={r.create_matter} onCheckedChange={() => toggleFlag(r.id, "create_matter", r.create_matter)} /> },
    { key: "writeback", header: "Writeback", className: "w-28", render: (r: any) => <Switch checked={r.trigger_writeback} onCheckedChange={() => toggleFlag(r.id, "trigger_writeback", r.trigger_writeback)} /> },
    { key: "actions", header: "", className: "w-12", render: (r: any) => <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => del.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} disposition mappings</p>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5 mr-1.5" /> Add Mapping</Button>
      </div>
      <PremiumTable columns={columns} data={data ?? []} keyExtractor={(r) => r.id} isLoading={isLoading} emptyIcon={Map} emptyTitle="No mappings" emptyDescription="Add a disposition mapping to get started." />
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Disposition Mapping</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Disposition Code</Label><Input value={form.disposition_code} onChange={(e) => setForm(f => ({ ...f, disposition_code: e.target.value }))} placeholder="e.g. QUALIFIED_LEAD" /></div>
            <div className="space-y-1.5"><Label>Label</Label><Input value={form.label} onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Qualified Lead" /></div>
            <div className="space-y-1.5"><Label>Priority</Label><Input type="number" value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: Number(e.target.value) }))} /></div>
            <div className="flex items-center justify-between"><Label>Create Contact</Label><Switch checked={form.create_contact} onCheckedChange={(v) => setForm(f => ({ ...f, create_contact: v }))} /></div>
            <div className="flex items-center justify-between"><Label>Create Matter</Label><Switch checked={form.create_matter} onCheckedChange={(v) => setForm(f => ({ ...f, create_matter: v }))} /></div>
            <div className="flex items-center justify-between"><Label>Trigger Writeback</Label><Switch checked={form.trigger_writeback} onCheckedChange={(v) => setForm(f => ({ ...f, trigger_writeback: v }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.disposition_code || create.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
