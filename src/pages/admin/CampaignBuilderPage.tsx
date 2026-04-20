import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Sparkles, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GuidancePanel } from "@/components/assistant/GuidancePanel";
import { Five9DocsPanel } from "@/components/docs/Five9DocsPanel";

const STEPS = [
  { key: "basics", label: "Basics", description: "Name, type, domain, client, provider" },
  { key: "variables", label: "Variables", description: "Call variable group + fields" },
  { key: "profile", label: "Profile", description: "Agent worksheet preview" },
  { key: "dispositions", label: "Dispositions", description: "Outcome codes + actions" },
  { key: "routing", label: "Routing", description: "Campaign-to-provider mapping" },
  { key: "readiness", label: "Readiness", description: "Validate + test" },
];

interface DraftPayload {
  campaign_name?: string;
  campaign_type?: string;
  five9_domain?: string;
  client_id?: string;
  provider_target?: string;
  variable_group_name?: string;
  variables?: Array<{ name: string; label: string; type: string; required: boolean }>;
  worksheet_fields?: string[];
  dispositions?: Array<{ code: string; label: string; action: string }>;
  routing_notes?: string;
}

export default function CampaignBuilderPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { user, organization } = useAuth();
  const [stepIdx, setStepIdx] = useState(0);
  const [payload, setPayload] = useState<DraftPayload>({});
  const [draftRowId, setDraftRowId] = useState<string | null>(draftId || null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!draftId);
  const [guideOpen, setGuideOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [domains, setDomains] = useState<{ id: string; domain: string; display_name: string }[]>([]);

  useEffect(() => {
    if (!organization) return;
    supabase.from("tenants").select("id, name").eq("organization_id", organization.id).then(({ data }) => setTenants(data || []));
    supabase.from("five9_domains").select("id, domain, display_name").eq("organization_id", organization.id).then(({ data }) => setDomains(data || []));
  }, [organization]);

  useEffect(() => {
    if (!draftId) return;
    (supabase as any).from("campaign_builder_drafts").select("*").eq("id", draftId).maybeSingle().then(({ data }: any) => {
      if (data) {
        setPayload(data.payload || {});
        setStepIdx(Math.max(0, (data.current_step || 1) - 1));
      }
      setLoading(false);
    });
  }, [draftId]);

  const updatePayload = (patch: Partial<DraftPayload>) => setPayload((p) => ({ ...p, ...patch }));

  const saveDraft = async (nextStepIdx?: number) => {
    if (!user || !organization) return;
    setSaving(true);
    const targetStep = (nextStepIdx ?? stepIdx) + 1;
    if (draftRowId) {
      await (supabase as any).from("campaign_builder_drafts").update({
        payload, current_step: targetStep, client_id: payload.client_id || null,
      }).eq("id", draftRowId);
    } else {
      const { data, error } = await (supabase as any).from("campaign_builder_drafts").insert({
        user_id: user.id, organization_id: organization.id,
        client_id: payload.client_id || null, current_step: targetStep, payload,
      }).select().single();
      if (!error && data) {
        setDraftRowId(data.id);
        navigate(`/admin/five9/campaign-builder/${data.id}`, { replace: true });
      }
    }
    setSaving(false);
  };

  const next = async () => {
    const ni = Math.min(stepIdx + 1, STEPS.length - 1);
    await saveDraft(ni);
    setStepIdx(ni);
  };
  const prev = () => setStepIdx((i) => Math.max(0, i - 1));

  const finish = async () => {
    if (!organization || !payload.client_id || !payload.five9_domain) {
      toast.error("Missing required fields");
      return;
    }
    setSaving(true);
    const { data: route, error } = await supabase.from("five9_campaign_routes").insert({
      organization_id: organization.id,
      client_id: payload.client_id,
      five9_domain: payload.five9_domain,
      campaign_name: payload.campaign_name || null,
      campaign_type: payload.campaign_type || null,
      provider_target: (payload.provider_target as any) || null,
      is_active: true,
    }).select().single();
    setSaving(false);
    if (error) {
      toast.error(`Failed to create campaign route: ${error.message}`);
      return;
    }
    if (draftRowId && route) {
      await (supabase as any).from("campaign_builder_drafts").update({
        status: "configured", created_route_id: route.id,
      }).eq("id", draftRowId);
    }
    toast.success("Campaign route created");
    navigate(`/admin/clients/${payload.client_id}/five9-overlay/campaigns/${route.id}`);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const step = STEPS[stepIdx];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Campaign Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">From blank to ready-to-receive in 6 guided steps</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" /> AI Guide
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDocsOpen(true)}>
            <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Five9 Docs
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <button
                key={s.key}
                onClick={() => setStepIdx(i)}
                className="flex flex-col items-center gap-1.5 flex-1 group"
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                  done ? "bg-success/10 text-success" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={cn("text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-border bg-card p-8 space-y-6 min-h-[420px]">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{step.label}</h2>
          <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
        </div>

        {step.key === "basics" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Campaign name</Label><Input value={payload.campaign_name || ""} onChange={(e) => updatePayload({ campaign_name: e.target.value })} placeholder="24H Virtual - Inbound" /></div>
            <div className="space-y-2"><Label>Campaign type</Label><Input value={payload.campaign_type || ""} onChange={(e) => updatePayload({ campaign_type: e.target.value })} placeholder="Inbound" /></div>
            <div className="space-y-2"><Label>Five9 domain</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={payload.five9_domain || ""} onChange={(e) => updatePayload({ five9_domain: e.target.value })}>
                <option value="">Select domain…</option>
                {domains.map((d) => <option key={d.id} value={d.domain}>{d.display_name}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Client</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={payload.client_id || ""} onChange={(e) => updatePayload({ client_id: e.target.value })}>
                <option value="">Select client…</option>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Provider target (optional)</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={payload.provider_target || ""} onChange={(e) => updatePayload({ provider_target: e.target.value })}>
                <option value="">None</option>
                <option value="clio">Clio</option>
                <option value="mycase">MyCase</option>
                <option value="smokeball">Smokeball</option>
              </select>
            </div>
          </div>
        )}

        {step.key === "variables" && (
          <div className="space-y-4">
            <div className="space-y-2"><Label>Variable group name</Label><Input value={payload.variable_group_name || ""} onChange={(e) => updatePayload({ variable_group_name: e.target.value })} placeholder="Default Intake Group" /></div>
            <p className="text-xs text-muted-foreground">Variables can be added in detail after the campaign is created. For now, name the group.</p>
          </div>
        )}

        {step.key === "profile" && (
          <div className="space-y-3">
            <Label>Worksheet fields (comma-separated)</Label>
            <Textarea value={payload.worksheet_fields?.join(", ") || ""} onChange={(e) => updatePayload({ worksheet_fields: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="first_name, last_name, phone, case_type" rows={3} />
            <p className="text-xs text-muted-foreground">These fields will appear in the agent worksheet during the call.</p>
          </div>
        )}

        {step.key === "dispositions" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Recommended starter set:</p>
            <div className="grid gap-2">
              {["Qualified Lead", "Existing Client Inquiry", "Callback", "Wrong Number", "Needs Review"].map((d) => (
                <div key={d} className="flex items-center gap-2 p-3 rounded-lg border border-border">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">{d}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Action chains can be configured per disposition in the Dispositions section after this builder.</p>
          </div>
        )}

        {step.key === "routing" && (
          <div className="space-y-3">
            <Label>Routing notes</Label>
            <Textarea value={payload.routing_notes || ""} onChange={(e) => updatePayload({ routing_notes: e.target.value })} placeholder="e.g. Pop the agent worksheet on inbound, fall back to review queue if no match" rows={4} />
          </div>
        )}

        {step.key === "readiness" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Review and create the campaign route:</p>
            <div className="rounded-lg border border-border p-4 space-y-1 text-sm">
              <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{payload.campaign_name || "—"}</span></div>
              <div><span className="text-muted-foreground">Domain:</span> <span className="font-medium">{payload.five9_domain || "—"}</span></div>
              <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{tenants.find((t) => t.id === payload.client_id)?.name || "—"}</span></div>
              <div><span className="text-muted-foreground">Provider:</span> <Badge variant="outline">{payload.provider_target || "none"}</Badge></div>
            </div>
            <Button onClick={finish} disabled={saving || !payload.campaign_name || !payload.five9_domain || !payload.client_id} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create campaign route
            </Button>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={prev} disabled={stepIdx === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <span className="text-xs text-muted-foreground">{saving ? "Saving…" : draftRowId ? "Draft saved" : "Unsaved"}</span>
        {stepIdx < STEPS.length - 1 && (
          <Button onClick={next} disabled={saving}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      <GuidancePanel open={guideOpen} onClose={() => setGuideOpen(false)} />
      <Five9DocsPanel open={docsOpen} onClose={() => setDocsOpen(false)} />
    </div>
  );
}
