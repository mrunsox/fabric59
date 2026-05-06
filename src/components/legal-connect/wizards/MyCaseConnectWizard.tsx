import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  clientId: string;
  organizationId: string;
  onComplete?: () => void;
}

export default function MyCaseConnectWizard({ clientId, onComplete }: Props) {
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (apiKey.trim().length < 16) {
      setError("API key looks too short.");
      return;
    }
    setWorking(true);
    const key = apiKey;
    setApiKey(""); // clear from React state immediately
    try {
      const { data, error } = await supabase.functions.invoke("legal-connect-mycase-connect", {
        body: { client_id: clientId, api_key: key, account_label: label || null },
      });
      if (error) throw new Error(error.message);
      if (data?.success === false) throw new Error(data?.message || data?.error || "MyCase connect failed");
      toast.success("MyCase connected");
      qc.invalidateQueries({ queryKey: ["legal-connect", "connections"] });
      qc.invalidateQueries({ queryKey: ["legal-connections"] });
      onComplete?.();
    } catch (e) {
      setError((e as Error).message);
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
            <CardDescription>API key authentication</CardDescription>
          </div>
          <Badge variant="outline">API Key</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Key is validated server-side</AlertTitle>
          <AlertDescription className="text-xs">
            We send the key to MyCase via the backend to verify it before storing. The browser
            never persists the key and it is cleared from memory immediately on submit.
          </AlertDescription>
        </Alert>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="mycase-key">MyCase API key</Label>
            <Input
              id="mycase-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="mc_live_…"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mycase-label">Account label (optional)</Label>
            <Input
              id="mycase-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Firm production tenant"
              maxLength={120}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs break-words">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={working || apiKey.length < 16}>
              {working && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Validate & connect
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
