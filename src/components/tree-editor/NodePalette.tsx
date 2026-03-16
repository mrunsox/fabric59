import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NodeType, NodeCategory } from '@/types/script';
import { nodeCategories, getNodesByCategory, NodeTypeConfig } from '@/config/nodeTypes';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NodePaletteProps {
  onAddNode: (type: NodeType) => void;
}

function NodePaletteItem({ 
  config, 
  onAdd, 
  index 
}: { 
  config: NodeTypeConfig; 
  onAdd: () => void; 
  index: number;
}) {
  const Icon = config.icon;
  
  return (
    <motion.button
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onAdd}
      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all duration-200 text-left group"
    >
      <div className={cn(
        "w-8 h-8 rounded-md flex items-center justify-center text-white shrink-0",
        config.bgClass
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-card-foreground group-hover:text-accent-foreground">
          {config.label}
        </p>
        <p className="text-[10px] text-muted-foreground truncate leading-tight">
          {config.description}
        </p>
      </div>
    </motion.button>
  );
}

function CategorySection({ 
  category, 
  onAddNode,
  searchQuery,
  defaultExpanded = false
}: { 
  category: typeof nodeCategories[0]; 
  onAddNode: (type: NodeType) => void;
  searchQuery: string;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const nodes = getNodesByCategory(category.id);
  
  // Filter nodes by search query
  const filteredNodes = searchQuery 
    ? nodes.filter(n => 
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : nodes;
  
  // If searching and no matches, don't show category
  if (searchQuery && filteredNodes.length === 0) return null;
  
  // Auto-expand when searching
  const shouldExpand = searchQuery ? true : isExpanded;

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 hover:bg-accent/50 transition-colors"
      >
        {shouldExpand ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <div className="flex-1 text-left">
          <span className="text-sm font-medium">{category.label}</span>
          <span className="text-xs text-muted-foreground ml-2">
            ({filteredNodes.length})
          </span>
        </div>
      </button>
      
      <AnimatePresence>
        {shouldExpand && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1.5">
              {filteredNodes.map((config, index) => (
                <NodePaletteItem
                  key={config.type}
                  config={config}
                  onAdd={() => onAddNode(config.type)}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Add Node
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="py-1">
          {nodeCategories.map((category, index) => (
            <CategorySection
              key={category.id}
              category={category}
              onAddNode={onAddNode}
              searchQuery={searchQuery}
              defaultExpanded={index === 0}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
