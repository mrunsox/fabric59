import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Loader2, ArrowRight, Check, Globe, Building2, Building,
  Eye, EyeOff, CheckCircle, Users, Rocket, Sparkles, ShieldCheck,
  HeadphonesIcon, LineChart, Workflow, PhoneIncoming,
} from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { OnboardingContextHelper } from "@/components/onboarding/OnboardingContextHelper";
import { toast } from "sonner";

/**
 * Phase G — Premium concierge onboarding (4 steps).
 *
 * Replaces the legacy 6-step provisioning flow with a role-aware concierge
 * that bootstraps a canonical workspace inline and lands the user at
 * /app/workspaces/:id/home on first run. /admin is never the first
 * destination for a new operator.
 *
 * Steps:
 *   1. Organization — create or confirm the operating tenant.
 *   2. Operating profile — role + ownership + primary motion.
 *   3. Connect Five9 — optional credential capture (skippable).
 *   4. Land workspace — bootstrap default workspace + enter /app/workspaces/:id/home.
 */

type Step = "org" | "profile" | "telephony" | "land";

type OwnershipMode = "workspace" | "client";
type Role = "ops_leader" | "supervisor" | "implementation" | "intake_owner";
type Motion = "intake" | "reactivation" | "qa" | "sync" | "monitoring";

const RESUME_KEY = "fabric59:onboarding:step";

const STEP_DEFS = [
  { key: "org", label: "Organization", description: "Name your operating tenant" },
  { key: "profile", label: "Operating profile", description: "Role, ownership, primary motion" },
  { key: "telephony", label: "Connect Five9", description: "Optional — connect later from settings" },
  { key: "land", label: "Land workspace", description: "Enter your canonical workspace" },
] as const;

const STEP_HEADINGS: Record<Step, { heading: string; subheading: string }> = {
  org: {
    heading: "Name your organization",
    subheading: "Your operating tenant — owns workspaces, clients, integrations, and reporting.",
  },
  profile: {
    heading: "Tell us how you operate",
    subheading: "Your role, telephony ownership, and the motion you want to land first. We tailor your workspace home to match.",
  },
  telephony: {
    heading: "Connect Five9",
    subheading: "Drop in admin credentials now or skip — your concierge can wire this up with you later.",
  },
  land: {
    heading: "Land your workspace",
    subheading: "Workspaces are the canonical operating boundary — clients, scripts, integrations, QA, and analytics live here.",
  },
};

const ROLES: Array<{ key: Role; label: string; helper: string; icon: typeof Users }> = [
  { key: "ops_leader", label: "Operations leader", helper: "Owns service-ops outcomes across clients and motions.", icon: LineChart },
  { key: "supervisor", label: "Supervisor", helper: "Runs the floor — QA, coaching, intraday performance.", icon: HeadphonesIcon },
  { key: "implementation", label: "Implementation / admin", helper: "Sets up integrations, scripts, and routing.", icon: Workflow },
  { key: "intake_owner", label: "Intake / service-ops owner", helper: "Owns inbound capture and post-call automations.", icon: PhoneIncoming },
];

const MOTIONS: Array<{ key: Motion; label: string; helper: string }> = [
  { key: "intake", label: "Inbound intake", helper: "Pre-call lookups, screen pops, intake worksheets." },
  { key: "reactivation", label: "Reactivation campaigns", helper: "Outbound list orchestration with disposition routing." },
  { key: "qa", label: "QA & performance", helper: "Scoring, coaching, and consolidated reporting." },
  { key: "sync", label: "CRM sync & automation", helper: "Adapter mappings, post-call writebacks, webhooks." },
  { key: "monitoring", label: "Monitoring & reconciliation", helper: "Telephony reconciliation, alerting, runbooks." },
];

