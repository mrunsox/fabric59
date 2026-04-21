import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Loader2, ArrowRight, Check, Globe, Building2, Building,
  Eye, EyeOff, Wifi, XCircle, CheckCircle, Users, Link2, Rocket,
} from "lucide-react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { SEOHead } from "@/components/seo/SEOHead";
import { OnboardingMilestones, type Milestone } from "@/components/onboarding/OnboardingMilestones";
import { OnboardingContextHelper } from "@/components/onboarding/OnboardingContextHelper";
import { ReadinessScore } from "@/components/onboarding/ReadinessScore";
import { toast } from "sonner";

type Step = "org" | "ownership" | "domain" | "testing" | "intent" | "tenant" | "complete";
type ConnectionStatus = "testing" | "success" | "failed";
type Intent = "provisioning" | "integration";
type OwnershipMode = "client" | "workspace";

const RESUME_KEY = "fabric59:onboarding:resumeStep";
const SKIPPABLE_STEPS: Step[] = ["ownership", "domain", "intent", "tenant"];

const milestones: Milestone[] = [
  { key: "org", label: "Organization", description: "Create your workspace", icon: Building },
  { key: "ownership", label: "Five9 Owner", description: "Who owns the Five9 account", icon: Users },
  { key: "domain", label: "Five9 Domain", description: "Connect your call center", icon: Globe },
  { key: "intent", label: "Setup Intent", description: "Choose your primary use case", icon: Rocket },
  { key: "tenant", label: "First Client", description: "Add your first client", icon: Building2 },
  { key: "complete", label: "Go Live", description: "Launch your command center", icon: CheckCircle },
];

const milestoneIndex = (step: Step): number => {
  const map: Record<Step, number> = { org: 0, ownership: 1, domain: 2, testing: 2, intent: 3, tenant: 4, complete: 5 };
  return map[step];
};

