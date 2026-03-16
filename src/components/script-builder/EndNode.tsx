import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { CheckCircle } from "lucide-react";

export const EndNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 bg-card shadow-lg transition-all ${
        selected ? "border-node-end shadow-node-end/20" : "border-border"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-node-end !border-2 !border-card !w-3 !h-3"
      />
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-node-end text-white">
          <CheckCircle className="h-5 w-5" />
        </div>
        <span className="font-semibold">{data.label as string}</span>
      </div>
    </div>
  );
});

EndNode.displayName = "EndNode";
