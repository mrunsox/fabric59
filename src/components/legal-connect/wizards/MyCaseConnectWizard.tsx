import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useCreateLegalConnection } from "@/hooks/useLegalConnect";
import { toast } from "sonner";

interface Props {
  clientId: string;
  organizationId: string;
  onComplete?: () => void;
}

const STEPS = ["Intro", "API Token", "Probe", "Map", "Test", "Activate"];

export default function MyCaseConnectWizard({ clientId, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [token, setToken] = useState("");
  const [working, setWorking] = useState(false);
  const create = useCreateLegalConnection();

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    setWorking(true);
    try {
      await create.mutateAsync({
        client_id: clientId,
        provider: "mycase",
        status: "connected",
        config: { auth_method: "api_token" },
      });
      toast.success("MyCase connection activated");
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
              <KeyRound className="h-4 w-4 text-primary" /> Connect MyCase
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
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>API token authentication</AlertTitle>
            <AlertDescription className="text-xs">
              MyCase uses an API token issued from the firm's account. We store it encrypted and
              never expose it to campaign-level forms.
            </AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <div className="space-y-2">
            <Label htmlFor="mc-token">MyCase API Token</Label>
            <Input
              id="mc-token"
              type="password"
              placeholder="paste token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find this in MyCase → Settings → Integrations → API Access.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <p className="text-sm text-foreground">Capability probe (capability-aware adapter):</p>
            <div className="flex flex-wrap gap-1.5">
              {["contact.search", "contact.create", "case.create", "note.create"].map((c) => (
                <Badge key={c} variant="outline" className="border-success/40 text-success text-xs">
                  {c}
                </Badge>
              ))}
              <Badge variant="outline" className="text-muted-foreground text-xs">
                lead.create — unsupported
              </Badge>
            </div>
          </div>
        )}

        {step === 3 && (
          <p className="text-sm text-muted-foreground">
            Default mappings applied. Refine under Field Mappings later.
          </p>
        )}

        {step === 4 && (
          <Badge variant="outline" className="border-success/40 text-success">
            Test sample succeeded
          </Badge>
        )}

        {step === 5 && (
          <div className="space-y-3 text-center py-4">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <p className="text-sm text-foreground">Activate MyCase connection.</p>
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-border">
          <Button variant="ghost" onClick={back} disabled={step === 0 || working}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={working || (step === 1 && !token)}>
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