export default function OnboardingPage() {
  const { organization, user, isMasterAdmin } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(() => {
    const resume = typeof window !== "undefined" ? (localStorage.getItem(RESUME_KEY) as Step | null) : null;
    if (resume && organization) return resume;
    return organization ? "ownership" : "org";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [ownershipMode, setOwnershipMode] = useState<OwnershipMode | null>(null);
  const [domainDisplayName, setDomainDisplayName] = useState("");
  const [five9Username, setFive9Username] = useState("");
  const [five9Password, setFive9Password] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [createdDomainId, setCreatedDomainId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [crmType, setCrmType] = useState<"clio" | "workiz" | "salesforce" | "generic_rest" | "other">("other");
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (isMasterAdmin && !organization) navigate("/master", { replace: true });
  }, [isMasterAdmin, organization, navigate]);

  useEffect(() => {
    if (organization && step === "org") setStep("ownership");
  }, [organization, step]);

  // Persist current resumable step; clear once user reaches the end
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (step === "complete") {
      localStorage.removeItem(RESUME_KEY);
    } else if (SKIPPABLE_STEPS.includes(step)) {
      localStorage.setItem(RESUME_KEY, step);
    }
  }, [step]);

  const handleSkip = () => {
    if (typeof window !== "undefined") localStorage.setItem(RESUME_KEY, step);
    navigate("/admin");
  };

  const SkipFooter = () =>
    SKIPPABLE_STEPS.includes(step) ? (
      <div className="px-6 pb-5 -mt-2 text-center">
        <button type="button" onClick={handleSkip} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Skip for now — finish later from the dashboard
        </button>
      </div>
    ) : null;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getOrgId = () => createdOrgId || organization?.id;

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: org, error: orgError } = await supabase.from("organizations").insert({ name: orgName, billing_email: user.email }).select().single();
      if (orgError) throw orgError;
      const { error: memberError } = await supabase.from("organization_members").insert({ organization_id: org.id, user_id: user.id, role: "owner" });
      if (memberError) throw memberError;
      setCreatedOrgId(org.id);
      setStep("ownership");
      toast.success("Organization created!");
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to create organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const orgId = getOrgId();
    if (!orgId) { toast.error("Organization not found"); setIsSubmitting(false); return; }
    const derivedDomain = five9Username.includes("@") ? five9Username.split("@")[1] : domainDisplayName.toLowerCase().replace(/\s+/g, "-");
    try {
      const { data, error } = await supabase.from("five9_domains").insert({ organization_id: orgId, domain: derivedDomain, display_name: domainDisplayName, five9_username: five9Username, five9_password_encrypted: five9Password }).select().single();
      if (error) throw error;
      setCreatedDomainId(data.id);
      setStep("testing");
      setConnectionStatus("testing");
      setIsSubmitting(false);
      try {
        const { data: session } = await supabase.auth.getSession();
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-five9-connection`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.session?.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ domain_id: data.id }),
        });
        const result = await response.json();
        if (result.success) {
          setConnectionStatus("success");
          setConnectionMessage(result.message || "Successfully connected to Five9");
          setTimeout(() => setStep("intent"), 1800);
        } else {
          setConnectionStatus("failed");
          setConnectionMessage(result.message || "Authentication failed.");
        }
      } catch {
        setConnectionStatus("failed");
        setConnectionMessage("Could not reach Five9. Please check your credentials.");
      }
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to connect domain");
      setIsSubmitting(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const orgId = getOrgId();
    if (!orgId) { toast.error("Organization not found"); setIsSubmitting(false); return; }
    try {
      const { error } = await supabase.from("tenants").insert([{ name: tenantName, crm_type: crmType, organization_id: orgId, five9_domain_id: createdDomainId }]);
      if (error) throw error;
      setStep("complete");
      toast.success("First client added!");
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to add client");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => {
    if (intent === "provisioning") window.location.href = "/admin/agents";
    else if (intent === "integration") window.location.href = "/admin/mappings";
    else window.location.href = "/admin";
  };

  const stepContent: Record<Step, React.ReactNode> = {
    org: (
      <Card className="card-elevated border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 ring-4 ring-primary/5">
              <Building className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl tracking-tight">Create your organization</CardTitle>
          <CardDescription>This will be your workspace in Fabric59</CardDescription>
        </CardHeader>
        <form onSubmit={handleCreateOrg}>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input id="orgName" placeholder="Your Agency Name" value={orgName} onChange={(e) => setOrgName(e.target.value)} required className="h-11" />
            </div>
            <OnboardingContextHelper title="Why this matters" description="Your organization is the top-level container for all domains, clients, agents, and integrations. Choose a name that represents your business." />
          </CardContent>
          <div className="px-6 pb-6">
            <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Create Organization
            </Button>
          </div>
        </form>
      </Card>
    ),

    ownership: (
      <Card className="card-elevated border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 ring-4 ring-primary/5">
              <Users className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl tracking-tight">Who owns the Five9 account?</CardTitle>
          <CardDescription>This determines how Five9 connections and deployments are scoped.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <button type="button" onClick={() => setOwnershipMode("workspace")} className={cn(
            "w-full text-left rounded-xl border-2 p-4 transition-premium",
            ownershipMode === "workspace" ? "border-primary bg-primary/3 shadow-sm" : "border-border hover:border-primary/30 hover:bg-muted/10"
          )}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/8">
                <Building className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">This workspace / BPO</p>
                  {ownershipMode === "workspace" && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">One shared Five9 account. Clients are scoped by campaign, queue, DNIS, or call variables.</p>
              </div>
            </div>
          </button>
          <button type="button" onClick={() => setOwnershipMode("client")} className={cn(
            "w-full text-left rounded-xl border-2 p-4 transition-premium",
            ownershipMode === "client" ? "border-primary bg-primary/3 shadow-sm" : "border-border hover:border-primary/30 hover:bg-muted/10"
          )}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/8">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">Each client owns their Five9</p>
                  {ownershipMode === "client" && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Clients connect their own Five9 domain. Each client manages its own connection.</p>
              </div>
            </div>
          </button>
        </CardContent>
        <div className="px-6 pb-6">
          <Button
            className="w-full h-11"
            disabled={!ownershipMode || isSubmitting}
            onClick={async () => {
              const orgId = getOrgId();
              if (!orgId || !ownershipMode) return;
              setIsSubmitting(true);
              const { error } = await supabase
                .from("organizations")
                .update({ five9_ownership_mode: ownershipMode })
                .eq("id", orgId);
              setIsSubmitting(false);
              if (error) { toast.error(error.message); return; }
              setStep("domain");
            }}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
            Continue
          </Button>
        </div>
      </Card>
    ),

    domain: (
      <Card className="card-elevated border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 ring-4 ring-primary/5">
              <Globe className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl tracking-tight">Connect your Five9 Domain</CardTitle>
          <CardDescription>Sign in with your Five9 admin account</CardDescription>
        </CardHeader>
        <form onSubmit={handleCreateDomain}>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" placeholder="Main Call Center" value={domainDisplayName} onChange={(e) => setDomainDisplayName(e.target.value)} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="five9Username">Five9 Admin Username</Label>
              <Input id="five9Username" placeholder="admin@yourcompany.com" value={five9Username} onChange={(e) => setFive9Username(e.target.value)} autoComplete="username" required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="five9Password">Admin Password</Label>
              <div className="relative">
                <Input id="five9Password" type={showPassword ? "text" : "password"} placeholder="••••••••••••" value={five9Password} onChange={(e) => setFive9Password(e.target.value)} autoComplete="current-password" className="pr-10 h-11" required />
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            <OnboardingContextHelper title="Credential security" description="Your credentials are encrypted at rest and used only to sync agent skills, call variables, and dispositions. They are never stored in plain text." />
          </CardContent>
          <div className="px-6 pb-6">
            <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Connect Domain
            </Button>
          </div>
        </form>
      </Card>
    ),

    testing: (
      <Card className="card-elevated border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl ring-4",
              connectionStatus === "success" ? "bg-success/10 ring-success/10" :
              connectionStatus === "failed" ? "bg-destructive/10 ring-destructive/5" : "bg-primary/8 ring-primary/5"
            )}>
              {connectionStatus === "testing" && <Wifi className="h-7 w-7 text-primary animate-pulse" />}
              {connectionStatus === "success" && <CheckCircle className="h-7 w-7 text-success" />}
              {connectionStatus === "failed" && <XCircle className="h-7 w-7 text-destructive" />}
            </div>
          </div>
          <CardTitle className="text-xl tracking-tight">
            {connectionStatus === "testing" && "Verifying Connection"}
            {connectionStatus === "success" && "Connected!"}
            {connectionStatus === "failed" && "Connection Failed"}
          </CardTitle>
          <CardDescription>{connectionStatus === "testing" ? "Connecting to Five9…" : connectionMessage}</CardDescription>
        </CardHeader>
        <CardContent>
          {connectionStatus === "testing" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="space-y-1.5 w-full max-w-xs">
                {["Authenticating", "Verifying permissions", "Loading domain config"].map((t, i) => (
                  <div key={t} className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-up" style={{ animationDelay: `${i * 400}ms` }}>
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}
          {connectionStatus === "success" && (
            <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
              <span className="text-sm">Moving you forward…</span>
            </div>
          )}
          {connectionStatus === "failed" && (
            <div className="space-y-3 pt-2">
              <Button className="w-full h-11" onClick={() => { setConnectionStatus(null); setConnectionMessage(""); setStep("domain"); }}>Try Different Credentials</Button>
              <Button variant="outline" className="w-full h-11" onClick={() => setStep("intent")}>Continue Anyway</Button>
              <p className="text-xs text-center text-muted-foreground">You can update credentials later in Domain Settings.</p>
            </div>
          )}
        </CardContent>
      </Card>
    ),

    intent: (
      <Card className="card-elevated border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 ring-4 ring-primary/5">
              <Rocket className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl tracking-tight">What would you like to set up first?</CardTitle>
          <CardDescription>Choose your primary use case. You can always use both later.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <button type="button" onClick={() => setIntent("provisioning")} className={cn(
            "w-full text-left rounded-xl border-2 p-4 transition-premium",
            intent === "provisioning" ? "border-primary bg-primary/3 shadow-sm" : "border-border hover:border-primary/30 hover:bg-muted/10"
          )}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/8">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">Agent Provisioning</p>
                  {intent === "provisioning" && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Onboard and offboard call center agents automatically.</p>
              </div>
            </div>
          </button>
          <button type="button" onClick={() => setIntent("integration")} className={cn(
            "w-full text-left rounded-xl border-2 p-4 transition-premium",
            intent === "integration" ? "border-primary bg-primary/3 shadow-sm" : "border-border hover:border-primary/30 hover:bg-muted/10"
          )}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/8">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">CRM & Campaign Integration</p>
                  {intent === "integration" && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Connect CRMs to Five9 campaigns. Map fields and sync contacts.</p>
              </div>
            </div>
          </button>
          <OnboardingContextHelper title="What this determines" description="Your choice here sets your initial dashboard view and recommended next steps. You can always access all features from the sidebar." />
        </CardContent>
        <div className="px-6 pb-6">
          <Button className="w-full h-11" disabled={!intent} onClick={() => setStep("tenant")}>
            <ArrowRight className="mr-2 h-4 w-4" /> Continue
          </Button>
        </div>
      </Card>
    ),

    tenant: (
      <Card className="card-elevated border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 ring-4 ring-primary/5">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl tracking-tight">Add your first client</CardTitle>
          <CardDescription>Create your first tenant for this domain</CardDescription>
        </CardHeader>
        <form onSubmit={handleCreateTenant}>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="tenantName">Client Name</Label>
              <Input id="tenantName" placeholder="Law Firm Alpha" value={tenantName} onChange={(e) => setTenantName(e.target.value)} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crmType">CRM Type</Label>
              <select id="crmType" value={crmType} onChange={(e) => setCrmType(e.target.value as typeof crmType)} className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="clio">Clio</option>
                <option value="workiz">Workiz</option>
                <option value="salesforce">Salesforce</option>
                <option value="generic_rest">Generic REST API</option>
                <option value="other">Other / None</option>
              </select>
            </div>
            <OnboardingContextHelper title="CRM recommendation" description={intent === "integration" ? "Since you chose CRM integration, selecting the right CRM type ensures we load the correct field schemas and mapping templates." : "You can configure CRM connections later from the client overview page."} />
          </CardContent>
          <div className="px-6 pb-6 flex gap-2">
            <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setStep("complete")}>Skip</Button>
            <Button type="submit" className="flex-1 h-11" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Add Client
            </Button>
          </div>
        </form>
      </Card>
    ),

    complete: (
      <Card className="card-elevated border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 ring-4 ring-success/10">
              <Fabric59Icon size="lg" className="h-12 w-12" />
            </div>
          </div>
          <CardTitle className="text-xl tracking-tight">You're all set!</CardTitle>
          <CardDescription>Your Fabric59 account is ready to use</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <ReadinessScore
            score={tenantName ? 100 : 75}
            items={[
              { label: `Organization: ${orgName || organization?.name || "Configured"}`, complete: true },
              { label: `Domain: ${five9Username.includes("@") ? five9Username.split("@")[1] : domainDisplayName || "Configured"}`, complete: true },
              { label: `Intent: ${intent === "provisioning" ? "Agent Provisioning" : intent === "integration" ? "CRM Integration" : "Selected"}`, complete: !!intent },
              { label: `First client: ${tenantName || "Skipped"}`, complete: !!tenantName },
            ]}
            blockers={!tenantName ? ["No client configured. Add one from the dashboard."] : []}
          />
        </CardContent>
        <div className="px-6 pb-6 space-y-2">
          <Button onClick={handleComplete} className="w-full h-11">
            {intent === "provisioning" ? "Go to Agent Provisioning" : intent === "integration" ? "Go to Mapping Builder" : "Launch Dashboard"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {!tenantName && (
            <Button variant="outline" onClick={() => setStep("tenant")} className="w-full h-11">
              Add a Client First
            </Button>
          )}
        </div>
      </Card>
    ),
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEOHead title="Onboarding | Fabric59" description="Set up your Fabric59 account." noindex />
      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
        {/* Left rail — milestones */}
        <div className="hidden lg:block w-56 flex-shrink-0 pt-4">
          <div className="flex items-center gap-2.5 mb-8">
            <Fabric59Icon size="md" />
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">Fabric59</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Setup</p>
            </div>
          </div>
          <OnboardingMilestones milestones={milestones} currentIndex={milestoneIndex(step)} />
        </div>

        {/* Right — step content */}
        <div className="flex-1 max-w-lg w-full mx-auto lg:mx-0">
          {/* Mobile progress */}
          <div className="flex lg:hidden items-center justify-center gap-1.5 mb-6">
            {milestones.map((m, i) => (
              <div key={m.key} className={cn("h-1.5 rounded-full transition-all", i <= milestoneIndex(step) ? "w-8 bg-primary" : "w-4 bg-muted")} />
            ))}
          </div>

          <div className="animate-fade-up">
            {stepContent[step]}
            <SkipFooter />
          </div>
        </div>
      </div>
    </div>
  );
}
