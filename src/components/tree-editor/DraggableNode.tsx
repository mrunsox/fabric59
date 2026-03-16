import { motion } from 'framer-motion';
import { ScriptNode } from '@/types/script';
import { 
  FormInput,
  GripVertical,
  Trash2,
  Settings,
  Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDraggableNode } from '@/hooks/useDraggableNode';
import { getNodeConfig } from '@/config/nodeTypes';

interface DraggableNodeProps {
  node: ScriptNode;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPositionChange: (position: { x: number; y: number }) => void;
  zoom: number;
  isDrawingConnection?: boolean;
  isValidConnectionTarget?: boolean;
  onStartConnection?: (nodeId: string, x: number, y: number) => void;
  onEndConnection?: (nodeId: string) => void;
}

export function DraggableNode({ 
  node, 
  isSelected, 
  onSelect, 
  onDelete,
  onPositionChange,
  zoom,
  isDrawingConnection = false,
  isValidConnectionTarget = false,
  onStartConnection,
  onEndConnection
}: DraggableNodeProps) {
  const config = getNodeConfig(node.type);
  const Icon = config.icon;

  const { position, isDragging, handleMouseDown } = useDraggableNode({
    initialPosition: node.position,
    onPositionChange,
    zoom
  });

  const connectionCount = (node.options?.filter(o => o.targetNodeId).length || 0) + node.connections.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        x: position.x,
        y: position.y
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ 
        type: isDragging ? 'tween' : 'spring',
        duration: isDragging ? 0 : 0.3,
        stiffness: 300,
        damping: 30
      }}
      style={{ position: 'absolute', left: 0, top: 0 }}
      className={cn(
        "w-[280px] rounded-lg border-l-4 bg-card border border-border transition-shadow duration-200 editor-node",
        config.colorClass,
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-glow",
        isDragging && "shadow-xl cursor-grabbing z-50",
        isValidConnectionTarget && "ring-2 ring-green-500 ring-offset-2 ring-offset-background"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={() => {
        if (isDrawingConnection && isValidConnectionTarget && onEndConnection) {
          onEndConnection(node.id);
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <div 
          data-drag-handle
          className={cn(
            "cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-muted transition-colors",
            isDragging && "cursor-grabbing"
          )}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className={cn("w-6 h-6 rounded flex items-center justify-center text-white", config.bgClass)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="flex-1 font-medium text-sm text-card-foreground truncate">
          {node.title}
        </span>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
          {config.label}
        </span>
      </div>

      {/* Content Preview */}
      <div className="p-3">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {node.content.substring(0, 100)}{node.content.length > 100 ? '...' : ''}
        </p>
      </div>

      {/* Options Preview */}
      {node.options && node.options.length > 0 && (
        <div className="px-3 pb-3">
          <div className="flex flex-wrap gap-1">
            {node.options.slice(0, 3).map((option) => (
              <span 
                key={option.id}
                className={cn(
                  "px-2 py-0.5 text-xs rounded",
                  option.targetNodeId 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {option.label}
              </span>
            ))}
            {node.options.length > 3 && (
              <span className="px-2 py-0.5 text-xs rounded bg-secondary text-secondary-foreground">
                +{node.options.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Input Fields Preview */}
      {node.inputFields && node.inputFields.length > 0 && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FormInput className="w-3 h-3" />
            <span>{node.inputFields.length} input field(s)</span>
          </div>
        </div>
      )}

      {/* Connection indicator */}
      {connectionCount > 0 && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-1 text-xs text-primary">
            <Link2 className="w-3 h-3" />
            <span>{connectionCount} connection(s)</span>
          </div>
        </div>
      )}

      {/* Actions */}
      {isSelected && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-1 p-2 border-t border-border"
        >
          <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs">
            <Settings className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </motion.div>
      )}

      {/* Output Port (right side) - for starting connections */}
      <motion.div
        className={cn(
          "absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full cursor-crosshair z-20",
          "flex items-center justify-center",
          "bg-primary border-2 border-card shadow-md",
          "hover:scale-125 hover:shadow-lg transition-all duration-200",
          "group"
        )}
        whileHover={{ scale: 1.25 }}
        whileTap={{ scale: 0.95 }}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (onStartConnection) {
            const outputX = position.x + 280;
            const outputY = position.y + 60;
            onStartConnection(node.id, outputX, outputY);
          }
        }}
      >
        <div className="w-2.5 h-0.5 bg-primary-foreground rounded-full" />
        <div className="absolute w-0.5 h-2.5 bg-primary-foreground rounded-full" />
      </motion.div>

      {/* Input Port (left side) - for receiving connections */}
      <motion.div
        className={cn(
          "absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full z-20",
          "flex items-center justify-center",
          "bg-muted-foreground border-2 border-card shadow-md",
          "transition-all duration-200",
          isValidConnectionTarget && "bg-green-500 scale-125 ring-4 ring-green-500/30 animate-pulse"
        )}
      >
        <div className="w-2 h-2 rounded-full bg-card" />
      </motion.div>
    </motion.div>
  );
}
