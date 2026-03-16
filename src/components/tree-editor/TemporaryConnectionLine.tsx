import { memo } from 'react';

interface TemporaryConnectionLineProps {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

function getBezierPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): string {
  const distance = Math.abs(targetX - sourceX);
  const curveOffset = Math.min(distance * 0.5, 150);

  const controlPoint1X = sourceX + curveOffset;
  const controlPoint1Y = sourceY;
  const controlPoint2X = targetX - curveOffset;
  const controlPoint2Y = targetY;

  return `M ${sourceX} ${sourceY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${targetX} ${targetY}`;
}

export const TemporaryConnectionLine = memo(function TemporaryConnectionLine({
  sourceX,
  sourceY,
  targetX,
  targetY
}: TemporaryConnectionLineProps) {
  const path = getBezierPath(sourceX, sourceY, targetX, targetY);

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible z-50"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Animated glow effect */}
      <path
        d={path}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="6"
        strokeOpacity="0.3"
        className="animate-pulse"
      />
      
      {/* Main dashed line */}
      <path
        d={path}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeDasharray="8,4"
        strokeLinecap="round"
        className="animate-dash"
      />
      
      {/* Target indicator circle */}
      <circle
        cx={targetX}
        cy={targetY}
        r={8}
        fill="hsl(var(--primary))"
        fillOpacity="0.3"
        className="animate-pulse"
      />
      <circle
        cx={targetX}
        cy={targetY}
        r={4}
        fill="hsl(var(--primary))"
      />
    </svg>
  );
});
