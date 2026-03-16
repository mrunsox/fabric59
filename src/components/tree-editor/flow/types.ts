import { Node, Edge } from '@xyflow/react';
import { NodeType, ScriptNode } from '@/types/script';

// React Flow node data structure
export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  type: NodeType;
  content: string;
  sequenceNo?: number;
  options?: { id: string; label: string; targetNodeId?: string }[];
  inputFields?: { id: string; label: string; type: string; required: boolean; variableName: string }[];
  // Include all config types from ScriptNode
  timerConfig?: ScriptNode['timerConfig'];
  audioConfig?: ScriptNode['audioConfig'];
  transferConfig?: ScriptNode['transferConfig'];
  crmConfig?: ScriptNode['crmConfig'];
  webhookConfig?: ScriptNode['webhookConfig'];
  embedConfig?: ScriptNode['embedConfig'];
  aiAssistConfig?: ScriptNode['aiAssistConfig'];
  scoringConfig?: ScriptNode['scoringConfig'];
  abTestConfig?: ScriptNode['abTestConfig'];
  treeLinkConfig?: ScriptNode['treeLinkConfig'];
  complianceConfig?: ScriptNode['complianceConfig'];
  parallelConfig?: ScriptNode['parallelConfig'];
  loopConfig?: ScriptNode['loopConfig'];
  randomizerConfig?: ScriptNode['randomizerConfig'];
  logicRules?: ScriptNode['logicRules'];
  endAction?: ScriptNode['endAction'];
}

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge;

// Industry template categories
export type IndustryCategory = 
  | 'contact-center'
  | 'insurance'
  | 'home-services'
  | 'healthcare'
  | 'consumer-products'
  | 'finance'
  | 'final-mile'
  | 'reverse-logistics'
  | 'ecommerce'
  | 'tech-support';

export interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  category: IndustryCategory;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export const industryCategories: { id: IndustryCategory; label: string; description: string }[] = [
  { id: 'contact-center', label: 'Contact Centers', description: 'Basic intake/transfer flows' },
  { id: 'insurance', label: 'Insurance Firms', description: 'Claims/quote branching' },
  { id: 'home-services', label: 'Home Services', description: 'Scheduling/emergency dispatch' },
  { id: 'healthcare', label: 'Healthcare', description: 'Appointments/refills' },
  { id: 'consumer-products', label: 'Consumer Products', description: 'Support/returns' },
  { id: 'finance', label: 'Finance', description: 'Verification/loans' },
  { id: 'final-mile', label: 'Final Mile', description: 'Delivery tracking' },
  { id: 'reverse-logistics', label: 'Reverse Logistics', description: 'Pickups/refunds' },
  { id: 'ecommerce', label: 'Ecommerce', description: 'Orders/refunds' },
  { id: 'tech-support', label: 'B2C Software Tech Support', description: 'Troubleshooting/escalation' },
];

// Convert ScriptNode to FlowNode
export function scriptNodeToFlowNode(node: ScriptNode): FlowNode {
  return {
    id: node.id,
    type: 'custom',
    position: node.position,
    data: {
      label: node.title,
      type: node.type,
      content: node.content,
      options: node.options,
      inputFields: node.inputFields,
      timerConfig: node.timerConfig,
      audioConfig: node.audioConfig,
      transferConfig: node.transferConfig,
      crmConfig: node.crmConfig,
      webhookConfig: node.webhookConfig,
      embedConfig: node.embedConfig,
      aiAssistConfig: node.aiAssistConfig,
      scoringConfig: node.scoringConfig,
      abTestConfig: node.abTestConfig,
      treeLinkConfig: node.treeLinkConfig,
      complianceConfig: node.complianceConfig,
      parallelConfig: node.parallelConfig,
      loopConfig: node.loopConfig,
      randomizerConfig: node.randomizerConfig,
      logicRules: node.logicRules,
      endAction: node.endAction,
    },
  };
}

// Convert FlowNode to ScriptNode
export function flowNodeToScriptNode(node: FlowNode, connections: string[]): ScriptNode {
  return {
    id: node.id,
    type: node.data.type,
    title: node.data.label,
    content: node.data.content,
    position: node.position,
    options: node.data.options as ScriptNode['options'],
    inputFields: node.data.inputFields as ScriptNode['inputFields'],
    timerConfig: node.data.timerConfig,
    audioConfig: node.data.audioConfig,
    transferConfig: node.data.transferConfig,
    crmConfig: node.data.crmConfig,
    webhookConfig: node.data.webhookConfig,
    embedConfig: node.data.embedConfig,
    aiAssistConfig: node.data.aiAssistConfig,
    scoringConfig: node.data.scoringConfig,
    abTestConfig: node.data.abTestConfig,
    treeLinkConfig: node.data.treeLinkConfig,
    complianceConfig: node.data.complianceConfig,
    parallelConfig: node.data.parallelConfig,
    loopConfig: node.data.loopConfig,
    randomizerConfig: node.data.randomizerConfig,
    logicRules: node.data.logicRules,
    endAction: node.data.endAction,
    connections,
  };
}

// Convert connections array to edges
export function connectionsToEdges(nodes: ScriptNode[]): FlowEdge[] {
  const edges: FlowEdge[] = [];
  nodes.forEach(node => {
    node.connections.forEach((targetId, index) => {
      edges.push({
        id: `${node.id}-${targetId}`,
        source: node.id,
        target: targetId,
        type: 'smoothstep',
        animated: false,
      });
    });
  });
  return edges;
}

// Convert edges to connections map
export function edgesToConnections(edges: FlowEdge[]): Map<string, string[]> {
  const connections = new Map<string, string[]>();
  edges.forEach(edge => {
    const existing = connections.get(edge.source) || [];
    existing.push(edge.target);
    connections.set(edge.source, existing);
  });
  return connections;
}
