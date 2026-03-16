import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Webhook } from "lucide-react";

export const WebhookNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 bg-card shadow-lg min-w-[180px] transition-all ${
      selected ? "border-info shadow-info/20" : "border-border"
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-info !border-2 !border-card !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info text-white">
          <Webhook className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sm">{data.label as string}</span>
      </div>
      <div className="space-y-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-info/10 text-info">
          {data.webhookType === "zapier" ? "Zapier" : data.webhookType === "api" ? "API Call" : "Webhook"}
        </span>
        {data.webhookUrl && <p className="text-xs text-muted-foreground truncate max-w-[160px]">{(data.webhookUrl as string).replace(/^https?:\/\//, '').slice(0, 25)}...</p>}
        {data.method && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-muted">{data.method as string}</span>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-info !border-2 !border-card !w-3 !h-3" />
    </div>
  );
});

WebhookNode.displayName = "WebhookNode";
