import { memo, useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  EdgeProps,
} from '@xyflow/react';
import { cn } from '@/lib/utils';

export interface CustomEdgeData {
  onContextMenu?: (event: React.MouseEvent, edgeId: string) => void;
  label?: string;
  sourceNodeType?: string;
}

function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as CustomEdgeData | undefined;
  const label = edgeData?.label;

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    edgeData?.onContextMenu?.(event, id);
  }, [edgeData, id]);

  // Get label styling based on content
  const getLabelStyle = () => {
    if (!label) return {};
    const lowerLabel = label.toLowerCase();
    if (lowerLabel === 'yes' || lowerLabel === 'true' || lowerLabel === 'success') {
      return { bg: 'bg-emerald-500/20', text: 'text-emerald-600', border: 'border-emerald-500/30' };
    }
    if (lowerLabel === 'no' || lowerLabel === 'false' || lowerLabel === 'failure') {
      return { bg: 'bg-red-500/20', text: 'text-red-500', border: 'border-red-500/30' };
    }
    if (lowerLabel.includes('maybe') || lowerLabel.includes('other')) {
      return { bg: 'bg-amber-500/20', text: 'text-amber-600', border: 'border-amber-500/30' };
    }
    return { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };
  };

  const labelStyle = getLabelStyle();

  return (
    <>
      {/* Glow effect for selected state */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          strokeWidth={12}
          className="react-flow__edge-path-glow"
          style={{
            stroke: 'hsl(var(--primary))',
            strokeOpacity: 0.3,
            filter: 'blur(6px)',
          }}
        />
      )}
      
      {/* Secondary glow ring */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          strokeWidth={6}
          style={{
            stroke: 'hsl(var(--primary))',
            strokeOpacity: 0.5,
            filter: 'blur(2px)',
          }}
        />
      )}
      
      {/* Invisible wider path for easier selection AND right-click */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={24}
        stroke="transparent"
        style={{ cursor: 'pointer' }}
        onContextMenu={handleContextMenu}
      />
      
      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected 
            ? 'hsl(var(--primary))' 
            : 'hsl(var(--muted-foreground) / 0.5)',
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
        }}
      />

      {/* Edge label (displayed regardless of selection) */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div 
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur-sm shadow-sm',
                labelStyle.bg,
                labelStyle.text,
                labelStyle.border
              )}
              onContextMenu={handleContextMenu}
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Selection indicator (when no label or in addition to label) */}
      {selected && !label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className="w-5 h-5 rounded-full bg-primary border-2 border-background shadow-lg flex items-center justify-center animate-pulse">
              <div className="w-2 h-2 rounded-full bg-primary-foreground" />
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(CustomEdge);