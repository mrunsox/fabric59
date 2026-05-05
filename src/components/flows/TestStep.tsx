import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Eye, Copy, Check, AlertTriangle, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { FlowDefinition } from "@/lib/flow-templates/adapter";
import { toast } from "sonner";
import {
  buildDispatchPreview,
  previewAsCurl,
  computePreviewIdempotencyKey,
} from "@/lib/flow-runner/dispatch-preview";

export function TestStep({
  flowId,
  definition,
}: {
  flowId: string;
  definition: FlowDefinition;
}) {
  const initial = JSON.stringify(definition.test?.sample_payload ?? {}, null, 2);
  const [payloadText, setPayloadText] = useState(initial);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [copied, setCopied] = useState<"body" | "curl" | null>(null);

  const parsedPayload = useMemo(() => {
    try { return JSON.parse(payloadText); } catch { return null; }
  }, [payloadText]);

  const preview = useMemo(
    () => buildDispatchPreview(definition, parsedPayload ?? {}),
    [definition, parsedPayload]
  );

  const copy = async (text: string, key: "body" | "curl") => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied");
    setTimeout(() => setCopied(null), 1500);
  };

  const run = async () => {
    if (!parsedPayload) { toast.error("Invalid JSON"); return; }
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("flow-runner", {
        body: { flow_id: flowId, test: true, payload: parsedPayload },
      });
      if (error) throw error;
      setResult(data);
      toast.success("Test complete");
    } catch (e) {
      setResult({ error: (e as Error).message });
      toast.error((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Sample payload (JSON)</Label>
        <Textarea
          rows={10}
          className="font-mono text-xs"
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
        />
        {!parsedPayload && (
          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Invalid JSON. Fix to enable preview and dispatch.
          </p>
        )}
      </div>

      {/* Outbound dispatch preview */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Outbound dispatch preview</p>
            {preview.kind === "http" && (
              <Badge variant="secondary" className="font-mono text-[10px]">
                {preview.method} · {preview.url || "no URL"}
              </Badge>
            )}
            {preview.kind === "non_http" && (
              <Badge variant="outline" className="text-[10px]">Connector action</Badge>
            )}
            {preview.kind === "incomplete" && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">Incomplete</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            This is exactly what the runner will send when you click <strong>Run test</strong>.
            Test mode adds <code className="font-mono">X-Fabric59-Test: true</code> and is not persisted.
          </p>

          {preview.notes.length > 0 && (
            <ul className="text-xs text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-md p-2 space-y-0.5">
              {preview.notes.map((n, i) => (
                <li key={i} className="flex gap-1.5"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{n}</li>
              ))}
            </ul>
          )}

          {preview.kind === "http" && (
            <>
              <div>
                <Label className="text-xs">Request line</Label>
                <pre className="text-xs bg-secondary/30 p-2 rounded font-mono overflow-auto">
                  {preview.method} {preview.url}
                </pre>
              </div>
              <div>
                <Label className="text-xs">Headers</Label>
                <pre className="text-xs bg-secondary/30 p-2 rounded font-mono overflow-auto max-h-32">
                  {Object.entries(preview.headers ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n")}
                </pre>
              </div>
            </>
          )}

          {preview.body !== undefined && (
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Body (JSON)</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={() => copy(JSON.stringify(preview.body, null, 2), "body")}
                >
                  {copied === "body" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span className="ml-1 text-[10px]">Copy</span>
                </Button>
              </div>
              <pre className="text-xs bg-secondary/30 p-2 rounded font-mono overflow-auto max-h-60">
                {JSON.stringify(preview.body, null, 2)}
              </pre>
            </div>
          )}

          {preview.kind === "http" && preview.url && (
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">cURL equivalent</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={() => copy(previewAsCurl(preview), "curl")}
                >
                  {copied === "curl" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span className="ml-1 text-[10px]">Copy</span>
                </Button>
              </div>
              <pre className="text-xs bg-secondary/30 p-2 rounded font-mono overflow-auto max-h-40">
                {previewAsCurl(preview)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={run} disabled={running || !parsedPayload || preview.kind === "incomplete"}>
        {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
        Run test
      </Button>

      {result !== null && (
        <Card>
          <CardContent className="pt-4">
            <Label className="text-xs">Response</Label>
            <pre className="text-xs bg-secondary/30 p-3 rounded-lg overflow-auto max-h-80 mt-2">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
