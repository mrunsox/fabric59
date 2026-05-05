import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FlowDefinition, FlowTemplate } from "@/lib/flow-templates/adapter";
import { connectorsForTemplate, getConnector, type ConnectorKey } from "@/data/connector-actions";

const CAP_LABELS: Record<string, string> = {
  supportsActionFlows: "Actions",
  supportsLookupFlows: "Lookups",
  supportsWebhookRelay: "Webhook relay",
  supportsCallbackTaskFlows: "Callbacks",
  supportsTwoWaySync: "Two-way sync",
};

export function ActionStep({
  definition,
  update,
  template,
}: {
  definition: FlowDefinition;
  update: (d: FlowDefinition) => void;
  template?: FlowTemplate | null;
}) {
  const action = definition.action ?? { connector: "" as ConnectorKey | "", action: "", config: {} };
  const set = (patch: Partial<typeof action>) =>
    update({ ...definition, action: { ...action, ...patch } as FlowDefinition["action"] });

  const compatibleConnectors = useMemo(
    () => (template ? connectorsForTemplate(template.key) : []),
    [template]
  );
  const connector = getConnector(action.connector || undefined);
  const actions = useMemo(() => {
    if (!connector || !template) return connector?.actions ?? [];
    return connector.actions.filter((a) => a.appliesToTemplates.includes(template.key));
  }, [connector, template]);

  const isHttp = action.connector === "webhook" || action.connector === "custom-http";
  const cfg = (action.config ?? {}) as Record<string, unknown>;
  const setCfg = (patch: Record<string, unknown>) => set({ config: { ...cfg, ...patch } });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Connector</Label>
          <Select value={action.connector || ""} onValueChange={(v) => set({ connector: v as ConnectorKey, action: "" })}>
            <SelectTrigger><SelectValue placeholder="Choose connector" /></SelectTrigger>
            <SelectContent>
              {(compatibleConnectors.length ? compatibleConnectors : []).map((c) => (
                <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {template && !compatibleConnectors.length && (
            <p className="text-xs text-destructive mt-1">No connectors support this template yet.</p>
          )}
        </div>
        <div>
          <Label>Action</Label>
          <Select value={action.action} onValueChange={(v) => set({ action: v })} disabled={!connector}>
            <SelectTrigger><SelectValue placeholder="Choose action" /></SelectTrigger>
            <SelectContent>
              {actions.map((a) => <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isHttp && (
        <div className="space-y-3 rounded-md border border-border/50 p-4 bg-secondary/20">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Method</Label>
              <Select value={String(cfg.method ?? "POST")} onValueChange={(v) => setCfg({ method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["POST", "PUT", "PATCH", "GET", "DELETE"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label className="text-xs">URL</Label>
              <Input value={String(cfg.url ?? "")} onChange={(e) => setCfg({ url: e.target.value })} placeholder="https://example.com/webhook" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Headers (JSON)</Label>
            <Textarea
              rows={3}
              className="font-mono text-xs"
              value={JSON.stringify(cfg.headers ?? {}, null, 2)}
              onChange={(e) => {
                try { setCfg({ headers: JSON.parse(e.target.value) }); } catch { /* noop */ }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
