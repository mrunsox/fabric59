import { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { nodeTypeConfigs } from '@/config/nodeTypes';
import { FlowNodeData } from './types';
import { cn } from '@/lib/utils';

function CustomNode({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData & { 
    isValidConnectionTarget?: boolean;
    isReconnecting?: boolean;
  };
  const config = nodeTypeConfigs[nodeData.type];
  const Icon = config?.icon;

  // For question nodes, create multiple output handles based on options
  const isQuestionNode = nodeData.type === 'question';
  const options = nodeData.options || [];
  
  // Ghost highlight when this is a valid reconnection target
  const isGhostHighlighted = nodeData.isReconnecting && nodeData.isValidConnectionTarget;

  // Calculate handle positions for question node
  const handlePositions = useMemo(() => {
    if (!isQuestionNode || options.length === 0) return [];
    
    const handleCount = options.length;
    const positions: { id: string; label: string; leftPercent: number }[] = [];
    
    // Distribute handles evenly across the bottom
    for (let i = 0; i < handleCount; i++) {
      const leftPercent = ((i + 1) / (handleCount + 1)) * 100;
      positions.push({
        id: options[i].id,
        label: options[i].label,
        leftPercent,
      });
    }
    
    return positions;
  }, [isQuestionNode, options]);

  return (
    <div
      className={cn(
        'relative bg-card border-2 rounded-xl shadow-lg min-w-[200px] max-w-[280px] transition-all duration-200',
        selected 
          ? 'border-primary shadow-primary/20' 
          : 'border-border hover:border-primary/50',
        config?.colorClass,
        // Ghost highlight effect
        isGhostHighlighted && 'ring-4 ring-emerald-400/60 ring-offset-2 ring-offset-background border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.4)] animate-pulse'
      )}
    >
      {/* Ghost highlight indicator badge */}
      {isGhostHighlighted && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center shadow-lg z-20 animate-bounce">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      )}

      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!w-4 !h-4 !border-2 !border-background !-top-2 hover:!scale-125 transition-all",
          isGhostHighlighted 
            ? "!bg-emerald-400 !w-6 !h-6 !-top-3 animate-pulse" 
            : "!bg-primary"
        )}
      />

      {nodeData.sequenceNo && (
        <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md z-10">
          {nodeData.sequenceNo}
        </div>
      )}

      <div className={cn(
        'flex items-center gap-2 px-3 py-2 border-b border-border rounded-t-xl',
        config?.bgClass && `${config.bgClass}/10`
      )}>
        {Icon && (
          <div className={cn('p-1.5 rounded-lg', config?.bgClass)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-foreground truncate">{nodeData.label}</h4>
          <p className="text-xs text-muted-foreground">{config?.label}</p>
        </div>
      </div>

      <div className="px-3 py-2">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {nodeData.content}
        </p>
        
        {/* Show options as badges with connection indicators for question nodes */}
        {isQuestionNode && options.length > 0 && (
          <div className="mt-3 space-y-1.5 pb-2">
            {options.map((opt, index) => (
              <div 
                key={opt.id} 
                className="flex items-center gap-2 text-xs"
              >
                <span 
                  className="w-4 h-4 rounded-full bg-primary/20 border border-primary text-[10px] font-bold flex items-center justify-center text-primary"
                >
                  {index + 1}
                </span>
                <span className="px-2 py-1 bg-muted rounded-md flex-1 truncate">
                  {opt.label}
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* Show options as badges for other node types */}
        {!isQuestionNode && nodeData.options && nodeData.options.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {nodeData.options.slice(0, 3).map((opt) => (
              <span key={opt.id} className="text-xs px-2 py-0.5 bg-muted rounded-full">
                {opt.label}
              </span>
            ))}
            {nodeData.options.length > 3 && (
              <span className="text-xs text-muted-foreground">+{nodeData.options.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* For question nodes, render multiple output handles */}
      {isQuestionNode && handlePositions.length > 0 ? (
        <div className="relative h-6">
          {handlePositions.map((handle, index) => (
            <div
              key={handle.id}
              className="absolute -bottom-2 transform -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${handle.leftPercent}%` }}
            >
              <span className="text-[9px] font-medium text-muted-foreground mb-0.5 whitespace-nowrap max-w-[60px] truncate">
                {handle.label}
              </span>
              <Handle
                type="source"
                position={Position.Bottom}
                id={handle.id}
                className={cn(
                  "!w-3.5 !h-3.5 !border-2 !border-background hover:!scale-125 transition-transform",
                  index % 2 === 0 
                    ? "!bg-emerald-500" 
                    : "!bg-rose-500"
                )}
                style={{ position: 'relative', left: 0, top: 0 }}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Default single output handle for non-question nodes */
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-4 !h-4 !bg-primary !border-2 !border-background !-bottom-2 hover:!scale-125 transition-transform"
        />
      )}
    </div>
  );
}

export default memo(CustomNode);
