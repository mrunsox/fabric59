import { useState, useCallback, useEffect, useRef } from 'react';
import { Panel, useReactFlow } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronUp, ChevronDown, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FlowNode, FlowNodeData } from './types';
import { nodeTypeConfigs } from '@/config/nodeTypes';
import { cn } from '@/lib/utils';

interface CanvasSearchProps {
  nodes: FlowNode[];
  onHighlightNodes: (nodeIds: string[]) => void;
}

interface SearchResult {
  node: FlowNode;
  matchType: 'label' | 'content' | 'type';
}

export function CanvasSearch({ nodes, onHighlightNodes }: CanvasSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { fitView, setCenter, getZoom } = useReactFlow();

  // Search logic
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      onHighlightNodes([]);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const matches: SearchResult[] = [];

    nodes.forEach(node => {
      const data = node.data as FlowNodeData;
      
      // Match by label
      if (data.label.toLowerCase().includes(lowerQuery)) {
        matches.push({ node, matchType: 'label' });
        return;
      }
      
      // Match by content
      if (data.content?.toLowerCase().includes(lowerQuery)) {
        matches.push({ node, matchType: 'content' });
        return;
      }
      
      // Match by type
      const config = nodeTypeConfigs[data.type];
      if (config?.label.toLowerCase().includes(lowerQuery)) {
        matches.push({ node, matchType: 'type' });
      }
    });

    setResults(matches);
    setSelectedIndex(0);
    onHighlightNodes(matches.map(m => m.node.id));
  }, [nodes, onHighlightNodes]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Navigate to node
  const navigateToNode = useCallback((node: FlowNode) => {
    const zoom = Math.max(getZoom(), 1);
    setCenter(
      node.position.x + 140, // Center on node (approximate width/2)
      node.position.y + 60,  // Center on node (approximate height/2)
      { zoom, duration: 400 }
    );
  }, [setCenter, getZoom]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        onHighlightNodes([]);
        return;
      }

      if (results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        navigateToNode(results[selectedIndex].node);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, navigateToNode, onHighlightNodes]);

  // Global shortcut to open search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <>
      {/* Search toggle button */}
      {!isOpen && (
        <Panel position="top-center" className="!top-3 z-20">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(true)}
              className="bg-card shadow-lg"
            >
              <Search className="w-4 h-4 mr-2" />
              Search Nodes
              <kbd className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                ⌘F
              </kbd>
            </Button>
          </motion.div>
        </Panel>
      )}

      {/* Search panel */}
      <AnimatePresence>
        {isOpen && (
          <Panel position="top-center" className="!top-3 z-20">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="w-[360px] bg-card rounded-xl border border-border shadow-2xl overflow-hidden"
            >
              {/* Search input */}
              <div className="flex items-center gap-2 p-3 border-b border-border">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, content, or type..."
                  className="border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    setQuery('');
                    onHighlightNodes([]);
                  }}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Results */}
              {query && (
                <div className="max-h-[280px] overflow-y-auto">
                  {results.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No nodes found matching "{query}"
                    </div>
                  ) : (
                    <div className="p-1">
                      {results.map((result, index) => {
                        const data = result.node.data as FlowNodeData;
                        const config = nodeTypeConfigs[data.type];
                        const Icon = config?.icon;
                        
                        return (
                          <button
                            key={result.node.id}
                            onClick={() => navigateToNode(result.node)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                              index === selectedIndex
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-muted'
                            )}
                          >
                            {Icon && (
                              <div className={cn('p-1.5 rounded-lg', config?.bgClass)}>
                                <Icon className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">
                                  {data.label}
                                </span>
                                {data.sequenceNo && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                                    #{data.sequenceNo}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {result.matchType === 'type' 
                                  ? `Type: ${config?.label}`
                                  : result.matchType === 'content'
                                  ? data.content?.replace(/<[^>]*>/g, '').slice(0, 40) + '...'
                                  : config?.label
                                }
                              </div>
                            </div>
                            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Footer with navigation hints */}
              {results.length > 0 && (
                <div className="px-3 py-2 bg-muted/50 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-muted">↑</kbd>
                    <kbd className="px-1 py-0.5 rounded bg-muted">↓</kbd>
                    <span>to navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-muted">Enter</kbd>
                    <span>to jump</span>
                  </div>
                  <span>{results.length} found</span>
                </div>
              )}
            </motion.div>
          </Panel>
        )}
      </AnimatePresence>
    </>
  );
}