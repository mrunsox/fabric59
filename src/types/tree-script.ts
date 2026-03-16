// Basic Nodes
export type BasicNodeType = 'content' | 'question' | 'data' | 'logic' | 'end';

// Integration Nodes
export type IntegrationNodeType = 'crm-lookup' | 'api-webhook' | 'external-embed' | 'sms' | 'calendar' | 'payment';

// Call Control Nodes
export type CallControlNodeType = 'timer' | 'audio-prompt' | 'transfer';

// AI/Analytics Nodes
export type AIAnalyticsNodeType = 'ai-assist' | 'scoring' | 'ab-test';

// Flow Nodes (added loop and randomizer)
export type FlowNodeType = 'tree-link' | 'compliance-record' | 'parallel-branch' | 'loop' | 'randomizer';

// Combined type
export type NodeType = BasicNodeType | IntegrationNodeType | CallControlNodeType | AIAnalyticsNodeType | FlowNodeType;

// Node category for grouping
export type NodeCategory = 'basic' | 'integration' | 'call-control' | 'ai-analytics' | 'flow';

// Question input types
export type QuestionInputType = 'multi-choice' | 'dropdown' | 'free-text' | 'slider' | 'date' | 'yes-no' | 'email';

export interface QuestionConfig {
  inputType: QuestionInputType;
  required: boolean;
  placeholder?: string;
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  dateMin?: string;
  dateMax?: string;
}

export interface ScriptNode {
  id: string;
  type: NodeType;
  title: string;
  content: string;
  position: { x: number; y: number };
  options?: NodeOption[];
  inputFields?: InputField[];
  logicRules?: LogicRule[];
  endAction?: EndAction;
  connections: string[];
  // Question node config
  questionConfig?: QuestionConfig;
  // New properties for specific node types
  timerConfig?: TimerConfig;
  audioConfig?: AudioConfig;
  transferConfig?: TransferConfig;
  crmConfig?: CRMConfig;
  webhookConfig?: WebhookConfig;
  embedConfig?: EmbedConfig;
  aiAssistConfig?: AIAssistConfig;
  scoringConfig?: ScoringConfig;
  abTestConfig?: ABTestConfig;
  treeLinkConfig?: TreeLinkConfig;
  complianceConfig?: ComplianceConfig;
  parallelConfig?: ParallelConfig;
  loopConfig?: LoopConfig;
  randomizerConfig?: RandomizerConfig;
  // New integration node configs
  smsConfig?: SMSConfig;
  calendarConfig?: CalendarConfig;
  paymentConfig?: PaymentConfig;
  // Content node continue button label
  continueLabel?: string;
}

export interface NodeOption {
  id: string;
  label: string;
  targetNodeId?: string;
}

export interface InputField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'date' | 'dropdown';
  required: boolean;
  placeholder?: string;
  options?: string[];
  variableName: string;
}

export interface LogicRule {
  id: string;
  variable: string;
  operator: 'equals' | 'contains' | 'greater' | 'less';
  value: string;
  targetNodeId: string;
}

export interface EndAction {
  type: 'email' | 'crm' | 'pdf' | 'webhook' | 'none';
  config?: Record<string, string>;
}

// Timer node config
export interface TimerConfig {
  duration: number; // seconds
  alertAt: number[]; // alert at these seconds remaining
  action: 'warn' | 'auto-advance' | 'none';
}

// Audio prompt config
export interface AudioConfig {
  type: 'tts' | 'recording';
  text?: string;
  audioUrl?: string;
  autoPlay: boolean;
}

// Transfer config
export interface TransferConfig {
  type: 'cold' | 'warm' | 'conference';
  destination: string;
  contextVariables: string[];
}

// CRM lookup config
export interface CRMConfig {
  provider: 'ghl' | 'salesforce' | 'hubspot' | 'custom';
  lookupField: string;
  returnFields: string[];
}

// Webhook config
export interface WebhookConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  bodyTemplate?: string;
}

// Embed config
export interface EmbedConfig {
  url: string;
  width: string;
  height: string;
}

// AI Assist config
export interface AIAssistConfig {
  model: 'gpt-4' | 'claude' | 'custom';
  promptTemplate: string;
  transcriptionEnabled: boolean;
}

// Scoring config
export interface ScoringConfig {
  criteria: ScoringCriterion[];
  passThreshold: number;
}

export interface ScoringCriterion {
  id: string;
  name: string;
  weight: number;
  keywords?: string[];
}

// A/B Test config
export interface ABTestConfig {
  variants: ABTestVariant[];
  distribution: 'equal' | 'weighted';
}

export interface ABTestVariant {
  id: string;
  name: string;
  weight: number;
  targetNodeId: string;
}

// Tree link config
export interface TreeLinkConfig {
  targetScriptId: string;
  returnToNode?: string;
}

// Compliance record config
export interface ComplianceConfig {
  type: 'consent' | 'disclosure' | 'verification';
  requiredConfirmation: boolean;
  logToAudit: boolean;
}

// Parallel branch config
export interface ParallelConfig {
  branches: ParallelBranch[];
  waitForAll: boolean;
}

export interface ParallelBranch {
  id: string;
  name: string;
  targetNodeId: string;
}

// Loop config
export interface LoopConfig {
  condition: string;
  maxIterations: number;
  exitBranches: LoopExitBranch[];
}

export interface LoopExitBranch {
  id: string;
  name: string;
  condition: string;
  targetNodeId: string;
}

// Randomizer config
export interface RandomizerConfig {
  branches: RandomizerBranch[];
  seed?: string;
}

export interface RandomizerBranch {
  id: string;
  name: string;
  weight: number; // percentage 0-100
  targetNodeId: string;
}

// SMS node config
export type SMSSendScenario = 
  | 'on_transfer_warm'
  | 'on_transfer_cold'
  | 'after_disposition'
  | 'after_call_end'
  | 'manual_trigger'
  | 'on_schedule';

export type SMSDeliveryStatus = 
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'undelivered';

export interface SMSConfig {
  providerId: string;
  templateId?: string;
  recipientVariable: string;
  messageTemplate: string;
  optOutCheck: boolean;
  // New: Send scenario configuration
  sendScenario: SMSSendScenario;
  delaySeconds?: number;
  // Webhook configuration
  webhookEnabled: boolean;
  webhookUrl?: string;
  // Delivery tracking
  trackDelivery: boolean;
  retryOnFailure: boolean;
  maxRetries?: number;
}

// Calendar node config
export interface CalendarConfig {
  providerId: string;
  availabilityEndpoint?: string;
  bookingDuration: number; // minutes
  bufferTime: number; // minutes between appointments
  autoConfirm: boolean;
}

// Payment node config
export interface PaymentConfig {
  providerId: string;
  amountVariable: string;
  currency: string;
  description: string;
  successNodeId?: string;
  failureNodeId?: string;
}

export interface Script {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'live' | 'archived';
  nodes: ScriptNode[];
  startNodeId: string;
  variables: ScriptVariable[];
  createdAt: Date;
  updatedAt: Date;
  stats: ScriptStats;
  tags: string[];
}

export interface ScriptVariable {
  name: string;
  defaultValue: string;
  type: 'string' | 'number' | 'boolean' | 'date';
}

export interface ScriptStats {
  completions: number;
  avgPathLength: number;
  avgDuration: number;
}

export interface SessionData {
  variables: Record<string, string>;
  history: string[];
  currentNodeId: string;
}
