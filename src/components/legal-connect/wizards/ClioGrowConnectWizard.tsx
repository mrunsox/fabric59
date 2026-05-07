import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useCreateLegalConnection } from "@/hooks/useLegalConnect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  clientId: string;
  organizationId: string;
  onComplete?: () => void;
}

const STEPS = ["Intro", "Token", "Test", "Activate"];

interface TestResult {
  ok: boolean;
  status?: number;
  failure_kind?: string;
  error?: string;
}

/**
 * Clio Grow connection wizard.
 *
 * Phase 1.1 hardened version:
 *   - Token reveal toggle + URL extraction
 *   - Friendly failure copy keyed on adapter `failure_kind`
 *   - Live payload preview so admins know exactly what Fabric59 will send
 *   - Explicit notice that this is the Lead Inbox flow, not Clio Manage OAuth
 */
export default function ClioGrowConnectWizard({ clientId, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [working, setWorking] = useState(false);
  const [tested, setTested] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const create = useCreateLegalConnection();

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const extractFromUrl = () => {
    const m = token.match(/inbox_lead_token=([^&\s]+)/);
    if (m) setToken(m[1]);
  };

  const friendlyError = (r: TestResult): string => {
    switch (r.failure_kind) {
      case "auth":
        return "Clio Grow rejected this token. Double-check that you copied the value from Settings → Inbox.";
      case "validation":
        return r.error ?? "Clio Grow rejected the request payload.";
      case "rate_limited":
        return "Clio Grow is rate-limiting requests. Wait a moment and try again.";
      case "upstream_5xx":
        return "Clio Grow is having a hiccup. The request will be retried automatically in production.";
      case "timeout":
        return "Clio Grow did not respond within 15 seconds. Check Clio status and retry.";
      case "network":
        return "Could not reach Clio Grow from Fabric59. Retry shortly.";
      default:
        return r.error ?? "Test failed for an unknown reason.";
    }
  };

  const runTest = async () => {
    if (!token.trim()) {
      toast.error("Paste your Clio Grow inbox token first");
      return;
    }
    setWorking(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("clio-grow", {
        body: { action: "test", inbox_lead_token: token.trim() },
      });
      if (error) throw error;
      const result: TestResult = data ?? { ok: false, error: "no response" };
      setTestResult(result);
      if (!result.ok) {
        setTested(false);
        toast.error(friendlyError(result));
        return;
      }
      setTested(true);
      toast.success("Clio Grow test lead delivered. Safe to delete in Grow.");
      next();
    } catch (e) {
      setTestResult({ ok: false, error: (e as Error).message, failure_kind: "network" });
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
          <>
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Lead Inbox token (not Clio Manage OAuth)</AlertTitle>
              <AlertDescription className="text-xs space-y-1.5">
                <p>
                  This MVP integrates with the <strong>Clio Grow Lead Inbox</strong> flow. It is a
                  separate product from Clio Manage and does not use OAuth.
                </p>
                <p>
                  Inside Clio Grow, go to{" "}
                  <strong>Settings → Inbox → Lead capture URL</strong>. Copy the long random value
                  in the <code className="mx-1 px-1 rounded bg-muted">inbox_lead_token</code> query
                  parameter (or paste the entire URL — we'll extract it).
                </p>
                <p>
                  The token is stored encrypted at rest and only used by Fabric59 server-side when a
                  Five9 disposition asks Fabric59 to create a Grow lead.
                </p>
              </AlertDescription>
            </Alert>
            <PayloadPreview />
          </>
        )}

        {step === 1 && (
          <div className="space-y-2">
            <Label htmlFor="grow-token">Inbox lead token</Label>
            <div className="relative">
              <Input
                id="grow-token"
                type={showToken ? "text" : "password"}
                placeholder="Paste token or full https://grow.clio.com/inbox_leads?... URL"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
                className="pr-9"
              />
              <button
                type="button"
                aria-label={showToken ? "Hide token" : "Show token"}
                className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                onClick={() => setShowToken((s) => !s)}
              >
                {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Pasting the full Lead Inbox URL also works.
              </p>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={extractFromUrl}
              >
                Extract token from URL
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 py-2">
            <div className="text-center space-y-2">
              <ExternalLink className="h-7 w-7 text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">
                We'll send a sample lead to your Grow inbox labelled
                <code className="mx-1 px-1 rounded bg-muted">fabric59:test</code>. You can safely
                delete it from Grow afterwards.
              </p>
            </div>
            <div className="flex justify-center">
              <Button onClick={runTest} disabled={working}>
                {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {tested ? "Re-test" : "Send test lead"}
              </Button>
            </div>
            {testResult?.ok && (
              <Alert className="border-success/40">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertTitle>Test lead delivered</AlertTitle>
                <AlertDescription className="text-xs">
                  Confirm the test lead landed in your Grow inbox, then continue.
                </AlertDescription>
              </Alert>
            )}
            {testResult && !testResult.ok && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Test failed{testResult.status ? ` (${testResult.status})` : ""}</AlertTitle>
                <AlertDescription className="text-xs space-y-1">
                  <p>{friendlyError(testResult)}</p>
                  {testResult.failure_kind === "auth" && (
                    <p className="opacity-80">
                      Check the token, then re-test. Don't activate until the test passes.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
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

/** Static preview of the request shape Fabric59 sends to Grow on lead.create. */
function PayloadPreview() {
  const example = {
    inbox_lead: {
      from_first: "Jane",
      from_last: "Doe",
      from_email: "jane@example.com",
      from_phone: "+15555550123",
      from_message: "Disposition: Qualified Lead. Notes from agent…",
      referring_url: "https://fabric59.app/five9",
      from_source: "Fabric59 / Five9",
    },
    inbox_lead_token: "***",
  };
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-2">
      <div className="text-xs font-semibold text-foreground">What Fabric59 will send</div>
      <ul className="text-[11px] text-muted-foreground space-y-0.5">
        <li>
          <strong>Required:</strong> from_first, from_last, from_message, referring_url, from_source
        </li>
        <li>
          <strong>Optional:</strong> from_email, from_phone (at least one must be present)
        </li>
        <li>
          Source defaults to <code>Fabric59 / Five9</code> unless your mapping overrides it.
        </li>
      </ul>
      <pre className="text-[11px] font-mono leading-snug bg-background/60 rounded p-2 overflow-x-auto">
        {JSON.stringify(example, null, 2)}
      </pre>
    </div>
  );
}
