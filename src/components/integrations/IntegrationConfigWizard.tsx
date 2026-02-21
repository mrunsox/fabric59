import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenants } from "@/hooks/useTenants";
import { ConnectionTestButton } from "./ConnectionTestButton";
import type { Integration } from "@/data/integrations-catalog";

interface Props {
  integration: Integration;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INTEGRATION_EDGE_MAP: Record<string, string> = {
  hubspot: "hubspot",
  salesforce: "salesforce",
  slack: "slack-agent",
  twilio: "twilio-sms",
  stripe: "stripe-payments",
  quickbooks: "quickbooks",
  zoom: "zoom-meeting",
  calendly: "calendly",
  docusign: "docusign",
  dropbox: "dropbox",
  asana: "asana",
  openai: "openai",
  zendesk: "zendesk",
  "google-drive": "google-drive",
  "google-calendar": "google-calendar",
  "ms-teams": "teams-notify",
  "microsoft-365": "microsoft365",
};

export function IntegrationConfigWizard({ integration, open, onOpenChange }: Props) {
  const [step, setStep] = useState(0);
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { data: tenants } = useTenants();

  const edgeFn = INTEGRATION_EDGE_MAP[integration.id] || integration.id;

  const handleSave = async () => {
    if (!selectedTenant || !apiKey) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { data: tenant } = await db.from("tenants").select("integration_configs").eq("id", selectedTenant).single();
      const configs = tenant?.integration_configs || {};
      configs[`${integration.id}_api_key`] = apiKey;
      await db.from("tenants").update({ integration_configs: configs }).eq("id", selectedTenant);
      setSaved(true);
      setStep(3);
      toast({ title: "Configuration saved", description: `${integration.name} is now configured.` });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStep(0);
    setSelectedTenant("");
    setApiKey("");
    setSaved(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure {integration.name}</DialogTitle>
          <DialogDescription>Step {step + 1} of 4</DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex gap-1">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <div className="space-y-4 pt-2">
          {step === 0 && (
            <>
              <Label>Select Client</Label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger><SelectValue placeholder="Choose a client..." /></SelectTrigger>
                <SelectContent>
                  {tenants?.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end">
                <Button disabled={!selectedTenant} onClick={() => setStep(1)} className="gap-2">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <Label>API Key / Credentials</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={`Enter ${integration.name} API key`}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Find your API key in the {integration.name} dashboard settings.
              </p>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button disabled={!apiKey} onClick={() => setStep(2)} className="gap-2">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-3">
                <Label>Test Connection</Label>
                <p className="text-sm text-muted-foreground">
                  Validate your credentials before saving.
                </p>
                <ConnectionTestButton edgeFunction={edgeFn} apiKey={apiKey} />
              </div>
              <Separator />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save & Finish
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
              <div>
                <p className="font-semibold text-lg">{integration.name} Configured</p>
                <p className="text-sm text-muted-foreground">
                  The integration is now active for the selected client.
                </p>
              </div>
              <Badge variant="outline" className="text-success border-success/30 bg-success/10">Connected</Badge>
              <div className="pt-2">
                <Button onClick={() => handleClose(false)}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
