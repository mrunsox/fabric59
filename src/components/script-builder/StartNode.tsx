import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { CircleDot } from "lucide-react";

export const StartNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 bg-card shadow-lg transition-all ${
        selected ? "border-node-start shadow-node-start/20" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-node-start text-white">
          <CircleDot className="h-5 w-5" />
        </div>
        <span className="font-semibold">{data.label as string}</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-node-start !border-2 !border-card !w-3 !h-3"
      />
    </div>
  );
});

StartNode.displayName = "StartNode";
