import { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
  BackgroundVariant,
  SelectionMode,
  useReactFlow,
  ReactFlowProvider,
  NodeChange,
  EdgeChange,
  OnReconnect,
  reconnectEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, 
  FileUp, 
  Layers,
  MousePointer,
  Trash2,
  Unlink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';
import { FlowNode, FlowEdge, FlowNodeData, IndustryTemplate } from './types';
import { useAutoLayout } from './useAutoLayout';
import { TemplateModal } from './TemplateModal';
import { TemplateLoadingOverlay } from './TemplateLoadingOverlay';
import { EdgeContextMenu } from './EdgeContextMenu';

import { CanvasSearch } from './CanvasSearch';
import { NodeType } from '@/types/script';
import { nodeTypeConfigs } from '@/config/nodeTypes';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

export interface FlowCanvasRef {
  addNodeAtCenter: (type: NodeType) => void;
}

interface FlowCanvasProps {
  initialNodes?: FlowNode[];
  initialEdges?: FlowEdge[];
  onNodesChange?: (nodes: FlowNode[]) => void;
  onEdgesChange?: (edges: FlowEdge[]) => void;
  onNodeSelect?: (node: FlowNode | null) => void;
  onAddNode?: (type: NodeType, position: { x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string, nodeName: string) => void;
}

// Edge context menu state
interface EdgeContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  edgeId: string;
}

const FlowCanvasInner = forwardRef<FlowCanvasRef, FlowCanvasProps>(({
  initialNodes = [],
  initialEdges = [],
  onNodesChange: onNodesChangeCallback,
  onEdgesChange: onEdgesChangeCallback,
  onNodeSelect,
  onAddNode,
  onDeleteNode,
}, ref) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(initialEdges);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [loadingTemplateName, setLoadingTemplateName] = useState<string | undefined>();
  const [isPanning, setIsPanning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectSourceId, setReconnectSourceId] = useState<string | null>(null);
  const [edgeContextMenu, setEdgeContextMenu] = useState<EdgeContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    edgeId: '',
  });
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { getLayoutedElements } = useAutoLayout();
  const { screenToFlowPosition, fitView, getViewport } = useReactFlow();
  const isInitialMount = useRef(true);

  // Helper to create default content/options for node types
  const getDefaultContent = (type: NodeType): string => {
    const contentTypes = ['content', 'question'];
    if (contentTypes.includes(type)) {
      return type === 'question' ? '<p>Enter your question here...</p>' : '<p>Enter your content here...</p>';
    }
    if (type === 'end') return 'Call completed';
    return '';
  };

  const getDefaultOptions = (type: NodeType) => {
    if (type === 'question') {
      return [
        { id: crypto.randomUUID(), label: 'Yes', nextNodeId: null },
        { id: crypto.randomUUID(), label: 'No', nextNodeId: null },
      ];
    }
    return undefined;
  };

  // Handle edge context menu
  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edgeId: string) => {
    event.preventDefault();
    setEdgeContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      edgeId,
    });
  }, []);

  // Close edge context menu
  const closeEdgeContextMenu = useCallback(() => {
    setEdgeContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Delete edge from context menu
  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges(eds => {
      const newEdges = eds.filter(e => e.id !== edgeId);
      setTimeout(() => {
        onEdgesChangeCallback?.(newEdges);
      }, 0);
      return newEdges;
    });
    toast.success('Connection removed!');
  }, [setEdges, onEdgesChangeCallback]);

  // Get edge label based on source node and handle
  const getEdgeLabel = useCallback((edge: FlowEdge): string | undefined => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    if (!sourceNode) return undefined;
    
    const data = sourceNode.data as FlowNodeData;
    
    // For question nodes with options, try to find the matching option label
    if (data.type === 'question' && data.options && data.options.length > 0) {
      // If edge has sourceHandle, try to match by option ID
      if (edge.sourceHandle && edge.sourceHandle !== 'source') {
        const option = data.options.find(opt => opt.id === edge.sourceHandle);
        if (option) return option.label;
      }
      
      // Otherwise, try to infer from edge position or index
      const edgesFromSource = edges.filter(e => e.source === edge.source);
      const edgeIndex = edgesFromSource.findIndex(e => e.id === edge.id);
      if (edgeIndex >= 0 && edgeIndex < data.options.length) {
        return data.options[edgeIndex].label;
      }
    }
    
    // For logic nodes with rules
    if (data.type === 'logic' && data.logicRules && data.logicRules.length > 0) {
      const edgesFromSource = edges.filter(e => e.source === edge.source);
      const edgeIndex = edgesFromSource.findIndex(e => e.id === edge.id);
      if (edgeIndex >= 0 && edgeIndex < data.logicRules.length) {
        return `Rule ${edgeIndex + 1}`;
      }
      if (edgeIndex === data.logicRules.length) {
        return 'Default';
      }
    }
    
    // For A/B test nodes
    if (data.type === 'ab-test' && data.abTestConfig?.variants) {
      const edgesFromSource = edges.filter(e => e.source === edge.source);
      const edgeIndex = edgesFromSource.findIndex(e => e.id === edge.id);
      const variant = data.abTestConfig.variants[edgeIndex];
      if (variant) {
        return `${variant.name} (${variant.weight}%)`;
      }
    }
    
    return undefined;
  }, [nodes, edges]);

  // Process edges to add context menu handler and labels
  const processedEdges = edges.map(edge => ({
    ...edge,
    type: 'custom',
    data: {
      ...edge.data,
      onContextMenu: handleEdgeContextMenu,
      label: getEdgeLabel(edge),
      sourceNodeType: (nodes.find(n => n.id === edge.source)?.data as FlowNodeData)?.type,
    },
  }));

  // Expose method to add node at center - directly adds to internal state
  useImperativeHandle(ref, () => ({
    addNodeAtCenter: (type: NodeType) => {
      const wrapper = reactFlowWrapper.current;
      let position = { x: 300 + Math.random() * 200, y: 200 + Math.random() * 100 };
      
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        const viewport = getViewport();
        
        // Calculate center of viewport in flow coordinates
        const centerX = (rect.width / 2 - viewport.x) / viewport.zoom;
        const centerY = (rect.height / 2 - viewport.y) / viewport.zoom;
        
        // Add some randomness to avoid stacking
        const offsetX = (Math.random() - 0.5) * 200;
        const offsetY = (Math.random() - 0.5) * 100;
        
        position = { x: centerX + offsetX, y: centerY + offsetY };
      }
      
      // Create the node directly
      const config = nodeTypeConfigs[type];
      const newNode: FlowNode = {
        id: crypto.randomUUID(),
        type: 'custom',
        position,
        data: {
          label: `New ${config.label}`,
          type,
          content: getDefaultContent(type),
          options: getDefaultOptions(type),
        },
      };
      
      // Add directly to internal state
      setNodes(currentNodes => {
        const updatedNodes = [...currentNodes, newNode];
        // Notify parent after state update
        setTimeout(() => {
          onNodesChangeCallback?.(updatedNodes);
        }, 0);
        return updatedNodes;
      });
    }
  }), [getViewport, setNodes, onNodesChangeCallback]);

  // Sync external state when it changes (handle adds/deletes from parent)
  const prevNodesLengthRef = useRef(initialNodes.length);
  const prevEdgesLengthRef = useRef(initialEdges.length);
  const prevNodesDataRef = useRef<string>(JSON.stringify(initialNodes.map(n => n.data)));
  
  useEffect(() => {
    // On initial mount
    if (isInitialMount.current && initialNodes.length > 0) {
      setNodes(initialNodes);
      isInitialMount.current = false;
      prevNodesLengthRef.current = initialNodes.length;
      prevNodesDataRef.current = JSON.stringify(initialNodes.map(n => n.data));
      return;
    }
    
    // Detect if nodes were added, removed, OR updated externally
    const currentDataHash = JSON.stringify(initialNodes.map(n => n.data));
    if (initialNodes.length !== prevNodesLengthRef.current || currentDataHash !== prevNodesDataRef.current) {
      setNodes(initialNodes);
    }
    prevNodesLengthRef.current = initialNodes.length;
    prevNodesDataRef.current = currentDataHash;
  }, [initialNodes, setNodes]);

  useEffect(() => {
    if (isInitialMount.current && initialEdges.length > 0) {
      setEdges(initialEdges);
      prevEdgesLengthRef.current = initialEdges.length;
      return;
    }
    
    // Detect if edges changed externally (added or removed)
    if (initialEdges.length !== prevEdgesLengthRef.current) {
      setEdges(initialEdges);
    }
    prevEdgesLengthRef.current = initialEdges.length;
  }, [initialEdges, setEdges]);

  // Notify parent of changes - debounced to prevent loops
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Custom node change handler that notifies parent
  const handleNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => {
    onNodesChange(changes);
    
    // Notify parent after a small delay to batch changes
    requestAnimationFrame(() => {
      onNodesChangeCallback?.(nodesRef.current);
    });
  }, [onNodesChange, onNodesChangeCallback]);

  // Custom edge change handler that notifies parent
  const handleEdgesChange = useCallback((changes: EdgeChange<FlowEdge>[]) => {
    onEdgesChange(changes);
    
    requestAnimationFrame(() => {
      onEdgesChangeCallback?.(edgesRef.current);
    });
  }, [onEdgesChange, onEdgesChangeCallback]);

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source === params.target) {
        toast.error("Cannot connect a node to itself");
        return;
      }
      
      const exists = edges.some(
        e => e.source === params.source && e.target === params.target
      );
      if (exists) {
        toast.error("Connection already exists");
        return;
      }

      const newEdge = { 
        ...params, 
        id: `${params.source}-${params.target}`, 
        type: 'custom',
      } as FlowEdge;
      setEdges(eds => addEdge(newEdge, eds) as FlowEdge[]);
      
      setTimeout(() => {
        onEdgesChangeCallback?.(edgesRef.current);
      }, 0);
      
      toast.success("Connection created!");
    },
    [edges, setEdges, onEdgesChangeCallback]
  );

  // Handle edge reconnection start
  const onReconnectStart = useCallback((_: React.MouseEvent, edge: FlowEdge) => {
    setIsReconnecting(true);
    setReconnectSourceId(edge.source);
  }, []);

  // Handle edge reconnection
  const onReconnect: OnReconnect = useCallback((oldEdge, newConnection) => {
    setIsReconnecting(false);
    setReconnectSourceId(null);
    
    if (newConnection.source === newConnection.target) {
      toast.error("Cannot connect a node to itself");
      return;
    }
    
    setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds) as FlowEdge[]);
    
    setTimeout(() => {
      onEdgesChangeCallback?.(edgesRef.current);
    }, 0);
    
    toast.success("Connection updated!");
  }, [setEdges, onEdgesChangeCallback]);

  // Handle edge reconnection end
  const onReconnectEnd = useCallback(() => {
    setIsReconnecting(false);
    setReconnectSourceId(null);
  }, []);

  // Handle node selection
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      setSelectedNodeId(node.id);
      onNodeSelect?.(node);
    },
    [onNodeSelect]
  );

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    onNodeSelect?.(null);
    closeEdgeContextMenu();
  }, [onNodeSelect, closeEdgeContextMenu]);

  // Auto-layout functionality with sequence numbering
  const handleAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    
    setTimeout(() => {
      fitView({ padding: 0.2 });
      onNodesChangeCallback?.(layoutedNodes);
      onEdgesChangeCallback?.(layoutedEdges as FlowEdge[]);
    }, 50);
    toast.success("Layout applied!");
  }, [nodes, edges, getLayoutedElements, setNodes, setEdges, fitView, onNodesChangeCallback, onEdgesChangeCallback]);

  // Load template with loading animation and instant sequence numbering
  const handleLoadTemplate = useCallback((template: IndustryTemplate) => {
    // Show loading overlay immediately
    setIsLoadingTemplate(true);
    setLoadingTemplateName(template.name);
    
    // Close modal
    setIsTemplateModalOpen(false);
    
    // Use requestAnimationFrame to ensure the loading state is rendered
    requestAnimationFrame(() => {
      isInitialMount.current = false;
      
      // Update refs for length tracking
      prevNodesLengthRef.current = template.nodes.length;
      prevEdgesLengthRef.current = template.edges.length;
      
      // Calculate layout and sequence numbers BEFORE setting state
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        template.nodes, 
        template.edges
      );
      
      // Set the already-layouted nodes with sequence numbers
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      
      // Notify parent and fit view
      setTimeout(() => {
        onNodesChangeCallback?.(layoutedNodes);
        onEdgesChangeCallback?.(layoutedEdges as FlowEdge[]);
        
        fitView({ padding: 0.2 });
        
        // Hide loading overlay after a brief moment for smooth transition
        setTimeout(() => {
          setIsLoadingTemplate(false);
          setLoadingTemplateName(undefined);
          toast.success(`Loaded "${template.name}" with ${layoutedNodes.length} nodes`);
        }, 300);
      }, 100);
    });
  }, [setNodes, setEdges, getLayoutedElements, onNodesChangeCallback, onEdgesChangeCallback, fitView]);

  // Handle drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!nodeType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      onAddNode?.(nodeType, position);
    },
    [screenToFlowPosition, onAddNode]
  );

  // Handle delete key press - delete selected nodes OR edges
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPanning(true);
      }
      
      // Delete selected node or edge
      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        // Prevent if we're in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        
        // Use the ref to get current nodes and edges
        const currentNodes = nodesRef.current;
        const currentEdges = edgesRef.current;
        
        // Find selected node from nodes with selected flag (React Flow sets this)
        const nodeToDelete = currentNodes.find(n => n.selected);
        
        // Find selected edge (React Flow sets selected flag on edges too)
        const edgeToDelete = currentEdges.find(edge => edge.selected);
        
        // Delete node if selected
        if (nodeToDelete && onDeleteNode) {
          e.preventDefault();
          e.stopPropagation();
          onDeleteNode(nodeToDelete.id, nodeToDelete.data.label);
          return;
        }
        
        // Delete edge if selected
        if (edgeToDelete) {
          e.preventDefault();
          e.stopPropagation();
          handleDeleteEdge(edgeToDelete.id);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPanning(false);
      }
    };
    
    // Use window listener for keyboard events
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onDeleteNode, handleDeleteEdge]);

  // Track selected edge for UI hint
  const selectedEdge = edges.find(e => e.selected);

  // Get selected node for delete hint - check both local state and React Flow's selection
  const selectedFromStateForHint = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
  const selectedFromFlowForHint = nodes.find(n => n.selected);
  const selectedNode = selectedFromStateForHint || selectedFromFlowForHint;

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative" tabIndex={0}>
      {/* Template loading overlay */}
      <AnimatePresence>
        <TemplateLoadingOverlay 
          isLoading={isLoadingTemplate} 
          templateName={loadingTemplateName}
        />
      </AnimatePresence>

      <ReactFlow
        nodes={nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            isValidConnectionTarget: isReconnecting && node.id !== reconnectSourceId,
            isReconnecting,
          }
        }))}
        edges={processedEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        panOnDrag={true}
        panOnScroll={isPanning}
        selectionOnDrag={!isPanning}
        selectionMode={SelectionMode.Partial}
        nodesDraggable={true}
        nodesConnectable={true}
        edgesReconnectable={true}
        edgesFocusable={true}
        deleteKeyCode={null}
        className="bg-background"
        defaultEdgeOptions={{
          type: 'custom',
          style: { strokeWidth: 2 },
          animated: false,
        }}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="hsl(var(--muted-foreground) / 0.2)" 
        />
        
        <Controls 
          className="!bg-card !border-border !rounded-lg !shadow-lg"
          showZoom={true}
          showFitView={true}
          showInteractive={false}
        />


        {/* Search functionality */}
        <CanvasSearch 
          nodes={nodes} 
          onHighlightNodes={setHighlightedNodeIds} 
        />

        {/* Canvas tools panel */}
        <Panel position="top-right" className="flex gap-2">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-2"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTemplateModalOpen(true)}
              className="bg-card"
            >
              <FileUp className="w-4 h-4 mr-2" />
              Load Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoLayout}
              className="bg-card"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Auto Layout
            </Button>
          </motion.div>
        </Panel>

        {/* Keyboard hints */}
        <Panel position="top-left" className="flex flex-col gap-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-1.5"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border">
              <MousePointer className="w-3 h-3" />
              <span>Click + drag to select</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border">
              <Layers className="w-3 h-3" />
              <span>Space + drag to pan</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border">
              <Unlink className="w-3 h-3" />
              <span>Right-click edge to disconnect</span>
            </div>
            {selectedNode && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-destructive/30">
                <Trash2 className="w-3 h-3" />
                <span>Press Del to delete "{selectedNode.data.label}"</span>
              </div>
            )}
            {selectedEdge && !selectedNode && (
              <div className="flex items-center gap-2 text-xs text-orange-500 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-orange-500/30">
                <Unlink className="w-3 h-3" />
                <span>Press Del to disconnect nodes</span>
              </div>
            )}
          </motion.div>
        </Panel>

        {/* Empty state */}
        {nodes.length === 0 && !isLoadingTemplate && (
          <Panel position="top-center" className="mt-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center p-8 bg-card/90 backdrop-blur-sm rounded-2xl border border-border shadow-lg"
            >
              <Layers className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Start Building Your Script
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Drag nodes from the palette on the right, or load a template to get started
              </p>
              <Button onClick={() => setIsTemplateModalOpen(true)}>
                <FileUp className="w-4 h-4 mr-2" />
                Browse Templates
              </Button>
            </motion.div>
          </Panel>
        )}
      </ReactFlow>

      {/* Edge context menu */}
      <EdgeContextMenu
        isOpen={edgeContextMenu.isOpen}
        position={edgeContextMenu.position}
        edgeId={edgeContextMenu.edgeId}
        onDisconnect={() => handleDeleteEdge(edgeContextMenu.edgeId)}
        onDelete={() => handleDeleteEdge(edgeContextMenu.edgeId)}
        onClose={closeEdgeContextMenu}
      />

      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleLoadTemplate}
      />
    </div>
  );
});

FlowCanvasInner.displayName = 'FlowCanvasInner';

// Wrap with ReactFlowProvider
export const FlowCanvas = forwardRef<FlowCanvasRef, FlowCanvasProps>((props, ref) => {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} ref={ref} />
    </ReactFlowProvider>
  );
});

FlowCanvas.displayName = 'FlowCanvas';
