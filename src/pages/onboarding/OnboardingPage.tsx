import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight, Check, Globe, Building2, Building } from "lucide-react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { toast } from "sonner";

type Step = "org" | "domain" | "tenant" | "complete";

export default function OnboardingPage() {
  const { organization, user, isMasterAdmin } = useAuth();
  const navigate = useNavigate();
  
  // Determine initial step based on whether user has an organization
  const [step, setStep] = useState<Step>(organization ? "domain" : "org");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Organization form
  const [orgName, setOrgName] = useState("");

  // Domain form
  const [domain, setDomain] = useState("");
  const [domainDisplayName, setDomainDisplayName] = useState("");
  const [createdDomainId, setCreatedDomainId] = useState<string | null>(null);

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

  // Only block on missing user (auth loading), not missing organization
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
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name: orgName, billing_email: user.email })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as owner
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: "owner"
        });

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

    try {
      const { data, error } = await supabase
        .from("five9_domains")
        .insert({
          organization_id: orgId,
          domain,
          display_name: domainDisplayName,
        })
        .select()
        .single();

      if (error) throw error;

      setCreatedDomainId(data.id);
      setStep("tenant");
      toast.success("Five9 domain connected!");
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to connect domain");
    } finally {
      setIsSubmitting(false);
    }
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
    // Force reload to pick up organization in auth context
    window.location.href = "/admin";
  };

  const getStepIndex = (s: Step) => ["org", "domain", "tenant", "complete"].indexOf(s);
  const steps = ["org", "domain", "tenant", "complete"] as const;

  return (
    <div className="dark min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : getStepIndex(step) > i
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {getStepIndex(step) > i ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${
                    getStepIndex(step) > i
                      ? "bg-success"
                      : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {step === "org" && (
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Building className="h-6 w-6 text-primary" />
                </div>
              </div>
              <CardTitle>Create your organization</CardTitle>
              <CardDescription>
                Set up your agency or company to get started
              </CardDescription>
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
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Create Organization
                </Button>
              </div>
            </form>
          </Card>
        )}

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
                Enter your Five9 domain to start routing calls
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateDomain}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="domain">Five9 Domain</Label>
                  <Input
                    id="domain"
                    type="text"
                    placeholder="yourcompany.five9.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    required
                  />
                </div>
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
                  <p className="text-xs text-muted-foreground">
                    A friendly name to identify this domain
                  </p>
                </div>
              </CardContent>
              <div className="px-6 pb-6">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Connect Domain
                </Button>
              </div>
            </form>
          </Card>
        )}

        {step === "tenant" && (
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
              </div>
              <CardTitle>Add your first client</CardTitle>
              <CardDescription>
                Create your first tenant (end-client) for this domain
              </CardDescription>
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
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleComplete}
                >
                  Skip for now
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Add Client
                </Button>
              </div>
            </form>
          </Card>
        )}

        {step === "complete" && (
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/20">
                  <Fabric59Icon size="lg" className="h-12 w-12" />
                </div>
              </div>
              <CardTitle>You're all set!</CardTitle>
              <CardDescription>
                Your Fabric59 account is ready to use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span>Organization: {orgName || organization?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span>Domain: {domain}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span>First client: {tenantName}</span>
                </div>
              </div>
            </CardContent>
            <div className="px-6 pb-6">
              <Button onClick={handleComplete} className="w-full">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
