import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ExternalLink, ClipboardList, Workflow, Headphones } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceCampaign } from "@/hooks/useWorkspaceCampaigns";
import { useWorkspaceForms } from "@/hooks/useWorkspaceForms";
import { useCampaignIntakeForm } from "@/hooks/useFormCampaignAssignments";
import { CampaignReadinessChecklist } from "@/components/dashboard/CampaignReadinessChecklist";
import { PublishSettingsCard } from "@/components/campaign-admin/PublishSettingsCard";
import { TransferDirectoryEditor } from "@/components/campaign-admin/TransferDirectoryEditor";

/**
 * Canonical Campaign Detail shell — /w/:workspaceId/campaigns/:campaignId.
 * Dashboard consolidation: this is the single canonical campaign hub. The
 * legacy /admin/campaigns/:id redirects here via AdminCampaignRedirect.
 */
export default function WorkspaceCampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { workspace } = useWorkspace();
  const { data: campaign, isLoading } = useWorkspaceCampaign(campaignId);
  if (!workspace) return null;
  const base = `/w/${workspace.id}/campaigns`;

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading campaign…</p>;
  if (!campaign) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-3">
          <h1 className="text-lg font-semibold">Campaign not found</h1>
          <Button asChild variant="outline" size="sm">
            <Link to={base}><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to campaigns</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to={base} className="hover:text-foreground">Campaigns</Link>
        <span>/</span>
        <span className="text-foreground">{campaign.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant="secondary" className="mb-2">{campaign.status}</Badge>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Workspace: {workspace.name} · Updated {new Date(campaign.updated_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" data-testid="open-agent-cockpit">
            <Link to={`/app/agent/workspace/${workspace.id}/${campaign.id}`}>
              <Headphones className="h-3.5 w-3.5 mr-1.5" /> Open agent cockpit
            </Link>
          </Button>
          <Button asChild variant="default" size="sm" data-testid="open-flow-builder">
            <Link to={`${base}/${campaign.id}/builder`}>
              <Workflow className="h-3.5 w-3.5 mr-1.5" /> Open flow builder
            </Link>
          </Button>
        </div>
      </div>

      <CampaignReadinessChecklist workspaceId={workspace.id} campaignId={campaign.id} />


      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-xs uppercase tracking-wide">Status</CardTitle></CardHeader>
          <CardContent className="text-sm">
            Canonical: <span className="font-medium">{campaign.status}</span>
            {campaign.legacy_status && (
              <p className="text-xs text-muted-foreground mt-1">
                Legacy: {campaign.legacy_status}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs uppercase tracking-wide">Client</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {campaign.client_id ? (
              <Link className="hover:text-primary" to={`/w/${workspace.id}/clients`}>
                View clients
              </Link>
            ) : (
              <span className="text-muted-foreground">Not linked</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs uppercase tracking-wide">Source</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <span className="text-muted-foreground">{campaign.source_type ?? "canonical"}</span>
          </CardContent>
        </Card>
      </div>

      <IntakeFormCard workspaceId={workspace.id} campaignId={campaign.id} />

      <PublishSettingsCard campaignId={campaign.id} workspaceId={workspace.id} />

      <TransferDirectoryEditor campaignId={campaign.id} />





      <Card>
        <CardHeader><CardTitle className="text-sm">Phase 3 note</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>This is the canonical campaign detail shell. Builder, checklist, provisioning, and
            archive workflows remain in the legacy admin page until Phase 4+.</p>
          <p>Status, client linkage, and workspace ownership are now sourced from the canonical
            <code className="px-1">campaigns</code> table.</p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Intake form card. Surfaces the single active intake form attached to this
 * campaign and lets ops swap it. `useCampaignIntakeForm` enforces the
 * single-active rule (any previous assignment is removed before insert).
 */
function IntakeFormCard({ workspaceId, campaignId }: { workspaceId: string; campaignId: string }) {
  const { data: forms = [] } = useWorkspaceForms();
  const { data: active, setActive, isMutating } = useCampaignIntakeForm(campaignId);
  const activeForm = forms.find((f) => f.id === active?.form_id) ?? null;
  const NONE = "__none__";
  return (
    <Card data-testid="intake-form-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5" /> Intake form
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Exactly one form can be active for a campaign at a time. Agents in the cockpit run
          this form during calls.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={active?.form_id ?? NONE}
            onValueChange={(v) => setActive(v === NONE ? null : v)}
            disabled={isMutating}
          >
            <SelectTrigger className="max-w-sm" data-testid="intake-form-select">
              <SelectValue placeholder="Select intake form" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— None selected —</SelectItem>
              {forms.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeForm && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/w/${workspaceId}/forms/${activeForm.id}/edit`}>
                Open builder <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          )}
        </div>
        {activeForm ? (
          <p className="text-xs text-muted-foreground">
            Active: <span className="font-medium text-foreground">{activeForm.name}</span> · v
            {activeForm.current_version ?? 1}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic">No intake form selected.</p>
        )}
      </CardContent>
    </Card>
  );
}
