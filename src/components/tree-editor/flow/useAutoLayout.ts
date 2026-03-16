import { useCallback } from 'react';
import dagre from 'dagre';
import { FlowNode, FlowEdge } from './types';

interface LayoutOptions {
  direction: 'TB' | 'LR' | 'BT' | 'RL';
  nodeSpacing: number;
  rankSpacing: number;
}

const defaultOptions: LayoutOptions = {
  direction: 'TB',
  nodeSpacing: 150,
  rankSpacing: 100,
};

export function useAutoLayout() {
  const getLayoutedElements = useCallback((
    nodes: FlowNode[],
    edges: FlowEdge[],
    options: Partial<LayoutOptions> = {}
  ): { nodes: FlowNode[]; edges: FlowEdge[] } => {
    const opts = { ...defaultOptions, ...options };
    
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ 
      rankdir: opts.direction,
      nodesep: opts.nodeSpacing,
      ranksep: opts.rankSpacing,
    });

    // Add nodes to dagre graph
    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 240, height: 100 });
    });

    // Add edges to dagre graph
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Calculate layout
    dagre.layout(dagreGraph);

    // Assign sequence numbers via BFS from entry nodes
    const sequenceMap = assignSequenceNumbers(nodes, edges);

    // Apply positions from dagre
    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 120, // Center node
          y: nodeWithPosition.y - 50,
        },
        data: {
          ...node.data,
          sequenceNo: sequenceMap.get(node.id),
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  }, []);

  return { getLayoutedElements };
}

// BFS to assign sequence numbers starting from entry nodes
function assignSequenceNumbers(nodes: FlowNode[], edges: FlowEdge[]): Map<string, number> {
  const sequenceMap = new Map<string, number>();
  
  // Find entry nodes (nodes with no incoming edges)
  const targetIds = new Set(edges.map(e => e.target));
  const entryNodes = nodes.filter(n => !targetIds.has(n.id));
  
  if (entryNodes.length === 0 && nodes.length > 0) {
    // Fallback: use first node as entry
    entryNodes.push(nodes[0]);
  }

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  edges.forEach(edge => {
    const existing = adjacency.get(edge.source) || [];
    existing.push(edge.target);
    adjacency.set(edge.source, existing);
  });

  // BFS
  let sequence = 1;
  const visited = new Set<string>();
  const queue: string[] = entryNodes.map(n => n.id);

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    
    visited.add(nodeId);
    sequenceMap.set(nodeId, sequence++);
    
    const children = adjacency.get(nodeId) || [];
    children.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    });
  }

  // Handle any disconnected nodes
  nodes.forEach(node => {
    if (!sequenceMap.has(node.id)) {
      sequenceMap.set(node.id, sequence++);
    }
  });

  return sequenceMap;
}
