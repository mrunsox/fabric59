import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { CallLogRecord } from "@/hooks/useCallLogs";

interface CallLogTableProps {
  records: CallLogRecord[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function CallLogTable({ records, page, pageSize, onPageChange }: CallLogTableProps) {
  const totalPages = Math.ceil(records.length / pageSize);
  const paginated = records.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-3">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Disposition</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{r.timestamp}</TableCell>
                  <TableCell className="text-sm">{r.campaignName}</TableCell>
                  <TableCell className="text-sm">{r.agentName}</TableCell>
                  <TableCell className="text-sm">{r.customerName}</TableCell>
                  <TableCell className="text-sm font-mono">{r.phoneNumber}</TableCell>
                  <TableCell className="text-sm">{r.duration}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{r.disposition}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, records.length)} of {records.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-muted"
            >
              Prev
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
