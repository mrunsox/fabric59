import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface FieldNodeData {
  field: {
    path: string;
    label: string;
    type: string;
    category?: string;
  };
  side: "source" | "target";
}

const categoryColors: Record<string, string> = {
  contact: "border-blue-500/50 bg-blue-500/10",
  call: "border-green-500/50 bg-green-500/10",
  disposition: "border-purple-500/50 bg-purple-500/10",
  campaign: "border-orange-500/50 bg-orange-500/10",
  matter: "border-indigo-500/50 bg-indigo-500/10",
  client: "border-blue-500/50 bg-blue-500/10",
  job: "border-amber-500/50 bg-amber-500/10",
  lead: "border-green-500/50 bg-green-500/10",
  account: "border-purple-500/50 bg-purple-500/10",
  opportunity: "border-pink-500/50 bg-pink-500/10",
  custom: "border-gray-500/50 bg-gray-500/10",
};

export const FieldNode = memo(({ data }: NodeProps) => {
  const { field, side } = data as unknown as FieldNodeData;
  const isSource = side === "source";

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 min-w-[180px] max-w-[220px] shadow-sm",
        categoryColors[field.category || "custom"] || "border-border bg-card"
      )}
    >
      {/* Handle for connections */}
      <Handle
        type={isSource ? "source" : "target"}
        position={isSource ? Position.Right : Position.Left}
        className={cn(
          "w-3 h-3 border-2 border-primary",
          isSource ? "bg-primary" : "bg-background"
        )}
      />

      {/* Field info */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium truncate">{field.label}</p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {field.type}
          </Badge>
          {field.category && (
            <span className="text-xs text-muted-foreground capitalize">
              {field.category}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate font-mono">
          {field.path}
        </p>
      </div>
    </div>
  );
});

FieldNode.displayName = "FieldNode";
