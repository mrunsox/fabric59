import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { FlowDefinition } from "@/lib/flow-templates/adapter";

export function FailureStep({ definition, update }: { definition: FlowDefinition; update: (d: FlowDefinition) => void }) {
  const f = definition.failure;
  const set = (patch: Partial<typeof f>) => update({ ...definition, failure: { ...f, ...patch } });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Retry count</Label>
          <Input type="number" min={0} max={10} value={f.retries}
            onChange={(e) => set({ retries: parseInt(e.target.value) || 0 })} />
        </div>
        <div>
          <Label>Backoff (ms)</Label>
          <Input type="number" min={0} step={500} value={f.backoff_ms ?? 1000}
            onChange={(e) => set({ backoff_ms: parseInt(e.target.value) || 0 })} />
        </div>
      </div>
      <div>
        <Label>Fallback action (optional)</Label>
        <Input value={f.fallback ?? ""} onChange={(e) => set({ fallback: e.target.value })} placeholder="e.g. notify_slack" />
      </div>
      <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
        <div>
          <p className="text-sm font-medium">Send to dead-letter on final failure</p>
          <p className="text-xs text-muted-foreground">Failed runs stay inspectable in the Runs UI.</p>
        </div>
        <Switch checked={!!f.dead_letter} onCheckedChange={(v) => set({ dead_letter: v })} />
      </div>
      <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
        <div>
          <p className="text-sm font-medium">Mark for review on failure</p>
          <p className="text-xs text-muted-foreground">Surfaces failed runs in the operator queue.</p>
        </div>
        <Switch checked={!!f.mark_for_review} onCheckedChange={(v) => set({ mark_for_review: v })} />
      </div>
      <p className="text-xs text-muted-foreground">
        Transient failures (timeouts, 5xx) retry with exponential backoff and jitter. 4xx failures are non-retriable.
      </p>
    </div>
  );
}
