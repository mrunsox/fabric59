import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from "@xyflow/react";
import { X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FieldMapping } from "@/types/mapping";

interface MappingEdgeData {
  mapping: FieldMapping;
  onRemove: () => void;
}

export const MappingEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    style,
    markerEnd,
  }: EdgeProps) => {
    const { mapping, onRemove } = (data as unknown as MappingEdgeData) || {};

    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 10,
    });

    const hasTransform = mapping?.transform && mapping.transform.type !== "none";

    return (
      <>
        <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className="flex items-center gap-1 nodrag nopan"
          >
            {hasTransform && (
              <Badge
                variant="outline"
                className="bg-card text-xs cursor-pointer hover:bg-accent"
              >
                <Settings className="h-3 w-3 mr-1" />
                {mapping.transform?.type}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 bg-card hover:bg-destructive hover:text-destructive-foreground rounded-full border border-border"
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }
);

MappingEdge.displayName = "MappingEdge";
