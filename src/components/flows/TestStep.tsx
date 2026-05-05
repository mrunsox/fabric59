import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { FlowDefinition } from "@/lib/flow-templates/adapter";
import { toast } from "sonner";

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

  const run = async () => {
    let payload: unknown;
    try { payload = JSON.parse(payloadText); }
    catch { toast.error("Invalid JSON"); return; }
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("flow-runner", {
        body: { flow_id: flowId, test: true, payload },
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
        <Textarea rows={10} className="font-mono text-xs" value={payloadText} onChange={(e) => setPayloadText(e.target.value)} />
      </div>
      <Button onClick={run} disabled={running}>
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
