import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ConnectionPortProps {
  type: 'input' | 'output';
  nodeId: string;
  position: { x: number; y: number };
  isHighlighted?: boolean;
  isValidTarget?: boolean;
  onStartConnection?: (nodeId: string, x: number, y: number) => void;
  onEndConnection?: (nodeId: string) => void;
}

const NODE_WIDTH = 280;
const NODE_HEIGHT_OFFSET = 60;

export function ConnectionPort({
  type,
  nodeId,
  position,
  isHighlighted = false,
  isValidTarget = false,
  onStartConnection,
  onEndConnection
}: ConnectionPortProps) {
  const portX = type === 'output' ? position.x + NODE_WIDTH : position.x;
  const portY = position.y + NODE_HEIGHT_OFFSET;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (type === 'output' && onStartConnection) {
      e.stopPropagation();
      e.preventDefault();
      onStartConnection(nodeId, portX, portY);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (type === 'input' && onEndConnection) {
      e.stopPropagation();
      onEndConnection(nodeId);
    }
  };

  const handleMouseEnter = () => {
    if (type === 'input' && isValidTarget) {
      // Visual feedback handled by parent
    }
  };

  return (
    <motion.div
      className={cn(
        "absolute w-5 h-5 rounded-full cursor-crosshair z-10 flex items-center justify-center",
        "transition-all duration-200",
        type === 'output' ? "-right-2.5" : "-left-2.5",
        "top-1/2 -translate-y-1/2"
      )}
      style={{
        left: type === 'output' ? 'auto' : -10,
        right: type === 'output' ? -10 : 'auto',
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleMouseEnter}
      whileHover={{ scale: 1.3 }}
      whileTap={{ scale: 0.9 }}
    >
      {/* Outer ring for hover effect */}
      <div className={cn(
        "absolute inset-0 rounded-full transition-all duration-200",
        isValidTarget && "ring-4 ring-primary/30 animate-pulse"
      )} />
      
      {/* Main port circle */}
      <div className={cn(
        "w-4 h-4 rounded-full border-2 transition-all duration-200",
        type === 'output' 
          ? "bg-primary border-primary-foreground hover:bg-primary/80" 
          : "bg-muted-foreground border-card hover:bg-muted-foreground/80",
        isHighlighted && "ring-2 ring-primary ring-offset-1",
        isValidTarget && "bg-green-500 border-green-400 scale-125"
      )} />
      
      {/* Plus icon for output port */}
      {type === 'output' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-2 h-0.5 bg-primary-foreground rounded-full" />
          <div className="absolute w-0.5 h-2 bg-primary-foreground rounded-full" />
        </div>
      )}
    </motion.div>
  );
}
