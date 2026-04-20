import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props { clientId?: string; }

interface Policy {
  allow_contact_create: boolean;
  allow_contact_update: boolean;
  allow_matter_create: boolean;
  allow_matter_update: boolean;
  allow_note_create: boolean;
  allow_task_create: boolean;
  allow_activity_create: boolean;
  allow_callback_create: boolean;
  allow_sensitive_field_sync: boolean;
  duplicate_prevention_mode: "strict" | "loose" | "off";
  ambiguous_match_mode: "review" | "skip" | "first_match";
  unknown_caller_mode: "create" | "review" | "skip";
  unmatched_matter_mode: "review" | "create" | "skip";
}

const DEFAULTS: Policy = {
  allow_contact_create: true,
  allow_contact_update: true,
  allow_matter_create: false,
  allow_matter_update: false,
  allow_note_create: true,
  allow_task_create: true,
  allow_activity_create: true,
  allow_callback_create: true,
  allow_sensitive_field_sync: false,
  duplicate_prevention_mode: "strict",
  ambiguous_match_mode: "review",
  unknown_caller_mode: "create",
  unmatched_matter_mode: "review",
};

export default function PolicyControlsPanel({ clientId }: Props) {
  const [policy, setPolicy] = useState<Policy>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    supabase
      .from("legal_connect_policy_profiles")
      .select("*")
      .eq("client_id", clientId)
      .eq("name", "five9_overlay_default")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRecordId(data.id);
          setPolicy({
            allow_contact_create: data.allow_contact_create,
            allow_contact_update: data.allow_contact_update,
            allow_matter_create: data.allow_matter_create,
            allow_matter_update: data.allow_matter_update,
            allow_note_create: data.allow_note_create,
            allow_task_create: data.allow_task_create,
            allow_activity_create: data.allow_activity_create,
            allow_callback_create: data.allow_callback_create,
            allow_sensitive_field_sync: data.allow_sensitive_field_sync,
            duplicate_prevention_mode: data.duplicate_prevention_mode as Policy["duplicate_prevention_mode"],
            ambiguous_match_mode: data.ambiguous_match_mode as Policy["ambiguous_match_mode"],
            unknown_caller_mode: data.unknown_caller_mode as Policy["unknown_caller_mode"],
            unmatched_matter_mode: data.unmatched_matter_mode as Policy["unmatched_matter_mode"],
          });
        } else {
          setRecordId(null);
          setPolicy(DEFAULTS);
        }
        setLoading(false);
      });
  }, [clientId]);

  const save = async () => {
    if (!clientId) return;
    setSaving(true);
    if (recordId) {
      await supabase.from("legal_connect_policy_profiles").update(policy).eq("id", recordId);
    } else {
      const { data: client } = await supabase.from("tenants").select("organization_id").eq("id", clientId).single();
      if (!client) { toast.error("Client not found"); setSaving(false); return; }
      const { data } = await supabase.from("legal_connect_policy_profiles").insert({
        ...policy,
        client_id: clientId,
        organization_id: client.organization_id,
        name: "five9_overlay_default",
      }).select().single();
      if (data) setRecordId(data.id);
    }
    setSaving(false);
    toast.success("Policy saved");
  };

  const toggle = (k: keyof Policy) => setPolicy(p => ({ ...p, [k]: !p[k] }));

  if (!clientId) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Select a client to configure policies</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4" /> Policy Controls</CardTitle>
            <CardDescription>Conservative defaults are enabled. Adjust per client.</CardDescription>
          </div>
          <Button size="sm" onClick={save} disabled={saving || loading}><Save className="h-3.5 w-3.5 mr-1.5" />{saving ? "Saving…" : "Save"}</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Allowed Actions</p>
          <Row label="Create contact" desc="Allow creating new contacts when no match." value={policy.allow_contact_create} onChange={() => toggle("allow_contact_create")} />
          <Row label="Update contact" desc="Allow updating existing contact records." value={policy.allow_contact_update} onChange={() => toggle("allow_contact_update")} />
          <Row label="Create matter/case" desc="Allow creating matters from qualifying dispositions." value={policy.allow_matter_create} onChange={() => toggle("allow_matter_create")} />
          <Row label="Update matter/case" desc="Allow updating existing matter records." value={policy.allow_matter_update} onChange={() => toggle("allow_matter_update")} />
          <Row label="Create note" desc="Attach notes/communications to records." value={policy.allow_note_create} onChange={() => toggle("allow_note_create")} />
          <Row label="Create task" desc="Allow follow-up task creation." value={policy.allow_task_create} onChange={() => toggle("allow_task_create")} />
          <Row label="Create activity" desc="Allow activity log entries." value={policy.allow_activity_create} onChange={() => toggle("allow_activity_create")} />
          <Row label="Create callback" desc="Allow scheduling callbacks." value={policy.allow_callback_create} onChange={() => toggle("allow_callback_create")} />
          <Row label="Sync sensitive fields" desc="Pass through fields marked sensitive." value={policy.allow_sensitive_field_sync} onChange={() => toggle("allow_sensitive_field_sync")} />
        </div>
        <Separator />
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Match Behavior</p>
          <SelectRow label="Duplicate prevention" value={policy.duplicate_prevention_mode} onChange={(v) => setPolicy(p => ({ ...p, duplicate_prevention_mode: v as any }))} options={[["strict", "Strict — never auto-pick"], ["loose", "Loose — pick best match"], ["off", "Off"]]} />
          <SelectRow label="Ambiguous match" value={policy.ambiguous_match_mode} onChange={(v) => setPolicy(p => ({ ...p, ambiguous_match_mode: v as any }))} options={[["review", "Send to review"], ["skip", "Skip"], ["first_match", "Use first match"]]} />
          <SelectRow label="Unknown caller" value={policy.unknown_caller_mode} onChange={(v) => setPolicy(p => ({ ...p, unknown_caller_mode: v as any }))} options={[["create", "Create new"], ["review", "Send to review"], ["skip", "Skip"]]} />
          <SelectRow label="Unmatched matter" value={policy.unmatched_matter_mode} onChange={(v) => setPolicy(p => ({ ...p, unmatched_matter_mode: v as any }))} options={[["review", "Send to review"], ["create", "Create new"], ["skip", "Skip"]]} />
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function SelectRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
