import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OnboardingContextHelper } from "./OnboardingContextHelper";
import { ReadinessScore } from "./ReadinessScore";
import { AIRecommendationCard } from "./AIRecommendationCard";
import {
  ArrowRight, ArrowLeft, Building2, Globe, Shield, Link2,
  CheckCircle, Users, Briefcase, Loader2,
} from "lucide-react";

type ClientStep = "welcome" | "profile" | "crm" | "campaign" | "policy" | "review";

const CRM_OPTIONS = [
  { id: "clio", name: "Clio", description: "Legal practice management" },
  { id: "mycase", name: "MyCase", description: "Case management" },
  { id: "salesforce", name: "Salesforce", description: "Enterprise CRM platform" },
  { id: "generic_rest", name: "Generic REST", description: "Custom API integration" },
  { id: "other", name: "Other / None", description: "Configure later" },
];

interface ClientOnboardingFlowProps {
  partnerName?: string;
  onComplete?: (data: { name: string; crm: string; vertical: string }) => void;
  className?: string;
}

export function ClientOnboardingFlow({ partnerName = "Your Partner", onComplete, className }: ClientOnboardingFlowProps) {
  const [step, setStep] = useState<ClientStep>("welcome");
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [crm, setCrm] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);

  const steps: ClientStep[] = ["welcome", "profile", "crm", "campaign", "policy", "review"];
  const currentIndex = steps.indexOf(step);

  const next = () => setStep(steps[Math.min(currentIndex + 1, steps.length - 1)]);
  const prev = () => setStep(steps[Math.max(currentIndex - 1, 0)]);

  return (
    <div className={cn("max-w-2xl mx-auto space-y-6", className)}>
      {/* Progress */}
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className={cn("h-1 rounded-full flex-1 transition-all", i <= currentIndex ? "bg-primary" : "bg-muted")} />
        ))}
      </div>

      {step === "welcome" && (
        <Card className="card-elevated border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 ring-4 ring-primary/5">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl tracking-tight">Add a New Client</CardTitle>
            <CardDescription>Setting up under {partnerName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground text-center">
              This wizard will guide you through configuring a new client with CRM integration, campaign routing, and data policies.
            </p>
            <Button onClick={next} className="w-full h-11">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "profile" && (
        <Card className="card-elevated border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl tracking-tight">Client Profile</CardTitle>
            <CardDescription>Basic information about the client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input placeholder="Smith & Associates" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Industry / Vertical</Label>
              <Input placeholder="e.g. Legal, Medical, Property Management" value={vertical} onChange={(e) => setVertical(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Team Size</Label>
              <Input placeholder="e.g., 5-10 agents" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className="h-11" />
            </div>
            <OnboardingContextHelper title="Why this matters" description="Industry helps us recommend default dispositions, call workflows, and field mappings that match your client's operation." />
          </CardContent>
          <div className="px-6 pb-6 flex gap-2">
            <Button variant="outline" onClick={prev} className="flex-1 h-11"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <Button onClick={next} disabled={!name} className="flex-1 h-11">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      {step === "crm" && (
        <Card className="card-elevated border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl tracking-tight">Select CRM</CardTitle>
            <CardDescription>Which CRM does this client use?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            {CRM_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCrm(opt.id)}
                className={cn(
                  "w-full text-left rounded-xl border-2 p-4 transition-premium",
                  crm === opt.id ? "border-primary bg-primary/3 shadow-sm" : "border-border hover:border-primary/30 hover:bg-muted/10"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{opt.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                  {crm === opt.id && <CheckCircle className="h-4 w-4 text-primary" />}
                </div>
              </button>
            ))}
            {crm === "clio" && (
              <AIRecommendationCard
                title="Recommended: Clio Legal Connect"
                reasoning="Based on the legal vertical, Clio integration provides the best contact/matter sync, intake automation, and disposition mapping."
              />
            )}
          </CardContent>
          <div className="px-6 pb-6 flex gap-2">
            <Button variant="outline" onClick={prev} className="flex-1 h-11"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <Button onClick={next} disabled={!crm} className="flex-1 h-11">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      {step === "campaign" && (
        <Card className="card-elevated border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl tracking-tight">Campaign Ownership</CardTitle>
            <CardDescription>Assign Five9 campaigns to this client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Campaign assignment can be configured after setup. You can skip this step and assign campaigns from the client overview.</p>
            <OnboardingContextHelper title="How campaigns work" description="Each client can be assigned specific Five9 campaigns and DNIS numbers. When calls come in matching these routes, the system automatically loads the right scripts and field mappings." />
          </CardContent>
          <div className="px-6 pb-6 flex gap-2">
            <Button variant="outline" onClick={prev} className="flex-1 h-11"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <Button onClick={next} className="flex-1 h-11">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      {step === "policy" && (
        <Card className="card-elevated border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl tracking-tight">Policy Defaults</CardTitle>
            <CardDescription>Configure data handling and pass-through policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <AIRecommendationCard
              title="Safe defaults applied"
              reasoning={`For ${vertical || "legal"} clients using ${crm || "CRM"}, we recommend: PII masking enabled, contact sync on disposition, and call recording retention of 90 days.`}
              onAccept={() => setPolicyAccepted(true)}
              onCustomize={() => {}}
              accepted={policyAccepted}
            />
            <OnboardingContextHelper title="What policies control" description="Policies determine which call data gets pushed to the CRM, how sensitive fields are handled, and what happens after each call disposition." />
          </CardContent>
          <div className="px-6 pb-6 flex gap-2">
            <Button variant="outline" onClick={prev} className="flex-1 h-11"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <Button onClick={next} className="flex-1 h-11">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      {step === "review" && (
        <Card className="card-elevated border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl tracking-tight">Review & Create</CardTitle>
            <CardDescription>Confirm your client setup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <ReadinessScore
              score={name && crm ? 100 : name ? 75 : 50}
              items={[
                { label: `Client: ${name || "Not set"}`, complete: !!name },
                { label: `Vertical: ${vertical || "Not set"}`, complete: !!vertical },
                { label: `CRM: ${CRM_OPTIONS.find(o => o.id === crm)?.name || "Not selected"}`, complete: !!crm },
                { label: "Campaign assignment", complete: false },
                { label: "Policy defaults", complete: policyAccepted },
              ]}
            />
          </CardContent>
          <div className="px-6 pb-6 flex gap-2">
            <Button variant="outline" onClick={prev} className="flex-1 h-11"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <Button onClick={() => onComplete?.({ name, crm, vertical })} disabled={!name} className="flex-1 h-11">
              Create Client <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
