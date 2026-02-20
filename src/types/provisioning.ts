export interface AgentRole {
  id: string;
  name: string;
  description: string;
  extensionRangeStart: number;
  extensionRangeEnd: number;
  slackChannels: string[];
  five9RoleName: string;
}

export interface ProvisioningInput {
  agentName: string;
  emailHandle: string;
  five9Username: string;
  role: AgentRole;
  extension: number;
  externalEmail: string;
  password: string;
  skills?: string[];
  organizationId?: string | null;
}

export interface ProvisioningStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  errorMessage?: string;
}

export interface ProvisioningResult {
  id: string;
  agentName: string;
  email: string;
  password: string;
  extension: number;
  role: string;
  five9Username: string;
  createdAt: Date;
  status: 'success' | 'failed' | 'partial';
  steps: ProvisioningStep[];
}

export interface ProvisioningHistory {
  id: string;
  agentName: string;
  email: string;
  role: string;
  extension: number;
  status: 'success' | 'failed' | 'partial' | 'active' | 'pending_deletion' | 'deprovisioned' | 'under_review';
  createdAt: Date;
  externalEmailSent: boolean;
  five9Username?: string;
}

export const AGENT_ROLES: AgentRole[] = [
  { id: 'manager', name: 'Manager', description: 'Internal management staff.', extensionRangeStart: 0, extensionRangeEnd: 99, slackChannels: [], five9RoleName: 'Agent' },
  { id: 'english-support', name: 'English Support', description: 'Handles English-language customer calls.', extensionRangeStart: 1000, extensionRangeEnd: 1100, slackChannels: ['#english-support', '#all-agents'], five9RoleName: 'Agent' },
  { id: 'french-support', name: 'French Support', description: 'Handles French-language customer calls.', extensionRangeStart: 2000, extensionRangeEnd: 2100, slackChannels: ['#french-support', '#all-agents'], five9RoleName: 'Agent' },
  { id: 'spanish-support', name: 'Spanish Support', description: 'Handles Spanish-language customer calls.', extensionRangeStart: 3000, extensionRangeEnd: 3100, slackChannels: ['#spanish-support', '#all-agents'], five9RoleName: 'Agent' },
  { id: 'trilingual-support', name: 'Trilingual Support', description: 'Handles multilingual calls.', extensionRangeStart: 4000, extensionRangeEnd: 4100, slackChannels: ['#trilingual-support', '#all-agents'], five9RoleName: 'Agent' },
  { id: 'supervisor', name: 'Supervisor', description: 'Supervises agent queues and handles escalations.', extensionRangeStart: 5000, extensionRangeEnd: 5100, slackChannels: ['#supervisors', '#all-agents', '#management'], five9RoleName: 'Agent' },
  { id: 'qa-specialist', name: 'QA Specialist', description: 'Reviews call quality.', extensionRangeStart: 6000, extensionRangeEnd: 6100, slackChannels: ['#quality-assurance', '#all-agents'], five9RoleName: 'Agent' },
  { id: 'tech-support', name: 'Tech Support', description: 'Handles technical support.', extensionRangeStart: 7000, extensionRangeEnd: 7100, slackChannels: ['#tech-support', '#all-agents', '#it-team'], five9RoleName: 'Agent' },
];

export const PROVISIONING_STEPS: Omit<ProvisioningStep, 'status'>[] = [
  { id: 'google-workspace', name: 'Google Workspace', description: 'Creating user account in Google Workspace' },
  { id: 'password-generation', name: 'Password Generation', description: 'Generating secure random password' },
  { id: 'slack-invitation', name: 'Slack Invitation', description: 'Sending Slack workspace invitation' },
  { id: 'five9-creation', name: 'Five9 User', description: 'Creating Five9 agent account' },
  { id: 'credential-delivery', name: 'Credential Delivery', description: 'Sending credential email' },
];
