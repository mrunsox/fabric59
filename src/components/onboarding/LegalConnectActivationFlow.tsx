import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OnboardingContextHelper } from "./OnboardingContextHelper";
import { ReadinessScore } from "./ReadinessScore";
import { AIRecommendationCard } from "./AIRecommendationCard";
import { OnboardingMilestones, type Milestone } from "./OnboardingMilestones";
import {
  ArrowRight, ArrowLeft, Scale, Globe, Shield, Link2,
  CheckCircle, Settings2, TestTube, Loader2, Wifi, XCircle,
  FileJson, Workflow, Rocket,
} from "lucide-react";

type LCStep = "welcome" | "connect" | "map" | "variables" | "policies" | "test" | "review" | "activate";

const milestones: Milestone[] = [
  { key: "connect", label: "Connect CRM", description: "OAuth or API key setup", icon: Link2 },
  { key: "map", label: "Map Campaigns", description: "Five9 ↔ CRM mapping", icon: Workflow },
  { key: "variables", label: "Configure Variables", description: "Call vars & dispositions", icon: FileJson },
  { key: "policies", label: "Set Policies", description: "Data pass-through rules", icon: Shield },
  { key: "test", label: "Run Tests", description: "Validate connections", icon: TestTube },
  { key: "activate", label: "Activate", description: "Go live", icon: Rocket },
];

const stepToIndex = (step: LCStep): number => {
  const map: Record<LCStep, number> = { welcome: -1, connect: 0, map: 1, variables: 2, policies: 3, test: 4, review: 5, activate: 5 };
  return map[step];
};

interface LegalConnectActivationFlowProps {
  clientName?: string;
  crmType?: string;
  onComplete?: () => void;
  className?: string;
}

