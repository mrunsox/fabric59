import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Plus, Bug, Lightbulb, HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFeedbackSubmissions, useCreateFeedback, useUpdateFeedbackStatus } from "@/hooks/useFeedback";

const typeIcons: Record<string, typeof Bug> = { bug: Bug, feature: Lightbulb, other: HelpCircle };

export default function FeedbackPage() {
  const { organization, user } = useAuth();
  const orgId = organization?.id;
  const { data: submissions = [], isLoading } = useFeedbackSubmissions();
  const createFeedback = useCreateFeedback();
  const updateStatus = useUpdateFeedbackStatus();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "bug", title: "", description: "" });
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleSubmit = () => {
    if (!orgId || !user?.id || !form.title.trim()) return;
    createFeedback.mutate({ organization_id: orgId, submitted_by: user.id, type: form.type, title: form.title, description: form.description });
    setOpen(false);
    setForm({ type: "bug", title: "", description: "" });
  };

  const filtered = statusFilter === "all" ? submissions : submissions.filter(s => s.status === statusFilter);

  const statusVariant = (s: string) => s === "open" ? "outline" as const : s === "resolved" ? "default" as const : "secondary" as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="h-6 w-6" /> Feedback</h1>
          <p className="text-sm text-muted-foreground">Bug reports, feature requests, and suggestions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Feedback</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Feedback</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} />
              <Button onClick={handleSubmit} className="w-full" disabled={!form.title.trim()}>Submit</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="text-xs text-muted-foreground mb-1">Open</div>
          <p className="text-2xl font-bold">{submissions.filter(s => s.status === "open").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="text-xs text-muted-foreground mb-1">Acknowledged</div>
          <p className="text-2xl font-bold">{submissions.filter(s => s.status === "acknowledged").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="text-xs text-muted-foreground mb-1">Resolved</div>
          <p className="text-2xl font-bold text-success">{submissions.filter(s => s.status === "resolved").length}</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No feedback submissions yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => {
                  const Icon = typeIcons[s.type] || HelpCircle;
                  return (
                    <TableRow key={s.id}>
                      <TableCell><Icon className="h-4 w-4" /></TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{s.title}</p>
                          {s.description && <p className="text-xs text-muted-foreground line-clamp-1">{s.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={statusVariant(s.status)} className="capitalize">{s.status}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Select value={s.status} onValueChange={v => updateStatus.mutate({ id: s.id, status: v })}>
                          <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="acknowledged">Acknowledged</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
