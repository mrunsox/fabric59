import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ExternalLink, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useCreateLegalConnection } from "@/hooks/useLegalConnect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  clientId: string;
  organizationId: string;
  onComplete?: () => void;
}

const STEPS = ["Intro", "Token", "Test", "Activate"];

/**
 * Clio Grow connection wizard.
 *
 * Phase 1 auth model: Lead Inbox token. Each Grow inbox issues a long-lived
 * token that uniquely identifies the destination inbox. We POST to
 * https://grow.clio.com/inbox_leads with `{ inbox_lead, inbox_lead_token }`.
 *
 * The token is stored in `legal_connect_connections.metadata.inbox_lead_token`
 * (server-only access via SUPABASE_SERVICE_ROLE_KEY in the clio-grow function).
 */
export default function ClioGrowConnectWizard({ clientId, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [token, setToken] = useState("");
  const [working, setWorking] = useState(false);
  const [tested, setTested] = useState(false);
  const create = useCreateLegalConnection();

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const runTest = async () => {
    if (!token.trim()) {
      toast.error("Paste your Clio Grow inbox token first");
      return;
    }
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke("clio-grow", {
        body: { action: "test", inbox_lead_token: token.trim() },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data?.error ?? "Test failed");
      setTested(true);
      toast.success("Clio Grow test lead delivered. Safe to delete in Grow.");
      next();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const finish = async () => {
    setWorking(true);
    try {
      await create.mutateAsync({
        client_id: clientId,
        provider: "clio_grow",
        status: "connected",
        auth_type: "inbox_token",
        connection_name: "Clio Grow",
        metadata: { inbox_lead_token: token.trim() },
      });
      toast.success("Clio Grow activated");
      onComplete?.();
    } catch (e) {
      toast.error((e as Error).message);
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
              <KeyRound className="h-4 w-4 text-primary" /> Connect Clio Grow
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
            <AlertTitle>Lead Inbox token</AlertTitle>
            <AlertDescription className="text-xs space-y-1.5">
              <p>
                Clio Grow uses a per-inbox token to authenticate lead submissions. Find it in Grow
                under <strong>Settings → Inbox → Lead inbox URL</strong>. Copy only the
                <code className="mx-1 px-1 rounded bg-muted">inbox_lead_token</code> value.
              </p>
              <p>The token is stored encrypted at rest and only used by Fabric59 server-side.</p>
            </AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <div className="space-y-2">
            <Label htmlFor="grow-token">Inbox lead token</Label>
            <Input
              id="grow-token"
              type="password"
              placeholder="e.g. abc123…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              You can also paste the full <code>https://grow.clio.com/inbox_leads?...</code> URL —
              we'll extract the token.
            </p>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                const m = token.match(/inbox_lead_token=([^&\s]+)/);
                if (m) setToken(m[1]);
              }}
            >
              Extract from URL
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-center py-4">
            <ExternalLink className="h-8 w-8 text-primary mx-auto" />
            <p className="text-xs text-muted-foreground">
              We'll send a sample lead to your Grow inbox labelled
              <code className="mx-1 px-1 rounded bg-muted">fabric59:test</code>. Delete it from Grow
              after confirming.
            </p>
            <Button onClick={runTest} disabled={working}>
              {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Send test lead
            </Button>
            {tested && (
              <Badge variant="outline" className="border-success/40 text-success">
                Test lead delivered
              </Badge>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-center py-4">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <p className="text-sm text-foreground">
              Activate Clio Grow for this client. Future Five9 dispositions configured for lead
              creation will post directly to your Grow inbox.
            </p>
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-border">
          <Button variant="ghost" onClick={back} disabled={step === 0 || working}>
            Back
          </Button>
          {step === 2 ? (
            <Button onClick={runTest} disabled={working || !token.trim()}>
              {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {tested ? "Re-test" : "Test connection"}
            </Button>
          ) : step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={working || (step === 1 && !token.trim())}>
              Continue
            </Button>
          ) : (
            <Button onClick={finish} disabled={working || !tested}>
              {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Activate Connection
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
