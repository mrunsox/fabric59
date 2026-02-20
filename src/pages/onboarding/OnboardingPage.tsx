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
  Eye, EyeOff, Wifi, XCircle, CheckCircle, Users, Link2,
} from "lucide-react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { toast } from "sonner";

type Step = "org" | "domain" | "testing" | "intent" | "tenant" | "complete";
type ConnectionStatus = "testing" | "success" | "failed";
type Intent = "provisioning" | "integration";

export default function OnboardingPage() {
  const { organization, user, isMasterAdmin } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(organization ? "domain" : "org");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Organization form
  const [orgName, setOrgName] = useState("");

  // Domain form
  const [domainDisplayName, setDomainDisplayName] = useState("");
  const [five9Username, setFive9Username] = useState("");
  const [five9Password, setFive9Password] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [createdDomainId, setCreatedDomainId] = useState<string | null>(null);

  // Connection test
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [connectionMessage, setConnectionMessage] = useState("");

  // Intent selection
  const [intent, setIntent] = useState<Intent | null>(null);

  // Tenant form
  const [tenantName, setTenantName] = useState("");
  const [crmType, setCrmType] = useState<"clio" | "workiz" | "salesforce" | "generic_rest" | "other">("other");

  // Track the organization ID for domain/tenant creation when org was just created
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

  // Redirect master admins to their dashboard
  useEffect(() => {
    if (isMasterAdmin && !organization) {
      navigate("/master", { replace: true });
    }
  }, [isMasterAdmin, organization, navigate]);

  // Update step when organization becomes available (after creation)
  useEffect(() => {
    if (organization && step === "org") {
      setStep("domain");
    }
  }, [organization, step]);

  if (!user) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getOrgId = () => createdOrgId || organization?.id;

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name: orgName, billing_email: user.email })
        .select()
        .single();

      if (orgError) throw orgError;

      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({ organization_id: org.id, user_id: user.id, role: "owner" });

      if (memberError) throw memberError;

      setCreatedOrgId(org.id);
      setStep("domain");
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
    if (!orgId) {
      toast.error("Organization not found");
      setIsSubmitting(false);
      return;
    }

    const derivedDomain = five9Username.includes("@")
      ? five9Username.split("@")[1]
      : domainDisplayName.toLowerCase().replace(/\s+/g, "-");

    try {
      const { data, error } = await supabase
        .from("five9_domains")
        .insert({
          organization_id: orgId,
          domain: derivedDomain,
          display_name: domainDisplayName,
          five9_username: five9Username,
          five9_password_encrypted: five9Password,
        })
        .select()
        .single();

      if (error) throw error;

      setCreatedDomainId(data.id);

      // Move to testing step and run connection test
      setStep("testing");
      setConnectionStatus("testing");
      setIsSubmitting(false);

      try {
        const { data: session } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-five9-connection`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.session?.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ domain_id: data.id }),
          }
        );

        const result = await response.json();

        if (result.success) {
          setConnectionStatus("success");
          setConnectionMessage(result.message || "Successfully connected to Five9 Admin Web Services");
          setTimeout(() => setStep("intent"), 1800);
        } else {
          setConnectionStatus("failed");
          setConnectionMessage(result.message || "Authentication failed. Please check your credentials.");
        }
      } catch {
        setConnectionStatus("failed");
        setConnectionMessage("Could not reach Five9. Please check your credentials and try again.");
      }
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to connect domain");
      setIsSubmitting(false);
    }
  };

  const handleRetryCredentials = () => {
    setConnectionStatus(null);
    setConnectionMessage("");
    setStep("domain");
  };

  const handleContinueAnyway = () => {
    setStep("intent");
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const orgId = getOrgId();
    if (!orgId) {
      toast.error("Organization not found");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from("tenants").insert([
        {
          name: tenantName,
          crm_type: crmType,
          organization_id: orgId,
          five9_domain_id: createdDomainId,
        },
      ]);

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
    if (intent === "provisioning") {
      window.location.href = "/admin/agents";
    } else if (intent === "integration") {
      window.location.href = "/admin/mappings";
    } else {
      window.location.href = "/admin";
    }
  };

  // Progress dots: testing + intent are visually "step 2" (domain)
  const getVisualStepIndex = (s: Step) => {
    if (s === "testing" || s === "intent") return 1;
    return ["org", "domain", "tenant", "complete"].indexOf(s as "org" | "domain" | "tenant" | "complete");
  };

  const progressDots = ["org", "domain", "tenant", "complete"] as const;
  const currentVisualIndex = getVisualStepIndex(step);

  return (
    <div className="dark min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {progressDots.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  currentVisualIndex === i
                    ? "bg-primary text-primary-foreground"
                    : currentVisualIndex > i
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentVisualIndex > i ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < 3 && (
                <div className={`w-12 h-0.5 mx-2 ${currentVisualIndex > i ? "bg-success" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step: Org ── */}
        {step === "org" && (
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Building className="h-6 w-6 text-primary" />
                </div>
              </div>
              <CardTitle>Create your organization</CardTitle>
              <CardDescription>Set up your agency or company to get started</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateOrg}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    type="text"
                    placeholder="Your Agency Name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be your workspace name in Fabric59
                  </p>
                </div>
              </CardContent>
              <div className="px-6 pb-6">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Create Organization
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ── Step: Domain ── */}
        {step === "domain" && (
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
              </div>
              <CardTitle>Connect your Five9 Domain</CardTitle>
              <CardDescription>
                Sign in with your Five9 admin account to connect your domain
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateDomain}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Main Call Center"
                    value={domainDisplayName}
                    onChange={(e) => setDomainDisplayName(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">A friendly name to identify this domain</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="five9Username">Five9 Admin Username</Label>
                  <Input
                    id="five9Username"
                    type="text"
                    placeholder="admin@yourcompany.com"
                    value={five9Username}
                    onChange={(e) => setFive9Username(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="five9Password">Admin Password</Label>
                  <div className="relative">
                    <Input
                      id="five9Password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={five9Password}
                      onChange={(e) => setFive9Password(e.target.value)}
                      autoComplete="current-password"
                      className="pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used to sync agent skills, call variables, and dispositions from your Five9 domain
                  </p>
                </div>
              </CardContent>
              <div className="px-6 pb-6">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Connect Domain
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ── Step: Testing ── */}
        {step === "testing" && (
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl",
                  connectionStatus === "success" ? "bg-success/20" :
                  connectionStatus === "failed" ? "bg-destructive/10" :
                  "bg-primary/10"
                )}>
                  {connectionStatus === "testing" && <Wifi className="h-6 w-6 text-primary animate-pulse" />}
                  {connectionStatus === "success" && <CheckCircle className="h-6 w-6 text-success" />}
                  {connectionStatus === "failed" && <XCircle className="h-6 w-6 text-destructive" />}
                </div>
              </div>
              <CardTitle>
                {connectionStatus === "testing" && "Verifying Connection"}
                {connectionStatus === "success" && "Connected!"}
                {connectionStatus === "failed" && "Connection Failed"}
              </CardTitle>
              <CardDescription>
                {connectionStatus === "testing" && "Connecting to Five9 Admin Web Services…"}
                {connectionStatus === "success" && connectionMessage}
                {connectionStatus === "failed" && connectionMessage}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {connectionStatus === "testing" && (
                <div className="flex items-center justify-center gap-3 py-4 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Authenticating with Five9…</span>
                </div>
              )}

              {connectionStatus === "success" && (
                <div className="flex items-center justify-center gap-3 py-4 text-muted-foreground">
                  <span className="text-sm">Moving you forward in a moment…</span>
                </div>
              )}

              {connectionStatus === "failed" && (
                <div className="space-y-3 pt-2">
                  <Button variant="default" className="w-full" onClick={handleRetryCredentials}>
                    Try Different Credentials
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleContinueAnyway}>
                    Continue Anyway
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    You can update your credentials later in Domain Settings.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Step: Intent ── */}
        {step === "intent" && (
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <ArrowRight className="h-6 w-6 text-primary" />
                </div>
              </div>
              <CardTitle>What would you like to set up first?</CardTitle>
              <CardDescription>
                Choose your primary use case — you can always use both later
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Agent Provisioning card */}
              <button
                type="button"
                onClick={() => setIntent("provisioning")}
                className={cn(
                  "w-full text-left rounded-lg border-2 p-4 transition-all",
                  intent === "provisioning"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">Agent Provisioning</p>
                      {intent === "provisioning" && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Onboard and offboard call center agents — create Five9 users, assign skills, and send login credentials automatically.
                    </p>
                  </div>
                </div>
              </button>

              {/* CRM Integration card */}
              <button
                type="button"
                onClick={() => setIntent("integration")}
                className={cn(
                  "w-full text-left rounded-lg border-2 p-4 transition-all",
                  intent === "integration"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Link2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">CRM & Campaign Integration</p>
                      {intent === "integration" && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Connect your clients' CRMs to Five9 campaigns — map fields, sync contacts, and route calls to the right disposition.
                    </p>
                  </div>
                </div>
              </button>
            </CardContent>
            <div className="px-6 pb-6">
              <Button
                className="w-full"
                disabled={!intent}
                onClick={() => setStep("tenant")}
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Continue
              </Button>
            </div>
          </Card>
        )}

        {/* ── Step: Tenant ── */}
        {step === "tenant" && (
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
              </div>
              <CardTitle>Add your first client</CardTitle>
              <CardDescription>Create your first tenant (end-client) for this domain</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateTenant}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tenantName">Client Name</Label>
                  <Input
                    id="tenantName"
                    type="text"
                    placeholder="Law Firm Alpha"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crmType">CRM Type</Label>
                  <select
                    id="crmType"
                    value={crmType}
                    onChange={(e) => setCrmType(e.target.value as typeof crmType)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="clio">Clio</option>
                    <option value="workiz">Workiz</option>
                    <option value="salesforce">Salesforce</option>
                    <option value="generic_rest">Generic REST API</option>
                    <option value="other">Other / None</option>
                  </select>
                </div>
              </CardContent>
              <div className="px-6 pb-6 flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("complete")}>
                  Skip for now
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Add Client
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ── Step: Complete ── */}
        {step === "complete" && (
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/20">
                  <Fabric59Icon size="lg" className="h-12 w-12" />
                </div>
              </div>
              <CardTitle>You're all set!</CardTitle>
              <CardDescription>Your Fabric59 account is ready to use</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span>Organization: {orgName || organization?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span>Domain: {five9Username.includes("@") ? five9Username.split("@")[1] : domainDisplayName}</span>
                </div>
                {tenantName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span>First client: {tenantName}</span>
                  </div>
                )}
              </div>
            </CardContent>
            <div className="px-6 pb-6">
              <Button onClick={handleComplete} className="w-full">
                {intent === "provisioning"
                  ? "Go to Agent Provisioning"
                  : intent === "integration"
                  ? "Go to Mapping Builder"
                  : "Go to Dashboard"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
