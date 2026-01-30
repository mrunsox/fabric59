import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Loader2, ArrowRight, Check, Globe, Building2 } from "lucide-react";
import { toast } from "sonner";

type Step = "domain" | "tenant" | "complete";

export default function OnboardingPage() {
  const { organization, user, isMasterAdmin } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("domain");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Domain form
  const [domain, setDomain] = useState("");
  const [domainDisplayName, setDomainDisplayName] = useState("");
  const [createdDomainId, setCreatedDomainId] = useState<string | null>(null);

  // Tenant form
  const [tenantName, setTenantName] = useState("");
  const [crmType, setCrmType] = useState<"clio" | "workiz" | "salesforce" | "generic_rest" | "other">("other");

  // Redirect master admins to their dashboard
  useEffect(() => {
    if (isMasterAdmin && !organization) {
      navigate("/master", { replace: true });
    }
  }, [isMasterAdmin, organization, navigate]);

  if (!organization || !user) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("five9_domains")
        .insert({
          organization_id: organization.id,
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

    try {
      const { error } = await supabase.from("tenants").insert([
        {
          name: tenantName,
          crm_type: crmType,
          organization_id: organization.id,
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
    navigate("/admin");
  };

  return (
    <div className="dark min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["domain", "tenant", "complete"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : ["domain", "tenant", "complete"].indexOf(step) > i
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {["domain", "tenant", "complete"].indexOf(step) > i ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${
                    ["domain", "tenant", "complete"].indexOf(step) > i
                      ? "bg-success"
                      : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

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
                  <Zap className="h-6 w-6 text-success" />
                </div>
              </div>
              <CardTitle>You're all set!</CardTitle>
              <CardDescription>
                Your Five9 Fabric account is ready to use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span>Organization: {organization.name}</span>
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
