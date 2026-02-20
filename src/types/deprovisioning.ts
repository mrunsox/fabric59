export type DeprovisioningStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'failed';

export interface DeprovisioningStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'complete' | 'error' | 'skipped';
  errorMessage?: string;
}

export interface DataTransferConfig {
  enabled: boolean;
  targetEmail?: string;
  transferEmail: boolean;
  transferDrive: boolean;
}

export interface DeprovisioningRequest {
  agentId: string;
  agentName: string;
  email: string;
  extension: number;
  role: string;
  scheduledDate: Date;
  gracePeriodHours: number;
  dataTransfer: DataTransferConfig;
  initiatedBy: string;
  initiatedAt: Date;
  status: DeprovisioningStatus;
  reason?: string;
}

export interface DeprovisioningResult {
  id: string;
  request: DeprovisioningRequest;
  completedAt?: Date;
  steps: DeprovisioningStep[];
  status: DeprovisioningStatus;
}

export interface AuditLogEntry {
  id: string;
  action: 'scheduled' | 'cancelled' | 'started' | 'completed' | 'failed';
  agentId: string;
  agentName: string;
  agentEmail: string;
  performedBy: string;
  performedAt: Date;
  details?: string;
}

export const DEPROVISIONING_STEPS: Omit<DeprovisioningStep, 'status'>[] = [
  { id: 'data-transfer', name: 'Data Transfer', description: 'Transferring email and Drive data to specified user' },
  { id: 'five9-deletion', name: 'Five9 Removal', description: 'Removing user from Five9 system' },
  { id: 'slack-removal', name: 'Slack Removal', description: 'Removing user from Slack workspace' },
  { id: 'google-suspension', name: 'Google Suspension', description: 'Suspending Google Workspace account' },
  { id: 'google-deletion', name: 'Google Deletion', description: 'Permanently deleting Google Workspace account' },
  { id: 'notification', name: 'HR Notification', description: 'Sending confirmation to HR and logging audit trail' },
];

export const GRACE_PERIOD_OPTIONS = [
  { value: 0, label: 'Immediate' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
  { value: 72, label: '72 hours' },
  { value: 168, label: '7 days' },
];
