import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 bg-card shadow-lg min-w-[180px] transition-all ${
        selected ? "border-node-condition shadow-node-condition/20" : "border-border"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-node-condition !border-2 !border-card !w-3 !h-3"
      />
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-node-condition text-white">
          <GitBranch className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sm">{data.label as string}</span>
      </div>
      {data.condition && (
        <p className="text-xs text-muted-foreground">{data.condition as string}</p>
      )}
      <Handle type="source" position={Position.Bottom} id="a"
        className="!bg-node-condition !border-2 !border-card !w-3 !h-3 !left-[25%]" />
      <Handle type="source" position={Position.Bottom} id="b"
        className="!bg-node-condition !border-2 !border-card !w-3 !h-3 !left-[50%]" />
      <Handle type="source" position={Position.Bottom} id="c"
        className="!bg-node-condition !border-2 !border-card !w-3 !h-3 !left-[75%]" />
    </div>
  );
});

ConditionNode.displayName = "ConditionNode";
