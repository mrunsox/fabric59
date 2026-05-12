import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCode, Plus, Pencil, Trash2, Play, Copy, PenTool } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useScripts, useCreateScript, useUpdateScript, useDeleteScript } from "@/hooks/useScripts";

export function ScriptEditorContent() {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const navigate = useNavigate();
  const { data: scripts = [], isLoading } = useScripts();
  const createScript = useCreateScript();
  const updateScript = useUpdateScript();
  const deleteScript = useDeleteScript();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", status: "draft" });

  const handleSave = () => {
    if (!orgId || !form.name.trim()) return;
    if (editingId) {
      updateScript.mutate({ id: editingId, name: form.name, description: form.description, status: form.status });
    } else {
      createScript.mutate({ name: form.name, description: form.description, organization_id: orgId });
    }
    setOpen(false);
    setEditingId(null);
    setForm({ name: "", description: "", status: "draft" });
  };

  const statusColor = (s: string) => s === "active" ? "default" as const : s === "archived" ? "destructive" as const : "secondary" as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileCode className="h-6 w-6" /> Scripts</h1>
          <p className="text-sm text-muted-foreground">Create and manage call scripts for agent runtime</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5" onClick={() => { setEditingId(null); setForm({ name: "", description: "", status: "draft" }); }}>
              <Plus className="h-4 w-4" /> New Script
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit Script" : "New Script"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Script name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              {editingId && (
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button onClick={handleSave} className="w-full">{editingId ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="text-xs text-muted-foreground mb-1">Total Scripts</div>
          <p className="text-2xl font-bold">{scripts.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="text-xs text-muted-foreground mb-1">Active</div>
          <p className="text-2xl font-bold text-success">{scripts.filter(s => s.status === "active").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="text-xs text-muted-foreground mb-1">Draft</div>
          <p className="text-2xl font-bold">{scripts.filter(s => s.status === "draft").length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : scripts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileCode className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No scripts yet. Create one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {scripts.map(script => (
                  <TableRow key={script.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{script.name}</p>
                        {script.description && <p className="text-xs text-muted-foreground">{script.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={statusColor(script.status)}>{script.status}</Badge></TableCell>
                    <TableCell className="text-sm">{new Date(script.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit details" onClick={() => {
                          setEditingId(script.id);
                          setForm({ name: script.name, description: script.description || "", status: script.status });
                          setOpen(true);
                        }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Visual Builder" onClick={() => navigate(`/admin/scripts/${script.id}/builder`)}>
                          <PenTool className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Preview" onClick={() => navigate(`/admin/scripts/${script.id}/builder`)}>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteScript.mutate(script.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
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
    </div>
  );
}

export default function ScriptEditorPage() {
  return <ScriptEditorContent />;
}
