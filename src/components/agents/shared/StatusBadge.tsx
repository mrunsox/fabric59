import { cn } from "@/lib/utils";

type AgentStatus = 'active' | 'pending_deletion' | 'deprovisioned' | 'under_review' | 'failed' | 'success' | 'partial';

const STATUS_CONFIG: Record<AgentStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-success/15 text-success border-success/30' },
  pending_deletion: { label: 'Pending Deletion', className: 'bg-warning/15 text-warning border-warning/30' },
  deprovisioned: { label: 'Deprovisioned', className: 'bg-muted/40 text-muted-foreground border-border' },
  under_review: { label: 'Under Review', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  failed: { label: 'Failed', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  success: { label: 'Success', className: 'bg-success/15 text-success border-success/30' },
  partial: { label: 'Partial', className: 'bg-warning/15 text-warning border-warning/30' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as AgentStatus] ?? { label: status, className: 'bg-muted/40 text-muted-foreground border-border' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', config.className, className)}>
      {config.label}
    </span>
  );
}
