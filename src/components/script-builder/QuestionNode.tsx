import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { HelpCircle } from "lucide-react";

export const QuestionNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 bg-card shadow-lg min-w-[200px] transition-all ${
        selected ? "border-node-question shadow-node-question/20" : "border-border"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-node-question !border-2 !border-card !w-3 !h-3"
      />
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-node-question text-white">
          <HelpCircle className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sm">{data.label as string}</span>
      </div>
      {data.prompt && (
        <p className="text-xs text-muted-foreground line-clamp-2">{data.prompt as string}</p>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-node-question !border-2 !border-card !w-3 !h-3"
      />
    </div>
  );
});

QuestionNode.displayName = "QuestionNode";
