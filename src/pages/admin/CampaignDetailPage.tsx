import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCampaignSetup, useUpdateChecklist, useAutoProvision } from "@/hooks/useCampaignSetup";
import type { ProvisioningStep } from "@/hooks/useCampaignSetup";
import { useArchiveCampaign, type ArchiveStep } from "@/hooks/useCampaignArchive";
import { CampaignChecklist } from "@/components/campaigns/CampaignChecklist";
import { ArchiveConfirmDialog } from "@/components/campaigns/ArchiveConfirmDialog";
import { ArchiveWorkflowModal } from "@/components/campaigns/ArchiveWorkflowModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Pencil, ArrowLeft, Rocket, Loader2, CheckCircle2, CloudOff, Archive } from "lucide-react";
import type { CampaignIntakeData } from "@/types/campaign";

export default function CampaignDetailPage() {
  const { id } = useParams();
  const { data: campaign, isLoading } = useCampaignSetup(id);
  const updateChecklist = useUpdateChecklist();
  const provisionMutation = useAutoProvision();
  const archiveMutation = useArchiveCampaign();

  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showArchiveWorkflow, setShowArchiveWorkflow] = useState(false);
  const [archiveSteps, setArchiveSteps] = useState<ArchiveStep[]>([]);
  const [provisionSteps, setProvisionSteps] = useState<ProvisioningStep[]>([]);

  if (isLoading) return <p className="text-muted-foreground p-6">Loading...</p>;
  if (!campaign) return <p className="text-muted-foreground p-6">Campaign not found.</p>;

  const intake = campaign.intake_data as CampaignIntakeData;
  const checklist = (campaign.checklist_state || {}) as Record<string, { done: boolean; blocked?: string }>;

  const handleToggle = (itemId: string, done: boolean) => {
    const updated = { ...checklist, [itemId]: { ...checklist[itemId], done } };
    updateChecklist.mutate({ id: campaign.id, checklistState: updated });
  };

  const handleRunProvisioning = async () => {
    setShowProvisionModal(true);
    try {
      await provisionMutation.mutateAsync({
        campaignId: campaign.id,
        intake,
        checklistState: { ...checklist },
        onProgress: setProvisionSteps,
      });
    } catch {
      // Error shown in modal
    }
  };

  const provisioningComplete = provisionSteps.length > 0 && provisionSteps.every((s) => s.status === "done" || s.status === "error");
  const provisioningProgress = provisionSteps.length > 0
    ? Math.round((provisionSteps.filter((s) => s.status === "done").length / provisionSteps.length) * 100)
    : 0;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <div className="text-sm space-y-0.5">{children}</div>
    </div>
  );

  const Field = ({ label, value }: { label: string; value?: string | boolean | null }) => {
    if (value === undefined || value === null || value === "") return null;
    return (
      <p><span className="text-muted-foreground">{label}:</span> {typeof value === "boolean" ? (value ? "Yes" : "No") : value}</p>
    );
  };

  const canProvision = campaign.status === "submitted" || campaign.status === "draft";
  const canArchive = campaign.status === "live" || campaign.status === "provisioned" || campaign.status === "submitted" || campaign.status === "draft";

  const handleArchive = async () => {
    setShowArchiveConfirm(false);
    setShowArchiveWorkflow(true);
    await archiveMutation.mutateAsync({
      campaignId: campaign.id,
      campaignName: campaign.campaign_name,
      clientName: campaign.client_name,
      organizationId: campaign.organization_id,
      fiveDomainId: campaign.five9_domain_id,
      intakeData: intake as unknown as Record<string, unknown>,
      onProgress: setArchiveSteps,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/admin/campaigns"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{campaign.campaign_name}</h1>
          <p className="text-sm text-muted-foreground">{campaign.client_name}</p>
        </div>
        <Badge variant="secondary">{campaign.status}</Badge>
        {canProvision && (
          <Button size="sm" onClick={handleRunProvisioning} disabled={provisionMutation.isPending} className="gap-1.5">
            <Rocket className="h-3.5 w-3.5" /> Provision
          </Button>
        )}
        {canArchive && campaign.status !== "archived" && (
          <Button variant="outline" size="sm" onClick={() => setShowArchiveConfirm(true)} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
            <Archive className="h-3.5 w-3.5" /> Archive
          </Button>
        )}
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link to={`/admin/campaigns/edit/${campaign.id}`}><Pencil className="h-3.5 w-3.5" /> Edit</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left: Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Campaign Basics</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Section title="Info">
                <Field label="Campaign" value={intake.campaignName} />
                <Field label="Client" value={intake.clientName} />
                <Field label="Description" value={intake.campaignDescription} />
                <Field label="White-Label" value={intake.whiteLabel} />
              </Section>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Phone Numbers</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Section title="ANIs">
                <p>{intake.aniNumbers?.filter(Boolean).join(", ") || "None"}</p>
              </Section>
              <Section title="DNIS">
                <p>{intake.dnisNumbers?.filter(Boolean).join(", ") || "None"}</p>
              </Section>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Schedule</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Coverage" value={intake.coverageType} />
              {intake.coverageType === "scheduled" && (
                <>
                  <Field label="Weekday" value={`${intake.weekdayStart} – ${intake.weekdayEnd}`} />
                  {!intake.noWeekendCoverage && <Field label="Weekend" value={`${intake.weekendStart} – ${intake.weekendEnd}`} />}
                  <Field label="No Weekend" value={intake.noWeekendCoverage} />
                  <Field label="After-Hours" value={intake.afterHoursHandling} />
                  {intake.afterHoursHandling === "transfer" && <Field label="Transfer To" value={intake.afterHoursTransferNumber} />}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Dispositions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Section title="Selected">
                <p>{intake.existingDispositions?.join(", ") || "None"}</p>
              </Section>
              {intake.newDispositions?.length > 0 && (
                <Section title="New">
                  <p>{intake.newDispositions.join(", ")}</p>
                </Section>
              )}
              <Field label="Email Enabled" value={intake.enableDispositionEmail} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Skill & Users</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Skill" value={intake.skillName} />
              <Field label="Users" value={intake.assignedUsers?.join(", ")} />
              <Field label="IVR Routing" value={intake.addSkillToIvr} />
            </CardContent>
          </Card>

          {intake.decisionTree?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Decision Tree</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {intake.decisionTree.map((node, i) => (
                    <div key={node.id} className="pl-3 border-l-2 border-primary/30 space-y-1">
                      <p className="text-sm font-medium">Q{i + 1}: {node.question}</p>
                      {node.options.map((opt, j) => (
                        <p key={j} className="text-xs text-muted-foreground pl-3">
                          → {opt.label}: {opt.action ? `${opt.action} (${opt.actionValue || ""})` : opt.nextNodeId ? "Go to next" : "End"}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {intake.additionalNotes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{intake.additionalNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Checklist */}
        <div>
          <CampaignChecklist checklistState={checklist} onToggle={handleToggle} />
        </div>
      </div>

      {/* Provisioning Modal */}
      <Dialog open={showProvisionModal} onOpenChange={(open) => {
        if (!open && provisioningComplete) setShowProvisionModal(false);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Campaign Provisioning
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Progress value={provisioningProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{provisioningProgress}% complete</p>
            <div className="space-y-2">
              {provisionSteps.map((step) => (
                <div key={step.id} className="flex items-center gap-3 text-sm">
                  {step.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-muted shrink-0" />}
                  {step.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                  {step.status === "done" && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  {step.status === "error" && <CloudOff className="h-4 w-4 text-destructive shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <span className={step.status === "error" ? "text-destructive" : ""}>{step.label}</span>
                    {step.error && <p className="text-xs text-destructive truncate">{step.error}</p>}
                  </div>
                </div>
              ))}
            </div>
            {provisioningComplete && (
              <Button className="w-full" onClick={() => setShowProvisionModal(false)}>
                Done
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirm & Workflow */}
      <ArchiveConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        campaignName={campaign.campaign_name}
        onConfirm={handleArchive}
      />
      <ArchiveWorkflowModal
        open={showArchiveWorkflow}
        onOpenChange={setShowArchiveWorkflow}
        steps={archiveSteps}
      />
    </div>
  );
}
