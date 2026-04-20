import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Variable } from "lucide-react";
import { useFive9CallVariables, useUpsertCallVariable, useDeleteCallVariable } from "@/hooks/useFive9Overlay";

interface Props { clientId?: string; organizationId?: string; }

const DATA_TYPES = ["string", "number", "boolean", "date", "datetime", "enum", "phone", "email"];
const COMMON_PATHS = ["contact.first_name", "contact.last_name", "contact.email", "contact.phone", "matter.description", "matter.practice_area", "lead.intake_type", "task.subject", "note.content"];

export default function CallVariablesPanel({ clientId, organizationId }: Props) {
  const { data: vars, isLoading } = useFive9CallVariables(clientId);
  const upsert = useUpsertCallVariable();
  const remove = useDeleteCallVariable();

  const [draft, setDraft] = useState({
    internal_name: "",
    display_label: "",
    data_type: "string",
    required: false,
    fabric59_field_path: "",
    default_value: "",
  });

  const handleAdd = () => {
    if (!clientId || !organizationId || !draft.internal_name || !draft.display_label) return;
    upsert.mutate({ ...draft, client_id: clientId, organization_id: organizationId });
    setDraft({ internal_name: "", display_label: "", data_type: "string", required: false, fabric59_field_path: "", default_value: "" });
  };

  if (!clientId) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">Select a client to manage call variables.</CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2"><Variable className="h-4 w-4 text-primary" /><CardTitle className="text-base">Call Variables</CardTitle></div>
        <CardDescription>Define structured fields agents capture in Five9 and where they map in the canonical Fabric59 model.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <Label className="text-xs">Internal Name *</Label>
            <Input value={draft.internal_name} onChange={(e) => setDraft({ ...draft, internal_name: e.target.value })} placeholder="caller_phone" />
          </div>
          <div>
            <Label className="text-xs">Display Label *</Label>
            <Input value={draft.display_label} onChange={(e) => setDraft({ ...draft, display_label: e.target.value })} placeholder="Caller Phone" />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={draft.data_type} onValueChange={(v) => setDraft({ ...draft, data_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DATA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Maps to</Label>
            <Select value={draft.fabric59_field_path || "none"} onValueChange={(v) => setDraft({ ...draft, fabric59_field_path: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— none —</SelectItem>
                {COMMON_PATHS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Default</Label>
            <Input value={draft.default_value} onChange={(e) => setDraft({ ...draft, default_value: e.target.value })} placeholder="optional" />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2">
              <Switch checked={draft.required} onCheckedChange={(c) => setDraft({ ...draft, required: c })} />
              <Label className="text-xs">Required</Label>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={upsert.isPending}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variable</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Maps To</TableHead>
              <TableHead>Required</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && (vars ?? []).length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No call variables yet</TableCell></TableRow>
            )}
            {(vars ?? []).map((v: any) => (
              <TableRow key={v.id}>
                <TableCell>
                  <div className="font-medium text-sm">{v.display_label}</div>
                  <div className="font-mono text-xs text-muted-foreground">{v.internal_name}</div>
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{v.data_type}</Badge></TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{v.fabric59_field_path ?? "—"}</TableCell>
                <TableCell>{v.required ? <Badge className="text-xs">Required</Badge> : <span className="text-xs text-muted-foreground">Optional</span>}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remove.mutate(v.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
