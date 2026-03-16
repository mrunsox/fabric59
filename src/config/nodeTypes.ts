import { 
  FileText, 
  HelpCircle, 
  FormInput, 
  GitBranch, 
  Flag,
  Database,
  Webhook,
  ExternalLink,
  Timer,
  Volume2,
  PhoneForwarded,
  Bot,
  BarChart3,
  Split,
  Link2,
  FileCheck,
  GitMerge,
  RefreshCw,
  Dices,
  MessageSquare,
  Calendar,
  CreditCard,
  LucideIcon
} from 'lucide-react';
import { NodeType, NodeCategory } from '@/types/script';

export interface NodeTypeConfig {
  type: NodeType;
  category: NodeCategory;
  icon: LucideIcon;
  label: string;
  description: string;
  colorClass: string;
  bgClass: string;
}

export const nodeTypeConfigs: Record<NodeType, NodeTypeConfig> = {
  // Basic Nodes
  content: {
    type: 'content',
    category: 'basic',
    icon: FileText,
    label: 'Content',
    description: 'Display text, images, or videos',
    colorClass: 'border-l-node-content',
    bgClass: 'bg-node-content'
  },
  question: {
    type: 'question',
    category: 'basic',
    icon: HelpCircle,
    label: 'Question',
    description: 'Multi-choice buttons/dropdowns for branching',
    colorClass: 'border-l-node-question',
    bgClass: 'bg-node-question'
  },
  data: {
    type: 'data',
    category: 'basic',
    icon: FormInput,
    label: 'Data Capture',
    description: 'Forms, inputs with validation',
    colorClass: 'border-l-node-data',
    bgClass: 'bg-node-data'
  },
  logic: {
    type: 'logic',
    category: 'basic',
    icon: GitBranch,
    label: 'Logic',
    description: 'If/then rules on variables',
    colorClass: 'border-l-node-logic',
    bgClass: 'bg-node-logic'
  },
  end: {
    type: 'end',
    category: 'basic',
    icon: Flag,
    label: 'End',
    description: 'Final actions like close call',
    colorClass: 'border-l-node-end',
    bgClass: 'bg-node-end'
  },

  // Integration Nodes
  'crm-lookup': {
    type: 'crm-lookup',
    category: 'integration',
    icon: Database,
    label: 'CRM Lookup',
    description: 'Fetch customer data from GHL/Salesforce',
    colorClass: 'border-l-node-integration',
    bgClass: 'bg-node-integration'
  },
  'api-webhook': {
    type: 'api-webhook',
    category: 'integration',
    icon: Webhook,
    label: 'API/Webhook',
    description: 'Push data to telephony/CRMs',
    colorClass: 'border-l-node-integration',
    bgClass: 'bg-node-integration'
  },
  'external-embed': {
    type: 'external-embed',
    category: 'integration',
    icon: ExternalLink,
    label: 'External Embed',
    description: 'Iframe external tools/sites',
    colorClass: 'border-l-node-integration',
    bgClass: 'bg-node-integration'
  },
  sms: {
    type: 'sms',
    category: 'integration',
    icon: MessageSquare,
    label: 'SMS',
    description: 'Send templated SMS messages',
    colorClass: 'border-l-node-integration',
    bgClass: 'bg-node-integration'
  },
  calendar: {
    type: 'calendar',
    category: 'integration',
    icon: Calendar,
    label: 'Calendar',
    description: 'Book appointments and check availability',
    colorClass: 'border-l-node-integration',
    bgClass: 'bg-node-integration'
  },
  payment: {
    type: 'payment',
    category: 'integration',
    icon: CreditCard,
    label: 'Payment',
    description: 'PCI-compliant payment collection',
    colorClass: 'border-l-node-integration',
    bgClass: 'bg-node-integration'
  },

  // Call Control Nodes
  timer: {
    type: 'timer',
    category: 'call-control',
    icon: Timer,
    label: 'Timer',
    description: 'Countdown with alerts for call limits',
    colorClass: 'border-l-node-call',
    bgClass: 'bg-node-call'
  },
  'audio-prompt': {
    type: 'audio-prompt',
    category: 'call-control',
    icon: Volume2,
    label: 'Audio Prompt',
    description: 'Play TTS/recordings',
    colorClass: 'border-l-node-call',
    bgClass: 'bg-node-call'
  },
  transfer: {
    type: 'transfer',
    category: 'call-control',
    icon: PhoneForwarded,
    label: 'Transfer',
    description: 'Route call with context',
    colorClass: 'border-l-node-call',
    bgClass: 'bg-node-call'
  },

  // AI/Analytics Nodes
  'ai-assist': {
    type: 'ai-assist',
    category: 'ai-analytics',
    icon: Bot,
    label: 'AI Assist',
    description: 'Real-time suggestions from transcription',
    colorClass: 'border-l-node-ai',
    bgClass: 'bg-node-ai'
  },
  scoring: {
    type: 'scoring',
    category: 'ai-analytics',
    icon: BarChart3,
    label: 'Scoring',
    description: 'Evaluate call compliance/quality',
    colorClass: 'border-l-node-ai',
    bgClass: 'bg-node-ai'
  },
  'ab-test': {
    type: 'ab-test',
    category: 'ai-analytics',
    icon: Split,
    label: 'A/B Test',
    description: 'Variant script testing',
    colorClass: 'border-l-node-ai',
    bgClass: 'bg-node-ai'
  },

  // Flow Nodes
  'tree-link': {
    type: 'tree-link',
    category: 'flow',
    icon: Link2,
    label: 'Tree Link',
    description: 'Links to sub-trees for modular scripts',
    colorClass: 'border-l-node-flow',
    bgClass: 'bg-node-flow'
  },
  'compliance-record': {
    type: 'compliance-record',
    category: 'flow',
    icon: FileCheck,
    label: 'Compliance Record',
    description: 'Log consents for audit/regulatory needs',
    colorClass: 'border-l-node-flow',
    bgClass: 'bg-node-flow'
  },
  'parallel-branch': {
    type: 'parallel-branch',
    category: 'flow',
    icon: GitMerge,
    label: 'Parallel Branch',
    description: 'Run multiple paths (Email + SMS)',
    colorClass: 'border-l-node-flow',
    bgClass: 'bg-node-flow'
  },
  loop: {
    type: 'loop',
    category: 'flow',
    icon: RefreshCw,
    label: 'Loop',
    description: 'Repeat until condition met (max iterations)',
    colorClass: 'border-l-node-flow',
    bgClass: 'bg-node-flow'
  },
  randomizer: {
    type: 'randomizer',
    category: 'flow',
    icon: Dices,
    label: 'Randomizer',
    description: 'Weighted random branch selection',
    colorClass: 'border-l-node-flow',
    bgClass: 'bg-node-flow'
  }
};

export const nodeCategories: { id: NodeCategory; label: string; description: string }[] = [
  { id: 'basic', label: 'Basic', description: 'Core script building blocks' },
  { id: 'integration', label: 'Integration', description: 'Connect to external systems' },
  { id: 'call-control', label: 'Call Control', description: 'Manage call flow & audio' },
  { id: 'ai-analytics', label: 'AI & Analytics', description: 'AI assistance & scoring' },
  { id: 'flow', label: 'Flow', description: 'Advanced flow control' }
];

export function getNodesByCategory(category: NodeCategory): NodeTypeConfig[] {
  return Object.values(nodeTypeConfigs).filter(config => config.category === category);
}

export function getNodeConfig(type: NodeType): NodeTypeConfig {
  return nodeTypeConfigs[type];
}
