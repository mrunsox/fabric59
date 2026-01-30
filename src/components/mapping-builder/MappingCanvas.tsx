import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  MarkerType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FieldNode } from "./nodes/FieldNode";
import { MappingEdge } from "./edges/MappingEdge";
import type { FieldMapping, FieldDefinition } from "@/types/mapping";
import type { CRMField } from "@/lib/crm-schemas";

interface MappingCanvasProps {
  mappings: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
  onEdgeClick: (mapping: FieldMapping) => void;
}

const nodeTypes = {
  fieldNode: FieldNode,
};

const edgeTypes = {
  mappingEdge: MappingEdge,
};

export function MappingCanvas({
  mappings,
  onMappingsChange,
  onEdgeClick,
}: MappingCanvasProps) {
  // Convert mappings to nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    mappings.forEach((mapping, index) => {
      const yPos = 80 + index * 100;

      // Source node
      nodes.push({
        id: `source-${mapping.id}`,
        type: "fieldNode",
        position: { x: 50, y: yPos },
        data: {
          field: mapping.sourceField,
          side: "source",
        },
      });

      // Target node
      nodes.push({
        id: `target-${mapping.id}`,
        type: "fieldNode",
        position: { x: 450, y: yPos },
        data: {
          field: mapping.targetField,
          side: "target",
        },
      });

      // Edge connecting them
      edges.push({
        id: `edge-${mapping.id}`,
        source: `source-${mapping.id}`,
        target: `target-${mapping.id}`,
        type: "mappingEdge",
        data: {
          mapping,
          onRemove: () => {
            const newMappings = mappings.filter((m) => m.id !== mapping.id);
            onMappingsChange(newMappings);
          },
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: "hsl(var(--primary))",
        },
        style: {
          stroke: "hsl(var(--primary))",
          strokeWidth: 2,
        },
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [mappings, onMappingsChange]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const onEdgeClickHandler = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const mapping = mappings.find((m) => `edge-${m.id}` === edge.id);
      if (mapping) {
        onEdgeClick(mapping);
      }
    },
    [mappings, onEdgeClick]
  );

  // Handle drop from panels
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const data = event.dataTransfer.getData("application/json");
      if (!data) return;

      try {
        const field = JSON.parse(data) as FieldDefinition | CRMField;
        console.log("Dropped field:", field);
        // In a full implementation, this would create a new node
        // For now, we log it - the user will use the panels to create mappings
      } catch {
        console.error("Failed to parse dropped data");
      }
    },
    []
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <div className="flex-1 h-full" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClickHandler}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background color="hsl(var(--muted-foreground))" gap={20} size={1} />
        <Controls className="bg-card border border-border rounded-lg" />
        <MiniMap
          className="bg-card border border-border rounded-lg"
          nodeColor="hsl(var(--primary))"
          maskColor="hsl(var(--background) / 0.8)"
        />
        <Panel position="top-center" className="bg-card/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            {mappings.length === 0
              ? "Select fields from both panels to create mappings"
              : `${mappings.length} field mapping${mappings.length !== 1 ? "s" : ""}`}
          </p>
        </Panel>
      </ReactFlow>
    </div>
  );
}
