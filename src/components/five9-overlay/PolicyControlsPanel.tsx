import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Shield, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props { clientId?: string; }

interface Policy {
  auto_create_contact: boolean;
  auto_create_matter: boolean;
  auto_create_lead: boolean;
  create_followup_task: boolean;
  attach_notes_only: boolean;
  strict_duplicate_protection: boolean;
  review_queue_fallback: boolean;
  unsupported_action_behavior: "review_queue" | "drop" | "log_only";
  require_webhook_signature: boolean;
}

const DEFAULTS: Policy = {
  auto_create_contact: true,
  auto_create_matter: false,
  auto_create_lead: true,
  create_followup_task: true,
  attach_notes_only: false,
  strict_duplicate_protection: true,
  review_queue_fallback: true,
  unsupported_action_behavior: "review_queue",
  require_webhook_signature: true,
};

export default function PolicyControlsPanel({ clientId }: Props) {
  const [policy, setPolicy] = useState<Policy>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    supabase
      .from("legal_connect_policy_profiles")
      .select("settings")
      .eq("client_id", clientId)
      .eq("name", "five9_overlay_default")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.settings) setPolicy({ ...DEFAULTS, ...(data.settings as any) });
        else setPolicy(DEFAULTS);
        setLoading(false);
      });
  }, [clientId]);

  const save = async () => {
    if (!clientId) return;
    setSaving(true);
    const { data: existing } = await supabase
      .from("legal_connect_policy_profiles")
      .select("id, organization_id")
      .eq("client_id", clientId)
      .eq("name", "five9_overlay_default")
      .maybeSingle();

    if (existing) {
      await supabase.from("legal_connect_policy_profiles").update({ settings: policy as any }).eq("id", existing.id);
    } else {
      const { data: client } = await supabase.from("tenants").select("organization_id").eq("id", clientId).single();
      await supabase.from("legal_connect_policy_profiles").insert({
        client_id: clientId,
        organization_id: client?.organization_id,
        name: "five9_overlay_default",
        settings: policy as any,
      });
    }
    setSaving(false);
    toast.success("Policy saved");
  };

  const toggle = (k: keyof Policy) => setPolicy(p => ({ ...p, [k]: !p[k] }));

  if (!clientId) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Select a client to configure policies</CardContent></Card>
    );
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
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Auto-create</p>
          <Row label="Auto-create contact/person" desc="When ANI has no match, create a new contact." value={policy.auto_create_contact} onChange={() => toggle("auto_create_contact")} />
          <Row label="Auto-create matter/case" desc="Create matter when disposition indicates qualified lead." value={policy.auto_create_matter} onChange={() => toggle("auto_create_matter")} />
          <Row label="Auto-create lead (Smokeball)" desc="Create intake lead from qualifying dispositions." value={policy.auto_create_lead} onChange={() => toggle("auto_create_lead")} />
          <Row label="Create follow-up task" desc="Add task for follow-up actions when configured." value={policy.create_followup_task} onChange={() => toggle("create_followup_task")} />
        </div>
        <Separator />
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Safety</p>
          <Row label="Strict duplicate protection" desc="Never auto-pick when multiple candidate matches exist." value={policy.strict_duplicate_protection} onChange={() => toggle("strict_duplicate_protection")} />
          <Row label="Review queue fallback" desc="Route ambiguous or unsupported actions to review." value={policy.review_queue_fallback} onChange={() => toggle("review_queue_fallback")} />
          <Row label="Attach notes only" desc="Skip create actions; attach notes/activities only." value={policy.attach_notes_only} onChange={() => toggle("attach_notes_only")} />
          <Row label="Require webhook signature" desc="Reject inbound webhooks without valid HMAC." value={policy.require_webhook_signature} onChange={() => toggle("require_webhook_signature")} />
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
