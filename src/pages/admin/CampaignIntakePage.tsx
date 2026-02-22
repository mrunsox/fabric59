import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiInput } from "@/components/campaigns/MultiInput";
import { PromptSelector } from "@/components/campaigns/PromptSelector";
import { DecisionTreeBuilder } from "@/components/campaigns/DecisionTreeBuilder";
import { useSaveCampaignSetup, useCampaignSetup, useFive9Prompts, useFive9Dispositions } from "@/hooks/useCampaignSetup";
import { useAuth } from "@/contexts/AuthContext";
import { useDomains } from "@/hooks/useDomains";
import { DEFAULT_CHECKLIST } from "@/types/campaign";
import type { CampaignIntakeData } from "@/types/campaign";
import { toast } from "sonner";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, CheckCircle2, CalendarIcon, Save, Rocket } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const emptyIntake: CampaignIntakeData = {
  campaignName: "",
  clientName: "",
  campaignDescription: "",
  whiteLabel: false,
  aniNumbers: [""],
  dnisNumbers: [""],
  transferDisplayNumber: "",
  coverageType: "24/7",
  weekdayStart: "08:00",
  weekdayEnd: "20:00",
  weekendStart: "09:00",
  weekendEnd: "17:00",
  noWeekendCoverage: false,
  afterHoursHandling: "vm",
  afterHoursTransferNumber: "",
  ivrGreetingPrompt: "",
  whisperPrompt: "",
  holdMusicPrompt: "",
  ivrAnnouncementPrompt: "",
  vmGreetingType: "existing",
  vmGreetingPrompt: "",
  vmGreetingFileUrl: "",
  existingDispositions: [],
  newDispositions: [],
  enableDispositionEmail: false,
  emailTemplateName: "",
  emailRecipients: "",
  emailReplyTo: "",
  emailFrom: "",
  dispositionMenuGrouping: "",
  backendDocConnector: false,
  backendDocUrl: "",
  websiteConnectorUrl: "",
  scriptConnectorName: "",
  decisionTree: [],
  skillName: "",
  assignedUsers: [],
  addSkillToIvr: false,
  additionalNotes: "",
  priority: "normal",
  targetGoLive: "",
};

