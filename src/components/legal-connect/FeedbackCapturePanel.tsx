import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateFeedbackEntry,
  useLegalConnectFeedback,
  useUpdateFeedbackEntry,
} from "@/hooks/useLegalConnectFeedback";
import { useDesignPartners } from "@/hooks/useDesignPartner";
import {
  FEEDBACK_SOURCES,
  FEEDBACK_STATUSES,
  FEEDBACK_TOPICS,
  FEEDBACK_TYPES,
} from "@/data/legal-connect-feedback";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  new: "bg-warning/15 text-warning border-warning/30",
  triaged: "bg-primary/15 text-primary border-primary/30",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  shipped: "bg-success/15 text-success border-success/30",
  wont_fix: "bg-muted text-muted-foreground border-border",
};

export default function FeedbackCapturePanel() {
  const { user, organization } = useAuth();
  const orgId = organization?.id ?? "";
  const { data: partners = [] } = useDesignPartners();
  const { data: entries = [], isLoading } = useLegalConnectFeedback({ organizationId: orgId });
  const create = useCreateFeedbackEntry();
  const update = useUpdateFeedbackEntry();

  const [clientId, setClientId] = useState<string>("");
  const [source, setSource] = useState("design_partner_interview");
  const [topic, setTopic] = useState("general");
  const [type, setType] = useState("idea");
  const [message, setMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = useMemo(
    () => (filterStatus === "all" ? entries : entries.filter((e) => e.status === filterStatus)),
    [entries, filterStatus],
  );

  const submit = async () => {
    if (!message.trim() || !orgId) return;
    await create.mutateAsync({
      organization_id: orgId,
      client_id: clientId || null,
      source,
      topic,
      entry_type: type,
      message: message.trim(),
      logged_by: user?.id ?? null,
      logged_by_name: user?.email ?? null,
    });
    setMessage("");
  };

  const partnerName = (id: string | null) => partners.find((p) => p.id === id)?.name ?? "—";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" /> Design-partner feedback
        </CardTitle>
        <CardDescription className="text-xs">
          Quick log for calls, interviews, and in-product notes. Used to drive release notes and roadmap.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tenant</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FEEDBACK_SOURCES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Topic</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FEEDBACK_TOPICS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FEEDBACK_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What did they say? Paraphrase is fine."
            rows={3}
          />
          <div className="flex justify-end">
            <Button onClick={submit} disabled={!message.trim() || create.isPending} size="sm">
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {create.isPending ? "Saving…" : "Log feedback"}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {entries.length} total · showing {filtered.length}
          </div>
          <div className="w-48">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {FEEDBACK_STATUSES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Tenant</TableHead>
                <TableHead className="w-[80px]">Type</TableHead>
                <TableHead className="w-[100px]">Topic</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground py-6 text-center">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground py-6 text-center">No entries yet.</TableCell></TableRow>
              ) : (
                filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">{partnerName(e.client_id)}</TableCell>
                    <TableCell className="text-xs capitalize">{e.entry_type.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-xs capitalize">{e.topic.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-xs">
                      <div>{e.message}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(e.created_at).toLocaleString()} · {e.logged_by_name ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={e.status}
                        onValueChange={(v) => update.mutate({ id: e.id, patch: { status: v } })}
                      >
                        <SelectTrigger className={cn("h-7 text-[11px] capitalize", STATUS_BADGE[e.status])}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FEEDBACK_STATUSES.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
