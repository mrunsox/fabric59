import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Mail, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmailTemplates, useSaveEmailTemplate, useDeleteEmailTemplate, type EmailTemplate } from "@/hooks/useEmailTemplates";

export function EmailTemplatesContent() {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const { data: templates = [], isLoading } = useEmailTemplates(orgId);
  const saveTemplate = useSaveEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", html_content: "", is_default: false });

  const openCreate = () => {
    setEditId(null);
    setForm({ name: "", html_content: "", is_default: false });
    setDialogOpen(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditId(t.id);
    setForm({ name: t.name, html_content: t.html_content, is_default: t.is_default });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!orgId || !form.name.trim()) return;
    saveTemplate.mutate(
      {
        id: editId || undefined,
        organization_id: orgId,
        name: form.name,
        html_content: form.html_content,
        is_default: form.is_default,
      },
      { onSuccess: () => setDialogOpen(false) }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{templates.length} template{templates.length !== 1 ? "s" : ""}</p>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" /> New Template</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading…</div>
          ) : templates.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No email templates yet. Create one to use in post-call automations.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      {t.is_default && <Badge variant="default" className="text-xs">Default</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTemplate.mutate(t.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "New"} Email Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Welcome Email"
              />
            </div>
            <div>
              <Label>HTML Content</Label>
              <Textarea
                value={form.html_content}
                onChange={(e) => setForm((f) => ({ ...f, html_content: e.target.value }))}
                placeholder="<h1>Hello {{client_name}}</h1>..."
                rows={8}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_default}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, is_default: checked }))}
              />
              <Label className="cursor-pointer">Set as default template</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editId ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EmailTemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" /> Email Templates
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage email templates for post-call automations and notifications
        </p>
      </div>
      <EmailTemplatesContent />
    </div>
  );
}
