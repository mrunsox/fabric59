import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExternalLink, Loader2, ShieldCheck, Sparkles, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  clientId: string;
  organizationId: string;
  onComplete?: () => void;
}

export default function ClioConnectWizard({ clientId }: Props) {
  const [probing, setProbing] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Probe configuration on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("clio-oauth-start", {
          body: { dry_run: true },
        });
        if (cancelled) return;
        if (error) {
          setConfigured(false);
          setReason(error.message);
        } else {
          setConfigured(!!data?.configured);
          setReason(data?.reason ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setConfigured(false);
          setReason((e as Error).message);
        }
      } finally {
        if (!cancelled) setProbing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startOAuth = async () => {
    setWorking(true);
    setError(null);
    try {
      const redirectAfter = `${window.location.origin}/admin/clients/${clientId}/legal-connect?clio=connected`;
      const { data, error } = await supabase.functions.invoke("clio-oauth-start", {
        body: { client_id: clientId, redirect_after: redirectAfter },
      });
      if (error) throw new Error(error.message);
      if (!data?.url) throw new Error("Authorize URL missing from response");
      window.location.assign(data.url);
    } catch (e) {
      setError((e as Error).message);
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
            <CardDescription>OAuth 2.0 authorization with Clio Manage</CardDescription>
          </div>
          <Badge variant="outline">OAuth 2.0</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Tokens stay server-side</AlertTitle>
          <AlertDescription className="text-xs">
            You'll be redirected to Clio to authorize. Tokens come back to a backend callback and
            are persisted to the connection record. The browser never sees access or refresh tokens.
          </AlertDescription>
        </Alert>

        {probing ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking provider configuration…
          </div>
        ) : configured === false ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Provider not yet configured</AlertTitle>
            <AlertDescription className="text-xs">
              {reason || "Clio OAuth credentials are not set on the server."} Contact an admin to
              register a Clio app and add <code>CLIO_CLIENT_ID</code> and{" "}
              <code>CLIO_CLIENT_SECRET</code>.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="text-sm text-foreground">
            Clicking the button below will redirect you to Clio. After approving, you'll return to
            this client's Legal Connect page.
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs break-words">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end pt-1">
          <Button
            onClick={startOAuth}
            disabled={probing || configured !== true || working}
            title={configured === false ? "Provider not yet configured — contact admin" : undefined}
          >
            {working ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Authorize in Clio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
