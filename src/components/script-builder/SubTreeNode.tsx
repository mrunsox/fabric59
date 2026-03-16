import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { GitFork } from "lucide-react";

export const SubTreeNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 bg-card shadow-lg min-w-[180px] transition-all ${
      selected ? "border-accent shadow-accent/20" : "border-border"
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-accent !border-2 !border-card !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
          <GitFork className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sm">{data.label as string}</span>
      </div>
      <div className="space-y-1">
        {data.linkedScriptName ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent">↪ {data.linkedScriptName as string}</span>
        ) : (
          <span className="text-xs text-muted-foreground italic">No script linked</span>
        )}
        {data.passVariables && <p className="text-xs text-muted-foreground">Variables: {(data.passVariables as string[]).length} passed</p>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-accent !border-2 !border-card !w-3 !h-3" />
    </div>
  );
});

SubTreeNode.displayName = "SubTreeNode";
