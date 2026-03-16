import { memo } from 'react';
import { ScriptNode } from '@/types/script';

interface ConnectionLinesProps {
  nodes: ScriptNode[];
  selectedNodeId: string | null;
}

const NODE_WIDTH = 280;
const NODE_HEIGHT = 120;

function getBezierPath(
  sourceX: number, 
  sourceY: number, 
  targetX: number, 
  targetY: number
): string {
  const midX = (sourceX + targetX) / 2;
  const distance = Math.abs(targetX - sourceX);
  const curveOffset = Math.min(distance * 0.5, 150);
  
  // Bezier control points for smooth curves
  const controlPoint1X = sourceX + curveOffset;
  const controlPoint1Y = sourceY;
  const controlPoint2X = targetX - curveOffset;
  const controlPoint2Y = targetY;

  return `M ${sourceX} ${sourceY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${targetX} ${targetY}`;
}

function ConnectionLine({ 
  sourceNode, 
  targetNode, 
  isHighlighted,
  optionLabel
}: { 
  sourceNode: ScriptNode; 
  targetNode: ScriptNode;
  isHighlighted: boolean;
  optionLabel?: string;
}) {
  // Calculate connection points (right side of source, left side of target)
  const sourceX = sourceNode.position.x + NODE_WIDTH;
  const sourceY = sourceNode.position.y + NODE_HEIGHT / 2;
  const targetX = targetNode.position.x;
  const targetY = targetNode.position.y + NODE_HEIGHT / 2;

  const path = getBezierPath(sourceX, sourceY, targetX, targetY);
  
  // Calculate label position at midpoint of curve
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2 - 8;

  return (
    <g>
      {/* Shadow/glow for highlighted connections */}
      {isHighlighted && (
        <path
          d={path}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="6"
          strokeOpacity="0.3"
          className="transition-all duration-300"
        />
      )}
      
      {/* Main connection line */}
      <path
        d={path}
        fill="none"
        stroke={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))"}
        strokeWidth="2"
        className="transition-all duration-300"
      />
      
      {/* Arrow marker at end */}
      <circle
        cx={targetX}
        cy={targetY}
        r={4}
        fill={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))"}
        className="transition-all duration-300"
      />
      
      {/* Connection port on source node */}
      <circle
        cx={sourceX}
        cy={sourceY}
        r={4}
        fill={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
        stroke="hsl(var(--card))"
        strokeWidth="2"
        className="transition-all duration-300"
      />

      {/* Option label */}
      {optionLabel && (
        <g>
          <rect
            x={labelX - optionLabel.length * 3.5 - 6}
            y={labelY - 8}
            width={optionLabel.length * 7 + 12}
            height={16}
            rx={4}
            fill="hsl(var(--card))"
            stroke={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))"}
            strokeWidth="1"
          />
          <text
            x={labelX}
            y={labelY + 4}
            textAnchor="middle"
            fontSize="10"
            fill={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
            className="select-none"
          >
            {optionLabel.length > 15 ? optionLabel.substring(0, 15) + '...' : optionLabel}
          </text>
        </g>
      )}
    </g>
  );
}

export const ConnectionLines = memo(function ConnectionLines({ 
  nodes, 
  selectedNodeId 
}: ConnectionLinesProps) {
  const connections: Array<{
    sourceNode: ScriptNode;
    targetNode: ScriptNode;
    optionLabel?: string;
    isHighlighted: boolean;
  }> = [];

  nodes.forEach(node => {
    // Get connections from options (which have targetNodeId)
    node.options?.forEach(option => {
      if (option.targetNodeId) {
        const targetNode = nodes.find(n => n.id === option.targetNodeId);
        if (targetNode) {
          connections.push({
            sourceNode: node,
            targetNode,
            optionLabel: option.label,
            isHighlighted: selectedNodeId === node.id || selectedNodeId === targetNode.id
          });
        }
      }
    });

    // Also check direct connections array for any that aren't covered by options
    node.connections.forEach(targetId => {
      const alreadyAdded = connections.some(
        c => c.sourceNode.id === node.id && c.targetNode.id === targetId
      );
      if (!alreadyAdded) {
        const targetNode = nodes.find(n => n.id === targetId);
        if (targetNode) {
          connections.push({
            sourceNode: node,
            targetNode,
            isHighlighted: selectedNodeId === node.id || selectedNodeId === targetNode.id
          });
        }
      }
    });
  });

  return (
    <svg 
      className="absolute inset-0 pointer-events-none overflow-visible" 
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="hsl(var(--border))"
          />
        </marker>
        <marker
          id="arrowhead-highlighted"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="hsl(var(--primary))"
          />
        </marker>
      </defs>
      
      {connections.map(({ sourceNode, targetNode, optionLabel, isHighlighted }) => (
        <ConnectionLine
          key={`${sourceNode.id}-${targetNode.id}-${optionLabel || 'direct'}`}
          sourceNode={sourceNode}
          targetNode={targetNode}
          optionLabel={optionLabel}
          isHighlighted={isHighlighted}
        />
      ))}
    </svg>
  );
});
