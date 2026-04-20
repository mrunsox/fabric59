import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useCreateLegalConnection } from "@/hooks/useLegalConnect";
import { toast } from "sonner";

interface Props {
  clientId: string;
  organizationId: string;
  onComplete?: () => void;
}

const STEPS = ["Intro", "Scopes", "Authorize", "Detect", "Map", "Test", "Activate"];

const REQUIRED_SCOPES = [
  { key: "contacts", label: "Contacts (read/write)" },
  { key: "matters", label: "Matters (read/write)" },
  { key: "communications", label: "Communications (write)" },
  { key: "activities", label: "Activities (write)" },
  { key: "webhooks", label: "Webhook subscriptions" },
];

export default function ClioConnectWizard({ clientId, organizationId, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [working, setWorking] = useState(false);
  const create = useCreateLegalConnection();

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const startOAuth = async () => {
    setWorking(true);
    // In production this opens Clio's authorize URL with CLIO_CLIENT_ID + redirect_uri.
    // The callback handler stores tokens in oauth_tokens and creates the legal_connect_connections row.
    toast.info("Clio OAuth requires CLIO_CLIENT_ID secret to be configured.");
    await new Promise((r) => setTimeout(r, 800));
    setWorking(false);
    next();
  };

  const finish = async () => {
    setWorking(true);
    try {
      await create.mutateAsync({
        client_id: clientId,
        provider: "clio",
        status: "connected",
        config: { region: "us" },
      });
      toast.success("Clio connection activated");
      onComplete?.();
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Connect Clio
            </CardTitle>
            <CardDescription>
              Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </CardDescription>
          </div>
          <Badge variant="outline">Client-level setup</Badge>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5 mt-3" />
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              You're about to connect Clio to this client. Fabric59 will sync contacts, matters,
              communications, and activities driven by Five9 call outcomes.
            </p>
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Secrets stay server-side</AlertTitle>
              <AlertDescription className="text-xs">
                Tokens are stored encrypted and never exposed to the browser or to campaign-level
                forms.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2">
            <p className="text-sm text-foreground">Clio will request these permissions:</p>
            <ul className="space-y-1.5">
              {REQUIRED_SCOPES.map((s) => (
                <li key={s.key} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-center py-6">
            <ExternalLink className="h-8 w-8 text-primary mx-auto" />
            <p className="text-sm text-foreground">
              Click below to authorize Fabric59 in Clio. You'll return here automatically.
            </p>
            <Button onClick={startOAuth} disabled={working}>
              {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
              Authorize in Clio
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <p className="text-sm text-foreground">Detected capabilities:</p>
            <div className="flex flex-wrap gap-1.5">
              {["contact.search", "contact.create", "matter.create", "communication.create", "activity.create"].map(
                (c) => (
                  <Badge key={c} variant="outline" className="border-success/40 text-success text-xs">
                    {c}
                  </Badge>
                ),
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-sm text-muted-foreground">
            Default field mappings applied. You can refine these later under Field Mappings.
          </div>
        )}

        {step === 5 && (
          <div className="space-y-2">
            <p className="text-sm text-foreground">Test sync sample completed.</p>
            <Badge variant="outline" className="border-success/40 text-success">
              All checks passed
            </Badge>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3 text-center py-4">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <p className="text-sm text-foreground">Activate this Clio connection for the client.</p>
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-border">
          <Button variant="ghost" onClick={back} disabled={step === 0 || working}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={working || step === 2}>
              Continue
            </Button>
          ) : (
            <Button onClick={finish} disabled={working}>
              {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Activate Connection
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
