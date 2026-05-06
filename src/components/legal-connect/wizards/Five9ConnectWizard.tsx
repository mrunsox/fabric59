import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, ShieldCheck, XCircle, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  clientId: string;
  organizationId: string;
  onComplete?: () => void;
}

type Result = { ok: true; username: string } | { ok: false; message: string };

export default function Five9ConnectWizard({ clientId, onComplete }: Props) {
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setWorking(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("legal-connect-five9-connect", {
        body: {
          client_id: clientId,
          username: username.trim(),
          password,
          base_url: baseUrl.trim() || undefined,
        },
      });
      if (error) {
        setResult({ ok: false, message: error.message || "Connection failed" });
      } else if (data?.success) {
        // Wipe transient secret from memory before any further action.
        setPassword("");
        setResult({ ok: true, username: data.username });
        qc.invalidateQueries({ queryKey: ["legal-connect", "connections"] });
        setTimeout(() => onComplete?.(), 600);
      } else {
        setResult({ ok: false, message: data?.message || data?.error || "Connection failed" });
      }
    } catch (err) {
      setResult({ ok: false, message: (err as Error).message });
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
              <Phone className="h-4 w-4 text-primary" /> Connect Five9
            </CardTitle>
            <CardDescription>Verify and store admin credentials for this client</CardDescription>
          </div>
          <Badge variant="outline">Credential auth</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Credentials are verified server-side</AlertTitle>
          <AlertDescription className="text-xs">
            The username and password are sent to a backend function that calls Five9's
            <code className="px-1">getContactFields</code> SOAP method. Only on a successful response
            is a connection row written. The form clears its password buffer after submit.
          </AlertDescription>
        </Alert>

        <form onSubmit={submit} className="space-y-3" autoComplete="off">
          <div className="space-y-1.5">
            <Label htmlFor="f9-user">Five9 admin username</Label>
            <Input
              id="f9-user"
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin@your-domain.com"
              disabled={working}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f9-pass">Password</Label>
            <Input
              id="f9-pass"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={working}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f9-base">Base URL (optional)</Label>
            <Input
              id="f9-base"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.five9.com"
              disabled={working}
            />
          </div>

          {result && result.ok === false ? (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Connection failed</AlertTitle>
              <AlertDescription className="text-xs break-words">{(result as { ok: false; message: string }).message}</AlertDescription>
            </Alert>
          ) : null}
          {result && result.ok === true ? (
            <Alert className="border-success/40">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertTitle>Connected</AlertTitle>
              <AlertDescription className="text-xs">
                Verified Five9 access for {(result as { ok: true; username: string }).username}.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={working || !username || !password}>
              {working && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verify and connect
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