export function LegalConnectActivationFlow({
  clientName = "Client", crmType = "Clio", onComplete, className,
}: LegalConnectActivationFlowProps) {
  const [step, setStep] = useState<LCStep>("welcome");
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "passed" | "failed">("idle");
  const [policiesAccepted, setPoliciesAccepted] = useState(false);

  const steps: LCStep[] = ["welcome", "connect", "map", "variables", "policies", "test", "review", "activate"];
  const currentIndex = steps.indexOf(step);

  const next = () => setStep(steps[Math.min(currentIndex + 1, steps.length - 1)]);
  const prev = () => setStep(steps[Math.max(currentIndex - 1, 0)]);

  const runTests = () => {
    setTestStatus("running");
    setTimeout(() => setTestStatus("passed"), 2500);
  };

  return (
    <div className={cn("w-full max-w-4xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12 items-start", className)}>
      {/* Left rail */}
      {step !== "welcome" && (
        <div className="hidden lg:block w-56 flex-shrink-0 pt-4">
          <div className="mb-6">
            <p className="text-sm font-bold tracking-tight text-foreground">Legal Connect</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Activation</p>
          </div>
          <OnboardingMilestones milestones={milestones} currentIndex={stepToIndex(step)} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 max-w-lg w-full mx-auto lg:mx-0 animate-fade-in">
        {step === "welcome" && (
          <Card className="card-elevated border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 ring-4 ring-primary/5">
                  <Scale className="h-7 w-7 text-primary" />
                </div>
              </div>
              <CardTitle className="text-xl tracking-tight">Activate Legal Connect</CardTitle>
              <CardDescription>Connecting {crmType} for {clientName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground text-center">
                This will set up a live connection between Five9 and {crmType}, mapping campaigns, syncing contacts, and automating post-call workflows.
              </p>
              <Button onClick={next} className="w-full h-11">
                Begin Setup <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "connect" && (
          <Card className="card-elevated border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl tracking-tight">Connect {crmType}</CardTitle>
              <CardDescription>Authenticate with your CRM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <Button variant="outline" className="w-full h-11">
                <Link2 className="h-4 w-4 mr-2" /> Connect via OAuth
              </Button>
              <p className="text-xs text-center text-muted-foreground">Or enter API credentials manually</p>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input placeholder="Enter your API key" className="h-11" />
              </div>
              <OnboardingContextHelper title="Secure connection" description="Credentials are encrypted at rest and used only for authorized API calls between Five9 and your CRM." />
            </CardContent>
            <div className="px-6 pb-6 flex gap-2">
              <Button variant="outline" onClick={prev} className="flex-1 h-11"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={next} className="flex-1 h-11">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </Card>
        )}

        {step === "map" && (
          <Card className="card-elevated border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl tracking-tight">Map Campaigns</CardTitle>
              <CardDescription>Link Five9 campaigns to {crmType} workspaces</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Campaign mapping can be configured in detail from the mapping builder. For now, we'll set up basic routing.</p>
              <OnboardingContextHelper title="How mapping works" description="Each Five9 campaign is mapped to a CRM workspace or practice area. When a call comes in, the system knows which contact records and field mappings to use." />
            </CardContent>
            <div className="px-6 pb-6 flex gap-2">
              <Button variant="outline" onClick={prev} className="flex-1 h-11"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={next} className="flex-1 h-11">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </Card>
        )}

        {step === "variables" && (
          <Card className="card-elevated border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl tracking-tight">Configure Variables</CardTitle>
              <CardDescription>Set up call variables and disposition mapping</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <AIRecommendationCard
                title="Auto-mapped 12 call variables"
                reasoning={`Based on your ${crmType} schema, we've mapped standard fields like caller_name, phone, matter_id, and case_type to Five9 call variables.`}
                onAccept={() => {}}
                onCustomize={() => {}}
              />
              <OnboardingContextHelper title="What are call variables?" description="Call variables are data fields passed between Five9 and your CRM during calls. They populate agent screens and sync back after disposition." />
            </CardContent>
            <div className="px-6 pb-6 flex gap-2">
              <Button variant="outline" onClick={prev} className="flex-1 h-11"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={next} className="flex-1 h-11">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </Card>
        )}

        {step === "policies" && (
          <Card className="card-elevated border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl tracking-tight">Set Policies</CardTitle>
              <CardDescription>Configure data pass-through rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <AIRecommendationCard
                title="Recommended policy preset"
                reasoning="For legal clients: PII masking enabled, auto-sync on qualified dispositions, manual review for sensitive cases, 90-day retention."
                onAccept={() => setPoliciesAccepted(true)}
                onCustomize={() => {}}
                accepted={policiesAccepted}
              />
              <OnboardingContextHelper title="Policy impact" description="Policies control what data flows between systems. Strict policies protect sensitive information but may require more manual review." />
            </CardContent>
            <div className="px-6 pb-6 flex gap-2">
              <Button variant="outline" onClick={prev} className="flex-1 h-11"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={next} className="flex-1 h-11">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </Card>
        )}

        {step === "test" && (
          <Card className="card-elevated border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl ring-4",
                  testStatus === "passed" ? "bg-success/10 ring-success/10" :
                  testStatus === "failed" ? "bg-destructive/10 ring-destructive/5" :
                  testStatus === "running" ? "bg-primary/8 ring-primary/5" : "bg-muted/30 ring-border"
                )}>
                  {testStatus === "running" && <Loader2 className="h-7 w-7 text-primary animate-spin" />}
                  {testStatus === "passed" && <CheckCircle className="h-7 w-7 text-success" />}
                  {testStatus === "failed" && <XCircle className="h-7 w-7 text-destructive" />}
                  {testStatus === "idle" && <TestTube className="h-7 w-7 text-muted-foreground" />}
                </div>
              </div>
              <CardTitle className="text-xl tracking-tight">
                {testStatus === "idle" && "Run Connection Tests"}
                {testStatus === "running" && "Testing..."}
                {testStatus === "passed" && "All Tests Passed"}
                {testStatus === "failed" && "Tests Failed"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {testStatus === "idle" && (
                <Button onClick={runTests} className="w-full h-11">
                  <TestTube className="h-4 w-4 mr-2" /> Run Tests
                </Button>
              )}
              {testStatus === "running" && (
                <div className="flex items-center justify-center gap-3 py-4 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Validating connections...</span>
                </div>
              )}
              {testStatus === "passed" && (
                <div className="space-y-2">
                  {["CRM Authentication", "Webhook Endpoint", "Field Mapping", "Disposition Sync"].map((t) => (
                    <div key={t} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="px-6 pb-6 flex gap-2">
              <Button variant="outline" onClick={prev} className="flex-1 h-11"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={next} disabled={testStatus !== "passed"} className="flex-1 h-11">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </Card>
        )}

        {step === "review" && (
          <Card className="card-elevated border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl tracking-tight">Review Readiness</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ReadinessScore
                score={testStatus === "passed" ? (policiesAccepted ? 100 : 85) : 60}
                items={[
                  { label: `${crmType} connected`, complete: true },
                  { label: "Campaigns mapped", complete: true },
                  { label: "Variables configured", complete: true },
                  { label: "Policies set", complete: policiesAccepted },
                  { label: "Tests passed", complete: testStatus === "passed" },
                ]}
                blockers={testStatus !== "passed" ? ["Connection tests incomplete"] : []}
              />
            </CardContent>
            <div className="px-6 pb-6 flex gap-2">
              <Button variant="outline" onClick={prev} className="flex-1 h-11"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={next} className="flex-1 h-11">Proceed to Activate <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </Card>
        )}

        {step === "activate" && (
          <Card className="card-elevated border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 ring-4 ring-success/10">
                  <Rocket className="h-7 w-7 text-success" />
                </div>
              </div>
              <CardTitle className="text-xl tracking-tight">Legal Connect is Ready</CardTitle>
              <CardDescription>{crmType} integration for {clientName} is configured</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="rounded-xl bg-muted/20 border border-border/50 p-4 space-y-2">
                <h4 className="text-caption">What happens next</h4>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>• Incoming calls will sync contact data with {crmType}</li>
                  <li>• Dispositions will trigger configured CRM actions</li>
                  <li>• Webhook health will be monitored automatically</li>
                  <li>• Alerts will fire if sync failures are detected</li>
                </ul>
              </div>
              <Button onClick={onComplete} className="w-full h-11">
                <CheckCircle className="h-4 w-4 mr-2" /> Activate Legal Connect
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