export default function OnboardingPage() {
  const { organization, user, isMasterAdmin } = useAuth();
  const { workspaces, refetch: refetchWorkspaces } = useWorkspace();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(() => {
    const resume = typeof window !== "undefined" ? (localStorage.getItem(RESUME_KEY) as Step | null) : null;
    if (resume && organization) return resume;
    return organization ? "profile" : "org";
  });
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [orgName, setOrgName] = useState("");
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);
  // Step 2
  const [role, setRole] = useState<Role | null>(null);
  const [ownershipMode, setOwnershipMode] = useState<OwnershipMode | null>(null);
  const [motion, setMotion] = useState<Motion | null>(null);
  // Step 3
  const [domainDisplayName, setDomainDisplayName] = useState("");
  const [five9Username, setFive9Username] = useState("");
  const [five9Password, setFive9Password] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Step 4
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => {
    if (isMasterAdmin && !organization) navigate("/superadmin", { replace: true });
  }, [isMasterAdmin, organization, navigate]);

  useEffect(() => {
    if (organization && step === "org") setStep("profile");
  }, [organization, step]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (step === "land") localStorage.removeItem(RESUME_KEY);
    else localStorage.setItem(RESUME_KEY, step);
  }, [step]);

  useEffect(() => {
    if (!workspaceName && organization?.name) setWorkspaceName(`${organization.name} workspace`);
  }, [organization?.name, workspaceName]);

  const milestoneIndex = useMemo(() => {
    const map: Record<Step, number> = { org: 0, profile: 1, telephony: 2, land: 3 };
    return map[step];
  }, [step]);

  const orgId = createdOrgId || organization?.id || null;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: org, error } = await supabase
        .from("organizations")
        .insert({ name: orgName, billing_email: user.email })
        .select()
        .single();
      if (error) throw error;
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({ organization_id: org.id, user_id: user.id, role: "owner" });
      if (memberError) throw memberError;
      setCreatedOrgId(org.id);
      toast.success("Organization created");
      setStep("profile");
    } catch (err) {
      toast.error((err as Error).message || "Could not create organization");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!orgId || !ownershipMode || !role || !motion) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ five9_ownership_mode: ownershipMode })
        .eq("id", orgId);
      if (error) throw error;
      // Persist concierge picks locally so the workspace home can react to them.
      if (typeof window !== "undefined") {
        localStorage.setItem("fabric59:onboarding:profile", JSON.stringify({ role, motion, ownershipMode }));
      }
      setStep("telephony");
    } catch (err) {
      toast.error((err as Error).message || "Could not save profile");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConnectFive9 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setSubmitting(true);
    try {
      const derivedDomain = five9Username.includes("@")
        ? five9Username.split("@")[1]
        : domainDisplayName.toLowerCase().replace(/\s+/g, "-");
      const { error } = await supabase.from("five9_domains").insert({
        organization_id: orgId,
        domain: derivedDomain,
        display_name: domainDisplayName,
        five9_username: five9Username,
        five9_password_encrypted: five9Password,
      });
      if (error) throw error;
      toast.success("Five9 domain saved — we'll verify in the background.");
      setStep("land");
    } catch (err) {
      toast.error((err as Error).message || "Could not save Five9 domain");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLandWorkspace = async () => {
    if (!orgId) {
      toast.error("Finish the organization step first.");
      setStep("org");
      return;
    }
    setSubmitting(true);
    try {
      const existing =
        workspaces.find((w) => w.organization_id === orgId && w.is_default) ??
        workspaces.find((w) => w.organization_id === orgId);
      let targetId = existing?.id ?? null;
      if (!targetId) {
        const { data, error } = await supabase
          .from("workspaces")
          .insert({
            organization_id: orgId,
            name: workspaceName.trim() || `${organization?.name ?? "Main"} workspace`,
            is_default: true,
          })
          .select("id")
          .single();
        if (error) throw error;
        targetId = data.id;
        await refetchWorkspaces();
      }
      toast.success("Workspace ready");
      navigate(`/app/workspaces/${targetId}/home`, { replace: true });
    } catch (err) {
      toast.error((err as Error).message || "Could not bootstrap workspace");
    } finally {
      setSubmitting(false);
    }
  };

  // Per-step bodies render inside OnboardingShell — no per-card heading.


  const stepContent: Record<Step, React.ReactNode> = {
    org: (
      <Card className="card-elevated border-0 shadow-lg">
        {stepHeader(
          <Building className="h-7 w-7 text-primary" />,
          "Name your organization",
          "Your operating tenant — owns workspaces, clients, integrations, and reporting.",
        )}
        <form onSubmit={handleCreateOrg}>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization name</Label>
              <Input
                id="orgName"
                placeholder="Your agency or service-ops team"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <OnboardingContextHelper
              title="Concierge setup"
              description="A Fabric59 implementation specialist will follow up after you finish to validate adapters, mappings, and disposition routing before you go live."
            />
          </CardContent>
          <div className="px-6 pb-6">
            <Button type="submit" className="w-full h-11" disabled={submitting || !orgName.trim()}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Create organization
            </Button>
          </div>
        </form>
      </Card>
    ),

    profile: (
      <Card className="card-elevated border-0 shadow-lg">
        {stepHeader(
          <Users className="h-7 w-7 text-primary" />,
          "Tell us how you operate",
          "Your role, telephony ownership, and the motion you want to land first. We tailor your workspace home to match.",
        )}
        <CardContent className="space-y-5 pt-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your role</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const active = role === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRole(r.key)}
                    className={cn(
                      "text-left rounded-xl border-2 p-3 transition-premium",
                      active ? "border-primary bg-primary/3 shadow-sm" : "border-border hover:border-primary/30 hover:bg-muted/10",
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate">{r.label}</p>
                          {active && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </div>
                        <p className="text-[11px] leading-snug text-muted-foreground mt-0.5">{r.helper}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Five9 ownership</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                { key: "workspace", label: "Shared workspace account", helper: "One Five9 instance, scoped per client by campaign or DNIS.", icon: Building },
                { key: "client", label: "Per-client accounts", helper: "Each client connects their own Five9 domain.", icon: Building2 },
              ] as const).map((opt) => {
                const Icon = opt.icon;
                const active = ownershipMode === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setOwnershipMode(opt.key)}
                    className={cn(
                      "text-left rounded-xl border-2 p-3 transition-premium",
                      active ? "border-primary bg-primary/3 shadow-sm" : "border-border hover:border-primary/30 hover:bg-muted/10",
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold">{opt.label}</p>
                          {active && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <p className="text-[11px] leading-snug text-muted-foreground mt-0.5">{opt.helper}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Primary motion to land first</p>
            <div className="space-y-1.5">
              {MOTIONS.map((m) => {
                const active = motion === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMotion(m.key)}
                    className={cn(
                      "w-full text-left rounded-lg border px-3 py-2.5 transition-premium flex items-center justify-between gap-3",
                      active ? "border-primary bg-primary/3" : "border-border hover:border-primary/30 hover:bg-muted/10",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-[11px] text-muted-foreground">{m.helper}</p>
                    </div>
                    {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
        <div className="px-6 pb-6">
          <Button
            className="w-full h-11"
            disabled={!role || !ownershipMode || !motion || submitting}
            onClick={handleSaveProfile}
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
            Continue
          </Button>
        </div>
      </Card>
    ),

    telephony: (
      <Card className="card-elevated border-0 shadow-lg">
        {stepHeader(
          <Globe className="h-7 w-7 text-primary" />,
          "Connect Five9 (optional)",
          "Drop in admin credentials now or skip — your concierge can wire this up with you later.",
        )}
        <form onSubmit={handleConnectFive9}>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                placeholder="Main call center"
                value={domainDisplayName}
                onChange={(e) => setDomainDisplayName(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="five9Username">Five9 admin username</Label>
              <Input
                id="five9Username"
                placeholder="admin@yourcompany.com"
                value={five9Username}
                onChange={(e) => setFive9Username(e.target.value)}
                autoComplete="username"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="five9Password">Admin password</Label>
              <div className="relative">
                <Input
                  id="five9Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={five9Password}
                  onChange={(e) => setFive9Password(e.target.value)}
                  autoComplete="current-password"
                  className="pr-10 h-11"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            <OnboardingContextHelper
              title="Encrypted at rest"
              description="Credentials are stored encrypted and only used to sync agents, skills, dispositions, and call variables. You can rotate them anytime from Connectors."
            />
          </CardContent>
          <div className="px-6 pb-6 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setStep("land")}
              disabled={submitting}
            >
              Skip for now
            </Button>
            <Button
              type="submit"
              className="h-11"
              disabled={submitting || !domainDisplayName || !five9Username || !five9Password}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Save & continue
            </Button>
          </div>
        </form>
      </Card>
    ),

    land: (
      <Card className="card-elevated border-0 shadow-lg">
        {stepHeader(
          <Sparkles className="h-7 w-7 text-primary" />,
          "Land your workspace",
          "Workspaces are the canonical operating boundary — clients, scripts, integrations, QA, and analytics live here.",
        )}
        <CardContent className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input
              id="ws-name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Main workspace"
              className="h-11"
            />
          </div>
          <div className="rounded-xl border border-border/60 p-4 space-y-2 bg-muted/20">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              First-run defaults
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              {[
                "Default workspace home tailored to your role + motion",
                "Canonical guides, templates, and runbooks unlocked",
                "Adapters available: Five9, Clio Manage, Clio Grow, MyCase, Slack, Zapier / Make",
                "Concierge follow-up to validate mappings before go-live",
              ].map((d) => (
                <li key={d} className="flex items-start gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" /> {d}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
        <div className="px-6 pb-6">
          <Button onClick={handleLandWorkspace} className="w-full h-11" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
            Enter workspace
          </Button>
          <p className="text-[11px] text-center text-muted-foreground mt-3">
            You'll land at <span className="font-mono">/app/workspaces/:id/home</span>. Org admin tools stay one click away.
          </p>
        </div>
      </Card>
    ),
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEOHead title="Concierge onboarding | Fabric59" description="Land your canonical Fabric59 workspace in four guided steps." noindex />
      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
        <div className="hidden lg:block w-60 flex-shrink-0 pt-4">
          <div className="flex items-center gap-2.5 mb-8">
            <Fabric59Icon size="md" />
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">Fabric59</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Concierge setup</p>
            </div>
          </div>
          <OnboardingMilestones milestones={milestones} currentIndex={milestoneIndex} />
          <div className="mt-8 rounded-xl border border-border/60 p-4 bg-muted/20">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">White-glove</p>
            <p className="text-xs text-foreground mt-1.5 leading-snug">
              A Fabric59 implementation specialist follows up within one business day to validate adapters, mappings, and routing before go-live.
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-xl w-full mx-auto lg:mx-0">
          <div className="flex lg:hidden items-center justify-center gap-1.5 mb-6">
            {milestones.map((m, i) => (
              <div
                key={m.key}
                className={cn("h-1.5 rounded-full transition-all", i <= milestoneIndex ? "w-8 bg-primary" : "w-4 bg-muted")}
              />
            ))}
          </div>
          <div className="animate-fade-up">{stepContent[step]}</div>
        </div>
      </div>
    </div>
  );
}
