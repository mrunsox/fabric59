import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Route, Trash2 } from "lucide-react";
import { useCampaignScripts, useCreateCampaignScript, useUpdateCampaignScript, useDeleteCampaignScript } from "@/hooks/useCampaignScripts";
import { useScripts } from "@/hooks/useScripts";
import { useTenants } from "@/hooks/useTenants";

export function ScriptRoutingContent() {
  const { data: routes = [], isLoading } = useCampaignScripts();
  const { data: scripts = [] } = useScripts();
  const { data: tenants = [] } = useTenants();
  const createRoute = useCreateCampaignScript();
  const updateRoute = useUpdateCampaignScript();
  const deleteRoute = useDeleteCampaignScript();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ tenant_id: "", script_id: "", dnis: "", five9_campaign_id: "" });

  const handleCreate = () => {
    if (!form.tenant_id || !form.script_id) return;
    createRoute.mutate(
      { tenant_id: form.tenant_id, script_id: form.script_id, dnis: form.dnis || undefined, five9_campaign_id: form.five9_campaign_id || undefined },
      { onSuccess: () => { setDialogOpen(false); setForm({ tenant_id: "", script_id: "", dnis: "", five9_campaign_id: "" }); } }
    );
  };

  const scriptName = (id: string) => scripts.find(s => s.id === id)?.name || "—";
  const tenantName = (id: string) => tenants.find(t => t.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Route className="h-6 w-6" /> Script Routing</h1>
          <p className="text-sm text-muted-foreground">Map DNIS / Five9 campaigns to scripts</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Mapping</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading…</div>
          ) : routes.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Route className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No script routing configured yet. Add a mapping to route calls to scripts.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>DNIS</TableHead>
                  <TableHead>Campaign ID</TableHead>
                  <TableHead>Script</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{tenantName(r.tenant_id)}</TableCell>
                    <TableCell className="font-mono text-sm">{r.dnis || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{r.five9_campaign_id || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{scriptName(r.script_id)}</Badge></TableCell>
                    <TableCell>
                      <Switch
                        checked={r.is_active}
                        onCheckedChange={(checked) => updateRoute.mutate({ id: r.id, is_active: checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteRoute.mutate(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Script Routing</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client</Label>
              <Select value={form.tenant_id} onValueChange={v => setForm(f => ({ ...f, tenant_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Script</Label>
              <Select value={form.script_id} onValueChange={v => setForm(f => ({ ...f, script_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select script" /></SelectTrigger>
                <SelectContent>{scripts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>DNIS (optional)</Label>
              <Input value={form.dnis} onChange={e => setForm(f => ({ ...f, dnis: e.target.value }))} placeholder="e.g. +18005551234" />
            </div>
            <div>
              <Label>Five9 Campaign ID (optional)</Label>
              <Input value={form.five9_campaign_id} onChange={e => setForm(f => ({ ...f, five9_campaign_id: e.target.value }))} placeholder="Campaign ID" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.tenant_id || !form.script_id}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
