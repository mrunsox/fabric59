import { motion } from 'framer-motion';
import { ScriptNode } from '@/types/script';
import { 
  FormInput, 
  GripVertical,
  Trash2,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getNodeConfig } from '@/config/nodeTypes';

interface EditorNodeProps {
  node: ScriptNode;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function EditorNode({ node, isSelected, onSelect, onDelete }: EditorNodeProps) {
  const config = getNodeConfig(node.type);
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "w-[280px] rounded-lg border-l-4 bg-card border border-border shadow-soft cursor-pointer transition-all duration-200",
        config.colorClass,
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-glow"
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <div className="cursor-grab hover:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="w-6 h-6 rounded flex items-center justify-center bg-secondary">
          <Icon className="w-3.5 h-3.5 text-secondary-foreground" />
        </div>
        <span className="flex-1 font-medium text-sm text-card-foreground truncate">
          {node.title}
        </span>
        <span className="text-xs text-muted-foreground">{config.label}</span>
      </div>

      {/* Content Preview */}
      <div className="p-3">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {node.content.substring(0, 100)}...
        </p>
      </div>

      {/* Options Preview */}
      {node.options && node.options.length > 0 && (
        <div className="px-3 pb-3">
          <div className="flex flex-wrap gap-1">
            {node.options.slice(0, 3).map((option) => (
              <span 
                key={option.id}
                className="px-2 py-0.5 text-xs rounded bg-secondary text-secondary-foreground"
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
    </motion.div>
  );
}
