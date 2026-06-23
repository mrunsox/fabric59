import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Radio,
  PhoneCall,
  Clock,
  BookOpen,
  CheckCircle2,
  StickyNote,
  Search,
  PhoneIncoming,
  PhoneOff,
} from "lucide-react";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";
import { useWorkspaceForm, useFormSchema } from "@/hooks/useWorkspaceForms";
import { useWorkspaceGuides } from "@/hooks/useWorkspaceGuides";
import { useCurrentGuideVersion } from "@/hooks/useGuideVersions";
import { useDispositions } from "@/hooks/useDispositions";
import { useCreateFormSubmission } from "@/hooks/useFormSubmissions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

import { FormRunner } from "@/components/forms/runtime/FormRunner";
import { GuideContentRenderer } from "@/components/guides/GuideContentRenderer";
import { migrateGuideContentToV1 } from "@/lib/guides/guideContentSchema";
import { WorkspaceSetupChecklist } from "@/components/workspace/WorkspaceSetupChecklist";
import { useWorkspaceSetupReadiness } from "@/hooks/useWorkspaceSetupReadiness";
import { cn } from "@/lib/utils";
import { InCallAssistPanel } from "@/components/workspace/cockpit/InCallAssistPanel";
import { InCallKnowledgeBin } from "@/components/workspace/cockpit/InCallKnowledgeBin";
import { InCallRequiredFieldsPanel } from "@/components/workspace/cockpit/InCallRequiredFieldsPanel";
import { useInCallKnowledgeBin } from "@/hooks/workspace/useInCallKnowledgeBin";
import { useCallSession } from "@/hooks/workspace/useCallSession";
import { useAuth } from "@/contexts/AuthContext";
import type { CallPresenceSnapshot } from "@/lib/workspace/cockpit/callSession";

/**
 * Agent Cockpit (Checkpoint 4).
 *
 * Joins Campaigns + Forms + Guides into a working agent surface:
 *  - top-left campaign picker (only campaigns with an assigned active form)
 *  - left rail: campaign guide rendered via GuideContentRenderer
 *  - center: FormRunner driving the campaign's active intake form
 *  - right rail: disposition + notes wrap-up; submits to form_submissions
 *    tagged source="agent_cockpit".
 */