export default function CampaignIntakePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const { data: existing } = useCampaignSetup(id);
  const { data: prompts = [], isLoading: promptsLoading } = useFive9Prompts();
  const { data: dispositions = [], isLoading: dispoLoading } = useFive9Dispositions();
  const { data: domains = [] } = useDomains();
  const saveMutation = useSaveCampaignSetup();

  const [intake, setIntake] = useState<CampaignIntakeData>(emptyIntake);
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({
    1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true,
  });

  useEffect(() => {
    if (existing) {
      setIntake(existing.intake_data);
      setSelectedDomainId(existing.five9_domain_id || "");
    }
  }, [existing]);

  // Auto-suggest skill name from campaign name
  useEffect(() => {
    if (!intake.skillName && intake.campaignName) {
      setIntake((prev) => ({ ...prev, skillName: prev.campaignName }));
    }
  }, [intake.campaignName]);

  const update = useCallback((patch: Partial<CampaignIntakeData>) => {
    setIntake((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleSection = (num: number) => {
    setOpenSections((prev) => ({ ...prev, [num]: !prev[num] }));
  };

  const isSectionComplete = (num: number): boolean => {
    switch (num) {
      case 1: return !!(intake.campaignName && intake.clientName);
      case 2: return intake.aniNumbers.some(Boolean) || intake.dnisNumbers.some(Boolean);
      case 3: return true;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      case 7: return true;
      case 8: return !!intake.skillName;
      case 9: return true;
      default: return false;
    }
  };

  const buildChecklist = () => {
    const state: Record<string, { done: boolean; blocked?: string }> = {};
    DEFAULT_CHECKLIST.forEach((item) => {
      state[item.id] = { done: item.done, blocked: item.blocked };
    });
    // Pre-fill from intake
    if (intake.whiteLabel) state["imp_wl"] = { done: true };
    if (intake.vmGreetingPrompt || intake.vmGreetingFileUrl) state["imp_vm"] = { done: true };
    return state;
  };

  const handleSave = async (status: "draft" | "submitted") => {
    if (!intake.campaignName || !intake.clientName) {
      toast.error("Campaign Name and Client Name are required.");
      return;
    }
    try {
      const result = await saveMutation.mutateAsync({
        id: id,
        campaignName: intake.campaignName,
        clientName: intake.clientName,
        intakeData: intake,
        checklistState: buildChecklist(),
        status,
        notes: intake.additionalNotes,
        priority: intake.priority,
        targetGoLive: intake.targetGoLive || undefined,
        fiveDomainId: selectedDomainId || undefined,
      });
      toast.success(status === "draft" ? "Draft saved!" : "Campaign submitted!");
      navigate(`/admin/campaigns/${(result as any).id}`);
    } catch (e) {
      // toast handled by hook
    }
  };

  const SectionHeader = ({ num, title, desc }: { num: number; title: string; desc: string }) => (
    <CollapsibleTrigger className="flex items-center gap-3 w-full text-left py-2" onClick={() => toggleSection(num)}>
      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
        {isSectionComplete(num) ? <CheckCircle2 className="h-4 w-4 text-success" /> : num}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground truncate">{desc}</p>
      </div>
      {openSections[num] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </CollapsibleTrigger>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{id ? "Edit Campaign Setup" : "New Campaign Setup"}</h1>
          <p className="text-sm text-muted-foreground">Fill out each section to build the campaign. Save as draft anytime.</p>
        </div>
      </div>

      {/* Domain selector */}
      {domains.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <Label className="text-sm font-medium mb-1.5 block">Five9 Domain</Label>
            <Select value={selectedDomainId || "__none__"} onValueChange={(v) => setSelectedDomainId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select domain" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {domains.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Section 1: Basics */}
      <Card>
        <Collapsible open={openSections[1]}>
          <CardHeader className="pb-2">
            <SectionHeader num={1} title="Campaign Basics" desc="Name, client, and type" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Campaign Name *</Label>
                  <Input value={intake.campaignName} onChange={(e) => update({ campaignName: e.target.value })} placeholder="e.g. Alberta Driving Consultants" />
                </div>
                <div className="space-y-1.5">
                  <Label>Client Name *</Label>
                  <Input value={intake.clientName} onChange={(e) => update({ clientName: e.target.value })} placeholder="New client name" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={intake.campaignDescription} onChange={(e) => update({ campaignDescription: e.target.value })} placeholder="Brief description of the campaign" rows={2} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={intake.whiteLabel} onCheckedChange={(v) => update({ whiteLabel: v })} />
                <Label className="cursor-pointer">White-Label Partner</Label>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Section 2: Phone Numbers */}
      <Card>
        <Collapsible open={openSections[2]}>
          <CardHeader className="pb-2">
            <SectionHeader num={2} title="Phone Numbers & Routing" desc="ANIs, DNIS, and transfer display" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>ANI / Caller ID Numbers</Label>
                <MultiInput values={intake.aniNumbers} onChange={(v) => update({ aniNumbers: v })} placeholder="e.g. +14035551234" />
              </div>
              <div className="space-y-1.5">
                <Label>DNIS Numbers</Label>
                <MultiInput values={intake.dnisNumbers} onChange={(v) => update({ dnisNumbers: v })} placeholder="e.g. +18005551234" helperText="US customers get US numbers, CA customers get CA numbers" />
              </div>
              <div className="space-y-1.5">
                <Label>Transfer Display Number</Label>
                <Input value={intake.transferDisplayNumber} onChange={(e) => update({ transferDisplayNumber: e.target.value })} placeholder="Number shown to recipient during transfer" />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Section 3: Schedule */}
      <Card>
        <Collapsible open={openSections[3]}>
          <CardHeader className="pb-2">
            <SectionHeader num={3} title="Schedule & Coverage" desc="Hours of operation and after-hours handling" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <RadioGroup value={intake.coverageType} onValueChange={(v: "24/7" | "scheduled") => update({ coverageType: v })} className="flex gap-4">
                <div className="flex items-center gap-2"><RadioGroupItem value="24/7" id="c247" /><Label htmlFor="c247">24/7</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="scheduled" id="csched" /><Label htmlFor="csched">Scheduled</Label></div>
              </RadioGroup>

              {intake.coverageType === "scheduled" && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Weekday Start</Label>
                      <Input type="time" value={intake.weekdayStart} onChange={(e) => update({ weekdayStart: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Weekday End</Label>
                      <Input type="time" value={intake.weekdayEnd} onChange={(e) => update({ weekdayEnd: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={intake.noWeekendCoverage} onCheckedChange={(v) => update({ noWeekendCoverage: v })} />
                    <Label>No weekend coverage</Label>
                  </div>
                  {!intake.noWeekendCoverage && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Weekend Start</Label>
                        <Input type="time" value={intake.weekendStart} onChange={(e) => update({ weekendStart: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Weekend End</Label>
                        <Input type="time" value={intake.weekendEnd} onChange={(e) => update({ weekendEnd: e.target.value })} />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>After-Hours Handling</Label>
                    <RadioGroup value={intake.afterHoursHandling} onValueChange={(v: any) => update({ afterHoursHandling: v })} className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2"><RadioGroupItem value="vm" id="ah_vm" /><Label htmlFor="ah_vm">Voicemail</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="overflow" id="ah_of" /><Label htmlFor="ah_of">Overflow Queue</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="disconnect" id="ah_dc" /><Label htmlFor="ah_dc">Disconnect</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="transfer" id="ah_tr" /><Label htmlFor="ah_tr">Transfer to External</Label></div>
                    </RadioGroup>
                    {intake.afterHoursHandling === "transfer" && (
                      <Input value={intake.afterHoursTransferNumber} onChange={(e) => update({ afterHoursTransferNumber: e.target.value })} placeholder="External transfer number" className="mt-2" />
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Section 4: Prompts */}
      <Card>
        <Collapsible open={openSections[4]}>
          <CardHeader className="pb-2">
            <SectionHeader num={4} title="Prompts" desc="Select existing prompts from your Five9 domain" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">These are the prompts already configured on your Five9 domain. Select the appropriate prompt for each section.</p>
              <PromptSelector label="IVR Greeting" value={intake.ivrGreetingPrompt || ""} onChange={(v) => update({ ivrGreetingPrompt: v })} prompts={prompts} loading={promptsLoading} />
              <PromptSelector label="Whisper Prompt" value={intake.whisperPrompt || ""} onChange={(v) => update({ whisperPrompt: v })} prompts={prompts} loading={promptsLoading} />
              <PromptSelector label="Hold Music" value={intake.holdMusicPrompt || ""} onChange={(v) => update({ holdMusicPrompt: v })} prompts={prompts} loading={promptsLoading} />
              <PromptSelector label="IVR Hold/Announcement Message" value={intake.ivrAnnouncementPrompt || ""} onChange={(v) => update({ ivrAnnouncementPrompt: v })} prompts={prompts} loading={promptsLoading} />
              <div className="space-y-2">
                <Label>VM Greeting</Label>
                <RadioGroup value={intake.vmGreetingType} onValueChange={(v: "existing" | "upload") => update({ vmGreetingType: v })} className="flex gap-4">
                  <div className="flex items-center gap-2"><RadioGroupItem value="existing" id="vm_ex" /><Label htmlFor="vm_ex">Select existing</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="upload" id="vm_up" /><Label htmlFor="vm_up">Upload custom</Label></div>
                </RadioGroup>
                {intake.vmGreetingType === "existing" ? (
                  <PromptSelector value={intake.vmGreetingPrompt || ""} onChange={(v) => update({ vmGreetingPrompt: v })} prompts={prompts} loading={promptsLoading} />
                ) : (
                  <Input type="file" accept="audio/*" onChange={(e) => {
                    // File upload handled on save
                    const file = e.target.files?.[0];
                    if (file) update({ vmGreetingFileUrl: file.name });
                  }} />
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Section 5: Dispositions */}
      <Card>
        <Collapsible open={openSections[5]}>
          <CardHeader className="pb-2">
            <SectionHeader num={5} title="Dispositions" desc="Select or create dispositions for this campaign" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Existing Dispositions</Label>
                {dispoLoading ? (
                  <p className="text-sm text-muted-foreground">Loading dispositions...</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {dispositions.map((d) => (
                      <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={intake.existingDispositions.includes(d)}
                          onCheckedChange={(checked) => {
                            if (checked) update({ existingDispositions: [...intake.existingDispositions, d] });
                            else update({ existingDispositions: intake.existingDispositions.filter((x) => x !== d) });
                          }}
                        />
                        <span className="truncate">{d}</span>
                      </label>
                    ))}
                    {dispositions.length === 0 && <p className="text-xs text-muted-foreground col-span-full">No dispositions found on domain</p>}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>New Dispositions</Label>
                <Input
                  value={intake.newDispositions.join(", ")}
                  onChange={(e) => update({ newDispositions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Comma-separated, e.g. Callback, Transfer Complete, No Answer"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={intake.enableDispositionEmail} onCheckedChange={(v) => update({ enableDispositionEmail: v })} />
                <Label>Enable Disposition Email</Label>
              </div>
              {intake.enableDispositionEmail && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4 border-l-2 border-muted">
                  <div className="space-y-1.5"><Label>Email Template</Label><Input value={intake.emailTemplateName} onChange={(e) => update({ emailTemplateName: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Recipients</Label><Input value={intake.emailRecipients} onChange={(e) => update({ emailRecipients: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Reply-To</Label><Input value={intake.emailReplyTo} onChange={(e) => update({ emailReplyTo: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>From</Label><Input value={intake.emailFrom} onChange={(e) => update({ emailFrom: e.target.value })} /></div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Disposition Menu Grouping</Label>
                <Input value={intake.dispositionMenuGrouping} onChange={(e) => update({ dispositionMenuGrouping: e.target.value })} placeholder="Optional group name" />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Section 6: Connectors */}
      <Card>
        <Collapsible open={openSections[6]}>
          <CardHeader className="pb-2">
            <SectionHeader num={6} title="Connectors & Scripts" desc="Link external resources to the campaign" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Connectors link external resources to the campaign for agent reference.</p>
              <div className="flex items-center gap-3">
                <Switch checked={intake.backendDocConnector} onCheckedChange={(v) => update({ backendDocConnector: v })} />
                <Label>Backend Document Connector</Label>
              </div>
              {intake.backendDocConnector && (
                <Input value={intake.backendDocUrl} onChange={(e) => update({ backendDocUrl: e.target.value })} placeholder="Document connector URL" />
              )}
              <div className="space-y-1.5">
                <Label>Website Connector URL</Label>
                <Input value={intake.websiteConnectorUrl} onChange={(e) => update({ websiteConnectorUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label>Script Connector</Label>
                <Input value={intake.scriptConnectorName} onChange={(e) => update({ scriptConnectorName: e.target.value })} placeholder="Script name or URL" />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Section 7: Decision Tree */}
      <Card>
        <Collapsible open={openSections[7]}>
          <CardHeader className="pb-2">
            <SectionHeader num={7} title="Agent Decision Tree" desc="Build the step-by-step script for agents" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <DecisionTreeBuilder nodes={intake.decisionTree} onChange={(nodes) => update({ decisionTree: nodes })} />
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Section 8: Skill & Users */}
      <Card>
        <Collapsible open={openSections[8]}>
          <CardHeader className="pb-2">
            <SectionHeader num={8} title="Skill & User Assignment" desc="Create skill and assign agents" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Skill Name *</Label>
                <Input value={intake.skillName} onChange={(e) => update({ skillName: e.target.value })} placeholder="Auto-suggested from campaign name" />
              </div>
              <div className="space-y-1.5">
                <Label>Assign Users</Label>
                <Textarea value={intake.assignedUsers.join(", ")} onChange={(e) => update({ assignedUsers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="Comma-separated Five9 usernames" rows={2} />
                <p className="text-xs text-muted-foreground">Enter Five9 usernames separated by commas</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={intake.addSkillToIvr} onCheckedChange={(v) => update({ addSkillToIvr: v })} />
                <Label>Add Skill to IVR Routing</Label>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Section 9: Final Notes */}
      <Card>
        <Collapsible open={openSections[9]}>
          <CardHeader className="pb-2">
            <SectionHeader num={9} title="Final Notes" desc="Priority, go-live date, and additional notes" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Additional Notes</Label>
                <Textarea value={intake.additionalNotes} onChange={(e) => update({ additionalNotes: e.target.value })} placeholder="Anything not covered above..." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <RadioGroup value={intake.priority} onValueChange={(v: "normal" | "urgent") => update({ priority: v })} className="flex gap-4">
                  <div className="flex items-center gap-2"><RadioGroupItem value="normal" id="p_n" /><Label htmlFor="p_n">Normal</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="urgent" id="p_u" /><Label htmlFor="p_u">Urgent</Label></div>
                </RadioGroup>
              </div>
              <div className="space-y-1.5">
                <Label>Target Go-Live Date</Label>
                <Input type="date" value={intake.targetGoLive} onChange={(e) => update({ targetGoLive: e.target.value })} />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Footer buttons */}
      <div className="flex gap-3 justify-end pb-8">
        <Button variant="outline" onClick={() => handleSave("draft")} disabled={saveMutation.isPending} className="gap-2">
          <Save className="h-4 w-4" /> Save as Draft
        </Button>
        <Button onClick={() => handleSave("submitted")} disabled={saveMutation.isPending} className="gap-2">
          <Rocket className="h-4 w-4" /> Submit & Build
        </Button>
      </div>
    </div>
  );
}
