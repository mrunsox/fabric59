import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Loader2, ArrowRight, Check, Building2, Building,
  Eye, EyeOff, CheckCircle, Users, Rocket, ShieldCheck,
  HeadphonesIcon, LineChart, Workflow, PhoneIncoming, ShieldAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import { OnboardingShell } from "@/shells/OnboardingShell";
import { OnboardingContextHelper } from "@/components/onboarding/OnboardingContextHelper";
import { toast } from "sonner";
import { isSuperadminSkipEmail } from "@/lib/superadmin-emails";

/**
 * Phase G — Premium concierge onboarding (4 steps).
 *
 * Replaces the legacy 6-step provisioning flow with a role-aware concierge
 * that bootstraps a canonical workspace inline and lands the user at
 * /w/:id/campaigns on first run. /admin is never the first
 * destination for a new operator.
 *
 * Steps:
 *   1. Organization — create or confirm the operating tenant.
 *   2. Operating profile — role + ownership + primary motion.
 *   3. Connect Five9 — optional credential capture (skippable).
 *   4. Land workspace — bootstrap default workspace + enter /w/:id/campaigns.
 */

type Step = "org" | "profile" | "telephony" | "land";

type OwnershipMode = "workspace" | "client";
type Role = "ops_leader" | "supervisor" | "implementation" | "intake_owner";
type Motion = "intake" | "reactivation" | "qa" | "sync" | "monitoring";

