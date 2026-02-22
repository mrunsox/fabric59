import { useParams, Link } from "react-router-dom";
import { useCampaignSetup, useUpdateChecklist } from "@/hooks/useCampaignSetup";
import { CampaignChecklist } from "@/components/campaigns/CampaignChecklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, ArrowLeft } from "lucide-react";
import type { CampaignIntakeData } from "@/types/campaign";

export default function CampaignDetailPage() {
  const { id } = useParams();
  const { data: campaign, isLoading } = useCampaignSetup(id);
  const updateChecklist = useUpdateChecklist();

  if (isLoading) return <p className="text-muted-foreground p-6">Loading...</p>;
  if (!campaign) return <p className="text-muted-foreground p-6">Campaign not found.</p>;

  const intake = campaign.intake_data as CampaignIntakeData;
  const checklist = (campaign.checklist_state || {}) as Record<string, { done: boolean; blocked?: string }>;

  const handleToggle = (itemId: string, done: boolean) => {
    const updated = { ...checklist, [itemId]: { ...checklist[itemId], done } };
    updateChecklist.mutate({ id: campaign.id, checklistState: updated });
  };

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/admin/campaigns"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{campaign.campaign_name}</h1>
          <p className="text-sm text-muted-foreground">{campaign.client_name}</p>
        </div>
        <Badge variant="secondary">{campaign.status}</Badge>
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
            <CardHeader className="pb-2"><CardTitle className="text-sm">Phone Numbers & Routing</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Section title="ANIs">
                <p>{intake.aniNumbers?.filter(Boolean).join(", ") || "None"}</p>
              </Section>
              <Section title="DNIS">
                <p>{intake.dnisNumbers?.filter(Boolean).join(", ") || "None"}</p>
              </Section>
              <Field label="Transfer Display" value={intake.transferDisplayNumber} />
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
            <CardHeader className="pb-2"><CardTitle className="text-sm">Prompts</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="IVR Greeting" value={intake.ivrGreetingPrompt} />
              <Field label="Whisper" value={intake.whisperPrompt} />
              <Field label="Hold Music" value={intake.holdMusicPrompt} />
              <Field label="IVR Announcement" value={intake.ivrAnnouncementPrompt} />
              <Field label="VM Greeting" value={intake.vmGreetingType === "upload" ? `Upload: ${intake.vmGreetingFileUrl}` : intake.vmGreetingPrompt} />
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
    </div>
  );
}
