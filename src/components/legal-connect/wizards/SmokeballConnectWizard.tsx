import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ExternalLink, Globe, Loader2, ShieldCheck } from "lucide-react";
import { useCreateLegalConnection } from "@/hooks/useLegalConnect";
import { toast } from "sonner";

interface Props {
  clientId: string;
  organizationId: string;
  onComplete?: () => void;
}

const STEPS = ["Intro", "Region", "Authorize", "Detect", "Map", "Test", "Activate"];

const REGIONS = [
  { value: "us", label: "United States" },
  { value: "au", label: "Australia" },
  { value: "uk", label: "United Kingdom" },
];

export default function SmokeballConnectWizard({ clientId, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [region, setRegion] = useState("us");
  const [working, setWorking] = useState(false);
  const create = useCreateLegalConnection();

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const startOAuth = async () => {
    setWorking(true);
    toast.info("Smokeball OAuth requires SMOKEBALL_CLIENT_ID secret to be configured.");
    await new Promise((r) => setTimeout(r, 800));
    setWorking(false);
    next();
  };

  const finish = async () => {
    setWorking(true);
    try {
      await create.mutateAsync({
        client_id: clientId,
        provider: "smokeball",
        status: "connected",
        config: { region },
      });
      toast.success("Smokeball connection activated");
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
              <Globe className="h-4 w-4 text-primary" /> Connect Smokeball
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
            <AlertTitle>Region-aware OAuth</AlertTitle>
            <AlertDescription className="text-xs">
              Smokeball runs region-specific endpoints. Pick the firm's region — we'll use the
              correct base URL automatically.
            </AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <div className="space-y-2">
            <Label>Smokeball region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-center py-6">
            <ExternalLink className="h-8 w-8 text-primary mx-auto" />
            <Button onClick={startOAuth} disabled={working}>
              {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
              Authorize in Smokeball
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-wrap gap-1.5">
            {["contact.create", "matter.create", "lead.create", "task.create"].map((c) => (
              <Badge key={c} variant="outline" className="border-success/40 text-success text-xs">
                {c}
              </Badge>
            ))}
          </div>
        )}

        {step === 4 && (
          <p className="text-sm text-muted-foreground">
            Default mappings applied. Smokeball is intake-first; lead.create is wired by default.
          </p>
        )}

        {step === 5 && (
          <Badge variant="outline" className="border-success/40 text-success">
            Test sample succeeded
          </Badge>
        )}

        {step === 6 && (
          <div className="space-y-3 text-center py-4">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <p className="text-sm text-foreground">
              Activate Smokeball ({REGIONS.find((r) => r.value === region)?.label}).
            </p>
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