export default function WorkspaceAgentCockpitPage() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const { data: campaigns = [] } = useWorkspaceCampaigns();
  const { data: assignments = [] } = useEligibleAssignments();
  const setup = useWorkspaceSetupReadiness();

  // Resolve the current user's agent record for this org so the cockpit can
  // hydrate a real `call_sessions` row instead of a synthetic one.
  const { data: agentRecord } = useQuery({
    queryKey: ["cockpit-agent-self", workspace?.organization_id, user?.email],
    enabled: !!workspace?.organization_id && !!user?.email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id")
        .eq("organization_id", workspace!.organization_id)
        .eq("email", user!.email!)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const eligibleCampaigns = useMemo(() => {
    const byCampaign = new Map<string, string>();
    for (const a of assignments) byCampaign.set(a.campaign_id, a.form_id);
    return campaigns
      .filter((c) => byCampaign.has(c.id))
      .map((c) => ({ ...c, formId: byCampaign.get(c.id)! }));
  }, [assignments, campaigns]);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCampaignId && eligibleCampaigns.length > 0) {
      setSelectedCampaignId(eligibleCampaigns[0].id);
    }
  }, [eligibleCampaigns, selectedCampaignId]);

  if (!workspace) return null;

  const readinessHeader = !setup.isReady ? (
    <WorkspaceSetupChecklist
      variant="panel"
      readiness={setup}
      title="Cockpit not ready to take calls"
      description="Some setup steps remain. Agents can still preview the cockpit, but live calls expect every step below to be complete."
    />
  ) : (
    <WorkspaceSetupChecklist variant="strip" readiness={setup} />
  );

  if (eligibleCampaigns.length === 0) {
    return (
      <div className="space-y-6">
        <WorkspacePageHeader
          eyebrow="Agent"
          title="Agent cockpit"
          lede="Live script, intake, and disposition in one workspace."
        />
        {readinessHeader}
        <EmptyState
          icon={Radio}
          title="No campaign ready for the cockpit yet"
          description="Attach an intake form to a campaign to enable the agent cockpit. Each eligible campaign needs exactly one active form."
          action={
            <div className="flex gap-2 justify-center">
              <Button asChild size="sm" variant="outline">
                <Link to={`/w/${workspace.id}/campaigns`}>Open campaigns</Link>
              </Button>
              <Button asChild size="sm">
                <Link to={`/w/${workspace.id}/forms`}>Open forms</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const selected = eligibleCampaigns.find((c) => c.id === selectedCampaignId);

  return (
    <div className="space-y-4" data-testid="agent-cockpit">
      {readinessHeader}
      <div
        className={cn(
          "space-y-4 transition-opacity",
          setup.isReady ? "" : "opacity-60",
        )}
        aria-disabled={!setup.isReady}
      >
        <CockpitTopBar
          campaigns={eligibleCampaigns}
          selectedId={selectedCampaignId}
          onSelect={(id) => setSelectedCampaignId(id)}
          workspaceId={workspace.id}
          agentId={agentRecord?.id ?? null}
        />
        {selected ? (
          <CockpitBodyV2
            campaignId={selected.id}
            campaignName={selected.name}
            formId={selected.formId}
            workspaceId={workspace.id}
            workspaceName={workspace.name ?? ""}
            agentId={agentRecord?.id ?? null}
          />
        ) : (
          <EmptyState icon={Radio} title="Pick a campaign to begin." />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Eligible assignments — workspace-scoped reads to avoid N+1 per campaign.
// ---------------------------------------------------------------------------
function useEligibleAssignments() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: ["form-campaign-assignments-all", workspace?.id ?? null],
    enabled: !!workspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_campaign_assignments")
        .select("id, workspace_id, form_id, campaign_id")
        .eq("workspace_id", workspace!.id);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        workspace_id: string;
        form_id: string;
        campaign_id: string;
      }>;
    },
  });
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------
function CockpitTopBar({
  campaigns,
  selectedId,
  onSelect,
  workspaceId,
  agentId,
}: {
  campaigns: Array<{ id: string; name: string }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  workspaceId: string;
  agentId: string | null;
}) {
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { presence, session } = useCallSession({ workspaceId, agentId, nowTick });

  // Local fallback timer when telephony is unavailable, with explicit affordance.
  const [localStart] = useState(() => Date.now());
  const elapsedMs = presence.elapsedMs ?? nowTick - localStart;
  const sec = Math.max(0, Math.floor(elapsedMs / 1000));
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");

  const phaseChipMeta = {
    connecting: { label: "Connecting", className: "bg-blue-500" },
    live: { label: "In call", className: "bg-emerald-500" },
    wrap_up: { label: "Wrap-up", className: "bg-amber-500" },
    completed: { label: "Completed", className: "bg-muted-foreground" },
  }[presence.phase];

  return (
    <Card>
      <CardContent className="py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 min-w-[260px]">
          <Radio className="h-4 w-4 text-primary" />
          <Select value={selectedId ?? ""} onValueChange={(v) => onSelect(v)}>
            <SelectTrigger className="h-9" data-testid="cockpit-campaign-picker">
              <SelectValue placeholder="Pick a campaign…" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id} data-testid={`cockpit-campaign-${c.id}`}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="secondary" className="text-[11px] gap-1" data-testid="cockpit-phase">
          <span className="relative flex h-1.5 w-1.5">
            {presence.phase === "live" && (
              <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", phaseChipMeta.className)} />
            )}
            <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", phaseChipMeta.className)} />
          </span>
          {phaseChipMeta.label}
        </Badge>
        <Badge
          variant="outline"
          className="font-mono text-xs gap-1"
          data-testid="cockpit-caller"
          title={`Caller source: ${presence.caller.source}`}
        >
          <PhoneCall className="h-3 w-3" /> {presence.caller.label}
          <span className="ml-1 text-[9px] uppercase tracking-wider opacity-70" data-testid="cockpit-caller-source">
            {presence.caller.source === "caller_name" ? "name" : presence.caller.source === "ani" ? "ani" : "?"}
          </span>
        </Badge>
        <Badge variant="outline" className="font-mono text-xs gap-1" data-testid="cockpit-elapsed">
          <Clock className="h-3 w-3" /> {mm}:{ss}
          {!presence.telephonyAvailable && (
            <span className="ml-1 text-[9px] uppercase opacity-70">local</span>
          )}
        </Badge>
        {!presence.telephonyAvailable && (
          <span className="text-[11px] text-muted-foreground" data-testid="cockpit-telephony-unavailable">
            Telephony presence unavailable
          </span>
        )}
        {session && (
          <span className="ml-auto text-[11px] uppercase tracking-wider text-muted-foreground" data-testid="cockpit-session-id">
            Session {session.id.slice(0, 8)}…
          </span>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Body — 3-zone layout (primary / assist rail / wrap-up footer).
// Phase 5: adds InCallKnowledgeBin + InCallAssistPanel grounded by the bin,
// and an explicit phase pill (live | wrap_up | completed).
// ---------------------------------------------------------------------------
type CallPhase = "live" | "wrap_up" | "completed";


function CockpitBodyV2({
  campaignId,
  campaignName,
  formId,
  workspaceId,
  workspaceName,
}: {
  campaignId: string;
  campaignName: string;
  formId: string;
  workspaceId: string;
  workspaceName: string;
}) {
  const { data: form } = useWorkspaceForm(formId);
  const { data: schema } = useFormSchema(formId);
  const { data: guides = [] } = useWorkspaceGuides({ campaignId });
  const guide = guides[0] ?? null;
  const { data: guideVersion } = useCurrentGuideVersion(guide?.id);
  const { data: dispositions = [] } = useDispositions();
  const create = useCreateFormSubmission();

  const [outcomeKey, setOutcomeKey] = useState<string | null>(null);
  const [dispositionKey, setDispositionKey] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [pendingValues, setPendingValues] = useState<Record<string, unknown>>({});
  const [wrapped, setWrapped] = useState(false);
  const [phase, setPhase] = useState<CallPhase>("live");
  const [startedAt] = useState(() => new Date().toISOString());

  // Reset cockpit state when campaign/form changes.
  useEffect(() => {
    setOutcomeKey(null);
    setDispositionKey(null);
    setNotes("");
    setPendingValues({});
    setWrapped(false);
    setPhase("live");
  }, [campaignId, formId]);

  // When the runner ends with an outcome, auto-map disposition + move to wrap_up.
  useEffect(() => {
    if (!outcomeKey || !schema) return;
    const o = schema.outcomes.find((x) => x.key === outcomeKey);
    if (o?.dispositionKey && !dispositionKey) {
      setDispositionKey(o.dispositionKey);
    }
    if (phase === "live") setPhase("wrap_up");
  }, [outcomeKey, schema, dispositionKey, phase]);

  const guideContent = useMemo(
    () => migrateGuideContentToV1(guideVersion?.content),
    [guideVersion],
  );
  const [guideSearch, setGuideSearch] = useState("");
  const filteredGuideContent = useMemo(() => {
    if (!guideSearch.trim()) return guideContent;
    const q = guideSearch.toLowerCase();
    return {
      ...guideContent,
      blocks: guideContent.blocks.filter((b) => {
        if ("text" in b) return b.text.toLowerCase().includes(q);
        if (b.type === "connector") return b.label.toLowerCase().includes(q);
        return false;
      }),
    };
  }, [guideContent, guideSearch]);

  // ── Knowledge Bin (Phase 5) ──────────────────────────────────────────
  const knowledge = useInCallKnowledgeBin({
    campaign: { id: campaignId, name: campaignName, instructions: null },
    formId,
    session: {
      ani: "555-0100",
      callerName:
        (pendingValues.caller_name as string | undefined) ??
        (pendingValues.full_name as string | undefined) ??
        null,
      capturedValues: pendingValues,
    },
  });

  const onWrapUp = async () => {
    if (!form) return;
    try {
      await create.mutateAsync({
        formId,
        formVersion: form.current_version ?? 1,
        campaignId,
        source: "agent_cockpit",
        payload: pendingValues,
        outcomeKey: outcomeKey ?? null,
        dispositionKey: dispositionKey ?? null,
        notes: notes || null,
      });
      toast.success("Submission saved");
      setWrapped(true);
      setPhase("completed");
    } catch (e) {
      // toast handled by hook
    }
  };

  if (wrapped) {
    return (
      <Card data-testid="cockpit-wrapped">
        <CardContent className="py-12 text-center space-y-3">
          <CheckCircle2 className="h-8 w-8 mx-auto text-primary" />
          <p className="text-sm font-medium">Submission saved.</p>
          <p className="text-xs text-muted-foreground">
            Outcome <code>{outcomeKey ?? "—"}</code> · Disposition{" "}
            <code>{dispositionKey ?? "—"}</code>
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setWrapped(false);
              setOutcomeKey(null);
              setDispositionKey(null);
              setNotes("");
              setPendingValues({});
              setPhase("live");
            }}
          >
            Start next call
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3" data-testid="cockpit-body-v2">
      <CockpitPhasePill phase={phase} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
        {/* Primary column — script / required fields / form */}
        <div className="space-y-3" data-testid="cockpit-primary-column">
          <InCallRequiredFieldsPanel bin={knowledge.bin} />

          {guide && (
            <Card data-testid="cockpit-script-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5" /> Current script · {guide.name}
                </CardTitle>
                <div className="relative w-40">
                  <Search className="h-3.5 w-3.5 absolute left-2 top-2 text-muted-foreground" />
                  <Input
                    className="h-7 pl-7 text-xs"
                    placeholder="Filter…"
                    value={guideSearch}
                    onChange={(e) => setGuideSearch(e.target.value)}
                    data-testid="cockpit-guide-search"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <GuideContentRenderer content={filteredGuideContent} />
              </CardContent>
            </Card>
          )}

          {!schema || !form ? (
            <Card>
              <CardContent className="py-8 text-sm text-muted-foreground text-center">
                Loading form…
              </CardContent>
            </Card>
          ) : (
            <div data-testid="cockpit-form-column">
              <FormRunner
                key={`${campaignId}:${formId}`}
                schema={schema}
                onSubmit={(result) => {
                  setPendingValues(result.values);
                  setOutcomeKey(result.outcomeKey ?? null);
                }}
              />
            </div>
          )}
        </div>

        {/* Assist rail — AI assist + Knowledge Bin */}
        <aside
          className="space-y-3 lg:sticky lg:top-4 self-start"
          data-testid="cockpit-assist-rail"
        >
          <InCallAssistPanel
            bin={knowledge.bin}
            workspaceId={workspaceId}
            workspaceName={workspaceName}
            campaignId={campaignId}
            campaignName={campaignName}
            ani="555-0100"
            capturedValues={pendingValues}
            notes={notes}
            startedAt={startedAt}
          />
          <InCallKnowledgeBin bin={knowledge.bin} isLoading={knowledge.isLoading} />
        </aside>
      </div>

      {/* Footer wrap-up zone */}
      <Card data-testid="cockpit-wrapup-rail">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <StickyNote className="h-3.5 w-3.5" /> Wrap up
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_auto] gap-3 items-end">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Outcome
              </p>
              <Select
                value={outcomeKey ?? ""}
                onValueChange={(v) => setOutcomeKey(v || null)}
              >
                <SelectTrigger className="h-9" data-testid="cockpit-outcome">
                  <SelectValue placeholder="Select outcome…" />
                </SelectTrigger>
                <SelectContent>
                  {(schema?.outcomes ?? []).map((o) => (
                    <SelectItem key={o.key} value={o.key}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Disposition
              </p>
              <Select
                value={dispositionKey ?? ""}
                onValueChange={(v) => setDispositionKey(v || null)}
              >
                <SelectTrigger className="h-9" data-testid="cockpit-disposition">
                  <SelectValue placeholder="Select disposition…" />
                </SelectTrigger>
                <SelectContent>
                  {dispositions.map((d) => (
                    <SelectItem key={d.id} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Notes
              </p>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Call notes…"
                data-testid="cockpit-notes"
              />
            </div>
            <Button
              onClick={onWrapUp}
              disabled={create.isPending || !form}
              data-testid="cockpit-wrapup"
            >
              {create.isPending ? "Saving…" : "Wrap up"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CockpitPhasePill({ phase }: { phase: CallPhase }) {
  const meta = {
    live: { label: "Live call", tone: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30", Icon: PhoneIncoming },
    wrap_up: { label: "Wrap up", tone: "text-amber-700 bg-amber-500/10 border-amber-500/30", Icon: StickyNote },
    completed: { label: "Completed", tone: "text-muted-foreground bg-muted/40 border-border", Icon: PhoneOff },
  }[phase];
  const { Icon } = meta;
  return (
    <div className="flex items-center gap-2" data-testid={`cockpit-phase-${phase}`}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded border px-2 h-6 text-[11px] font-medium",
          meta.tone,
        )}
      >
        <Icon className="h-3 w-3" aria-hidden />
        {meta.label}
      </span>
    </div>
  );
}

