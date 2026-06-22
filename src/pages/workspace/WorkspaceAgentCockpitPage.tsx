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
  const { data: campaigns = [] } = useWorkspaceCampaigns();
  const { data: assignments = [] } = useEligibleAssignments();
  const setup = useWorkspaceSetupReadiness();

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

  if (eligibleCampaigns.length === 0) {
    return (
      <div className="space-y-6">
        <WorkspacePageHeader
          eyebrow="Agent"
          title="Agent cockpit"
          lede="Live script, intake, and disposition in one workspace."
        />
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
      <CockpitTopBar
        campaigns={eligibleCampaigns}
        selectedId={selectedCampaignId}
        onSelect={(id) => setSelectedCampaignId(id)}
      />
      {selected ? (
        <CockpitBody campaignId={selected.id} formId={selected.formId} />
      ) : (
        <EmptyState icon={Radio} title="Pick a campaign to begin." />
      )}
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
}: {
  campaigns: Array<{ id: string; name: string }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [startedAt] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsedSec = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  return (
    <Card>
      <CardContent className="py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 min-w-[260px]">
          <Radio className="h-4 w-4 text-primary" />
          <Select
            value={selectedId ?? ""}
            onValueChange={(v) => onSelect(v)}
          >
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
        <Badge variant="outline" className="font-mono text-xs gap-1">
          <PhoneCall className="h-3 w-3" /> ANI 555-0100
        </Badge>
        <Badge variant="outline" className="font-mono text-xs gap-1" data-testid="cockpit-elapsed">
          <Clock className="h-3 w-3" /> {mm}:{ss}
        </Badge>
        <span className="ml-auto text-[11px] uppercase tracking-wider text-muted-foreground">
          Session started {startedAt.toLocaleTimeString()}
        </span>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Body — 3-column at lg, stacked below.
// ---------------------------------------------------------------------------
function CockpitBody({ campaignId, formId }: { campaignId: string; formId: string }) {
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

  // Reset cockpit state when campaign/form changes.
  useEffect(() => {
    setOutcomeKey(null);
    setDispositionKey(null);
    setNotes("");
    setPendingValues({});
    setWrapped(false);
  }, [campaignId, formId]);

  // When the runner ends with an outcome, auto-map disposition if defined.
  useEffect(() => {
    if (!outcomeKey || !schema) return;
    const o = schema.outcomes.find((x) => x.key === outcomeKey);
    if (o?.dispositionKey && !dispositionKey) {
      setDispositionKey(o.dispositionKey);
    }
  }, [outcomeKey, schema, dispositionKey]);

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
            }}
          >
            Start next call
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_320px] gap-4">
      {/* Left rail — Guide */}
      <Card className="lg:sticky lg:top-4 self-start" data-testid="cockpit-guide-rail">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" /> Knowledge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!guide ? (
            <p className="text-xs text-muted-foreground">
              No guide attached to this campaign. Open Guides to assign one.
            </p>
          ) : (
            <>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                <Input
                  className="h-8 pl-7 text-xs"
                  placeholder="Filter guide…"
                  value={guideSearch}
                  onChange={(e) => setGuideSearch(e.target.value)}
                  data-testid="cockpit-guide-search"
                />
              </div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {guide.name}
              </p>
              <GuideContentRenderer content={filteredGuideContent} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Center — FormRunner */}
      <div className="space-y-3" data-testid="cockpit-form-column">
        {!schema || !form ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground text-center">
              Loading form…
            </CardContent>
          </Card>
        ) : (
          <FormRunner
            key={`${campaignId}:${formId}`}
            schema={schema}
            onSubmit={(result) => {
              setPendingValues(result.values);
              setOutcomeKey(result.outcomeKey ?? null);
            }}
          />
        )}
      </div>

      {/* Right rail — Disposition + notes */}
      <Card className="lg:sticky lg:top-4 self-start" data-testid="cockpit-wrapup-rail">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <StickyNote className="h-3.5 w-3.5" /> Wrap up
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Call notes…"
              data-testid="cockpit-notes"
            />
          </div>
          <Button
            className="w-full"
            onClick={onWrapUp}
            disabled={create.isPending || !form}
            data-testid="cockpit-wrapup"
          >
            {create.isPending ? "Saving…" : "Wrap up"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
