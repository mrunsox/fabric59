import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { ExternalLink } from "lucide-react";

export const LinkNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 bg-card shadow-lg min-w-[180px] transition-all ${
      selected ? "border-destructive shadow-destructive/20" : "border-border"
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-destructive !border-2 !border-card !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive text-white">
          <ExternalLink className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sm">{data.label as string}</span>
      </div>
      <div className="space-y-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
          {data.openInNewTab ? "New Tab" : "Same Window"}
        </span>
        {data.url && <p className="text-xs text-muted-foreground truncate max-w-[160px]">{(data.url as string).replace(/^https?:\/\//, '').slice(0, 30)}</p>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-destructive !border-2 !border-card !w-3 !h-3" />
    </div>
  );
});

LinkNode.displayName = "LinkNode";
