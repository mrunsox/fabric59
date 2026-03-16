import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Pencil, Trash2 } from "lucide-react";
import { useCallSummaryTemplates, useCreateCallSummaryTemplate, useUpdateCallSummaryTemplate, useDeleteCallSummaryTemplate } from "@/hooks/useCallSummaryTemplates";

const CHANNELS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "internal_note", label: "Internal Note" },
];

const VARIABLES = ["{{client_name}}", "{{agent_name}}", "{{disposition}}", "{{call_duration}}", "{{outcome}}", "{{date}}", "{{notes}}"];

export function CallSummaryTemplatesContent() {
  const { data: templates = [], isLoading } = useCallSummaryTemplates();
  const createTemplate = useCreateCallSummaryTemplate();
  const updateTemplate = useUpdateCallSummaryTemplate();
  const deleteTemplate = useDeleteCallSummaryTemplate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", template_body: "", channel: "email" });

  const openCreate = () => { setEditId(null); setForm({ name: "", template_body: "", channel: "email" }); setDialogOpen(true); };
  const openEdit = (t: any) => { setEditId(t.id); setForm({ name: t.name, template_body: t.template_body, channel: t.channel }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.name || !form.template_body) return;
    if (editId) {
      updateTemplate.mutate({ id: editId, ...form }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createTemplate.mutate(form, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Summary Templates</h1>
          <p className="text-sm text-muted-foreground">Post-call summary templates for emails, SMS, and internal notes</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> New Template</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading…</div>
          ) : templates.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No summary templates yet. Create one to automate post-call summaries.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{t.channel}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{t.template_body.slice(0, 80)}{t.template_body.length > 80 ? "…" : ""}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTemplate.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Summary Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. PI Intake Summary v1" />
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Template Body</Label>
              <Textarea value={form.template_body} onChange={e => setForm(f => ({ ...f, template_body: e.target.value }))} placeholder="Use variables like {{client_name}}, {{disposition}}…" rows={6} />
              <div className="flex flex-wrap gap-1 mt-2">
                {VARIABLES.map(v => (
                  <button key={v} type="button" className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-accent transition-colors" onClick={() => setForm(f => ({ ...f, template_body: f.template_body + " " + v }))}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.template_body}>{editId ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CallSummaryTemplatesPage() {
  return <CallSummaryTemplatesContent />;
}
