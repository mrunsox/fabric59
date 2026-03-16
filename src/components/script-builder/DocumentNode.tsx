import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { FileText } from "lucide-react";

export const DocumentNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 bg-card shadow-lg min-w-[180px] transition-all ${
      selected ? "border-warning shadow-warning/20" : "border-border"
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-warning !border-2 !border-card !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning text-white">
          <FileText className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sm">{data.label as string}</span>
      </div>
      <div className="space-y-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning">
          {data.documentType === "html" ? "HTML" : "PDF"}
        </span>
        {data.templateName && <p className="text-xs text-muted-foreground truncate max-w-[160px]">Template: {data.templateName as string}</p>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-warning !border-2 !border-card !w-3 !h-3" />
    </div>
  );
});

DocumentNode.displayName = "DocumentNode";