const RESUME_KEY_BASE = "fabric59:onboarding:step";
const resumeKeyFor = (userId: string | undefined | null) =>
  userId ? `${RESUME_KEY_BASE}:${userId}` : RESUME_KEY_BASE;

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
  const { organization, user, isMasterAdmin, refreshOrganizations } = useAuth();
  const { workspaces, refetch: refetchWorkspaces } = useWorkspace();
  const navigate = useNavigate();

  // Superadmin skip emails never see /onboarding — bounce immediately to
  // /superadmin so they can operate without seeding an org of their own.
  useEffect(() => {
    if (isSuperadminSkipEmail(user?.email)) {
      navigate("/superadmin", { replace: true });
    }
  }, [user?.email, navigate]);

  const [step, setStep] = useState<Step>(() => {
    const key = resumeKeyFor(user?.id);
    const resume = typeof window !== "undefined" ? (localStorage.getItem(key) as Step | null) : null;
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

  // Master admins are NOT auto-bounced to /superadmin from here. A fresh
  // master admin (no org, no workspaces) must be able to seed their founding
  // org + workspace through this concierge flow exactly like any other user.
  // The /launch matrix decides who lands here vs. /superadmin based on real
  // bootstrap state — see LaunchRedirectPage. A quiet "Open Superadmin" link
  // is rendered below for master admins who want the operator surface.

  useEffect(() => {
    if (organization && step === "org") setStep("profile");
  }, [organization, step]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = resumeKeyFor(user?.id);
    if (step === "land") localStorage.removeItem(key);
    else localStorage.setItem(key, step);
  }, [step, user?.id]);

  useEffect(() => {
    if (!workspaceName && organization?.name) setWorkspaceName(`${organization.name} workspace`);
  }, [organization?.name, workspaceName]);


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
      if (typeof window !== "undefined") {
        localStorage.removeItem(resumeKeyFor(user?.id));
        localStorage.setItem("currentOrgId", orgId);
      }
      // Refresh AuthContext so ProtectedRoute sees the freshly-created org
      // and doesn't bounce us back to /onboarding (org was created earlier
      // in this same session via createdOrgId; AuthContext hasn't reloaded).
      await refreshOrganizations();
      toast.success("Workspace ready");
      // Hard navigation guarantees AuthContext + WorkspaceContext fully
      // re-bootstrap with the new org/workspace, avoiding any race where
      // ProtectedRoute still sees organization=null.
      if (typeof window !== "undefined") {
        window.location.assign(`/w/${targetId}/campaigns`);
      } else {
        navigate(`/w/${targetId}/campaigns`, { replace: true });
      }
    } catch (err) {
      toast.error((err as Error).message || "Could not bootstrap workspace");
    } finally {
      setSubmitting(false);
    }
  };

  // Per-step bodies render inside OnboardingShell — no per-card heading.

  // Master-admin escape hatch: skip the concierge flow and land directly on a
  // workspace dashboard. If the master admin has no org/workspace yet, bootstrap
  // a minimal "Fabric59 Ops" org + default workspace so /w/:id/campaigns resolves.
  const handleSkipToWorkspace = async () => {
    setSubmitting(true);
    try {
      let targetOrgId = orgId;
      if (!targetOrgId) {
        const { data: org, error: orgErr } = await supabase
          .from("organizations")
          .insert({ name: "Fabric59 Ops", billing_email: user.email })
          .select()
          .single();
        if (orgErr) throw orgErr;
        const { error: memberError } = await supabase
          .from("organization_members")
          .insert({ organization_id: org.id, user_id: user.id, role: "owner" });
        if (memberError) throw memberError;
        targetOrgId = org.id;
        setCreatedOrgId(org.id);
      }
      const existing =
        workspaces.find((w) => w.organization_id === targetOrgId && w.is_default) ??
        workspaces.find((w) => w.organization_id === targetOrgId);
      let targetId = existing?.id ?? null;
      if (!targetId) {
        const { data, error } = await supabase
          .from("workspaces")
          .insert({
            organization_id: targetOrgId,
            name: "Main workspace",
            is_default: true,
          })
          .select("id")
          .single();
        if (error) throw error;
        targetId = data.id;
        await refetchWorkspaces();
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem(RESUME_KEY);
        localStorage.setItem("currentOrgId", targetOrgId);
      }
      // Refresh AuthContext so ProtectedRoute sees the freshly-created org and
      // doesn't bounce us back to /onboarding.
      await refreshOrganizations();
      toast.success("Workspace ready");
      // Hard navigation guarantees AuthContext + WorkspaceContext fully
      // re-bootstrap with the new org/workspace, avoiding any race where
      // ProtectedRoute still sees organization=null.
      if (typeof window !== "undefined") {
        window.location.assign(`/w/${targetId}/campaigns`);
      } else {
        navigate(`/w/${targetId}/campaigns`, { replace: true });
      }
    } catch (err) {
      toast.error((err as Error).message || "Could not skip to workspace");
    } finally {
      setSubmitting(false);
    }
  };

  // Non-master "Skip onboarding for now": never writes to the DB. Regular org
  // members don't satisfy the workspaces insert RLS, so we just bail out of the
  // concierge flow and let /launch (or an existing workspace) take over.
  const handleSkipForNow = async () => {
    setSubmitting(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(RESUME_KEY);
      }
      const existing =
        workspaces.find((w) => w.is_default) ?? workspaces[0] ?? null;
      const target = existing ? `/w/${existing.id}/campaigns` : "/launch";
      if (typeof window !== "undefined") {
        window.location.assign(target);
      } else {
        navigate(target, { replace: true });
      }
    } catch (err) {
      toast.error((err as Error).message || "Could not skip onboarding");
    } finally {
      setSubmitting(false);
    }
  };


  const stepContent: Record<Step, React.ReactNode> = {
    org: (
      <Card className="card-elevated border-0 shadow-lg">
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
            You'll land at <span className="font-mono">/w/:id/campaigns</span>. Org admin tools stay one click away.
          </p>
        </div>
      </Card>
    ),
  };

  const { heading, subheading } = STEP_HEADINGS[step];

  return (
    <OnboardingShell
      title="Concierge onboarding | Fabric59"
      description="Land your canonical Fabric59 workspace in four guided steps."
      steps={STEP_DEFS as unknown as { key: string; label: string; description?: string }[]}
      activeKey={step}
      heading={heading}
      subheading={subheading}
    >
      <div className="animate-fade-up">{stepContent[step]}</div>
      {(isMasterAdmin || isSuperadminSkipEmail(user?.email)) && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleSkipToWorkspace}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
            data-testid="onboarding-skip-link"
          >
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />}
            Skip onboarding — go to workspace dashboard
            <ArrowRight className="h-3 w-3" />
          </button>
          <Link
            to="/superadmin"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors"
            data-testid="onboarding-superadmin-link"
          >
            <ShieldAlert className="h-3 w-3" />
            Open Superadmin
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
      {!isMasterAdmin && !isSuperadminSkipEmail(user?.email) && step !== "land" && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleSkipForNow}
            disabled={submitting}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline underline-offset-4 transition-colors disabled:opacity-50"
            data-testid="onboarding-skip-for-now"
          >
            {submitting ? "Skipping…" : "Skip onboarding for now"}
          </button>
        </div>
      )}
    </OnboardingShell>
  );
}

