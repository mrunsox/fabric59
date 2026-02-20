import { format } from "date-fns";
import { ClipboardList } from "lucide-react";
import { AuditLogEntry } from "@/types/deprovisioning";
import { cn } from "@/lib/utils";

const ACTION_COLORS: Record<string, string> = {
  scheduled: 'text-warning',
  cancelled: 'text-muted-foreground',
  started: 'text-primary',
  completed: 'text-success',
  failed: 'text-destructive',
};

interface AuditLogTableProps {
  entries: AuditLogEntry[];
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <ClipboardList className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Audit Log</span>
        <span className="text-xs text-muted-foreground">({entries.length} entries)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Action</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Agent</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Performed By</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Timestamp</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">No audit log entries yet.</td>
              </tr>
            )}
            {entries.map(entry => (
              <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5">
                  <span className={cn("text-xs font-semibold uppercase tracking-wide", ACTION_COLORS[entry.action] || 'text-foreground')}>
                    {entry.action}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <p className="text-sm font-medium text-foreground">{entry.agentName || '—'}</p>
                  <p className="text-xs text-muted-foreground">{entry.agentEmail || '—'}</p>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                  {entry.performedBy === 'system' ? 'System' : entry.performedBy.slice(0, 8) + '...'}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {format(entry.performedAt, 'MMM d, yyyy HH:mm')}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">
                  {entry.details || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
