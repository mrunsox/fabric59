import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Globe } from "lucide-react";
import { useFive9Routes, useUpsertFive9Route, useDeleteFive9Route } from "@/hooks/useFive9Overlay";
import { useLegalConnectClients } from "@/hooks/useLegalConnect";

interface Props {
  clientId?: string;
  organizationId?: string;
}

export default function DomainRoutingPanel({ clientId, organizationId }: Props) {
  const { data: routes, isLoading } = useFive9Routes(clientId);
  const { data: clients } = useLegalConnectClients();
  const upsert = useUpsertFive9Route();
  const remove = useDeleteFive9Route();

  const [draft, setDraft] = useState({
    five9_domain: "",
    campaign_name: "",
    dnis: "",
    queue_id: "",
    client_id: clientId ?? "",
    provider_target: "",
    default_disposition_policy: "review",
    priority: 100,
  });

  const handleAdd = () => {
    if (!draft.five9_domain || !draft.client_id || !organizationId) return;
    upsert.mutate({
      ...draft,
      organization_id: organizationId,
      campaign_name: draft.campaign_name || null,
      dnis: draft.dnis || null,
      queue_id: draft.queue_id || null,
      provider_target: draft.provider_target || null,
    });
    setDraft({ ...draft, campaign_name: "", dnis: "", queue_id: "" });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Domain & Campaign Routing</CardTitle>
        </div>
        <CardDescription>
          Map Five9 domains, campaigns, DNIS, or queues to a target client + provider. Most specific match wins (lowest priority value).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Five9 Domain *</Label>
            <Input value={draft.five9_domain} onChange={(e) => setDraft({ ...draft, five9_domain: e.target.value })} placeholder="firm.five9.com" />
          </div>
          <div>
            <Label className="text-xs">Campaign (optional)</Label>
            <Input value={draft.campaign_name} onChange={(e) => setDraft({ ...draft, campaign_name: e.target.value })} placeholder="Inbound Intake" />
          </div>
          <div>
            <Label className="text-xs">DNIS (optional)</Label>
            <Input value={draft.dnis} onChange={(e) => setDraft({ ...draft, dnis: e.target.value })} placeholder="+15551234567" />
          </div>
          <div>
            <Label className="text-xs">Queue ID (optional)</Label>
            <Input value={draft.queue_id} onChange={(e) => setDraft({ ...draft, queue_id: e.target.value })} placeholder="intake-queue" />
          </div>
          <div>
            <Label className="text-xs">Target Client *</Label>
            <Select value={draft.client_id} onValueChange={(v) => setDraft({ ...draft, client_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Provider Target</Label>
            <Select value={draft.provider_target || "auto"} onValueChange={(v) => setDraft({ ...draft, provider_target: v === "auto" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                <SelectItem value="clio">Clio</SelectItem>
                <SelectItem value="mycase">MyCase</SelectItem>
                <SelectItem value="smokeball">Smokeball</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Default Policy</Label>
            <Select value={draft.default_disposition_policy} onValueChange={(v) => setDraft({ ...draft, default_disposition_policy: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="review">Review (safe default)</SelectItem>
                <SelectItem value="auto_create">Auto-create</SelectItem>
                <SelectItem value="attach_only">Attach only</SelectItem>
                <SelectItem value="log_only">Log only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleAdd} disabled={upsert.isPending} className="w-full"><Plus className="h-4 w-4 mr-1" />Add Route</Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Campaign / DNIS / Queue</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Policy</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && (routes ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No routes configured</TableCell></TableRow>
            )}
            {(routes ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.five9_domain}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {[r.campaign_name, r.dnis, r.queue_id].filter(Boolean).join(" · ") || "— any —"}
                </TableCell>
                <TableCell>{clients?.find((c) => c.id === r.client_id)?.name ?? r.client_id.slice(0, 8)}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{r.provider_target ?? "auto"}</Badge></TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{r.default_disposition_policy}</Badge></TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
