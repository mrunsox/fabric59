import { useState } from "react";
import { useApiLogs } from "@/hooks/useApiLogs";
import { useTenants } from "@/hooks/useTenants";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ApiLog } from "@/types/database";
import { Search, RefreshCw, Clock, ExternalLink } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function ApiLogsPage() {
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);

  const { data: tenants = [] } = useTenants();
  const { data: logs = [], isLoading, refetch, isFetching } = useApiLogs({
    tenantId: tenantFilter === "all" ? undefined : tenantFilter,
    status: statusFilter === "all" ? undefined : (statusFilter as "success" | "error" | "pending"),
  });

  const filteredLogs = logs.filter(
    (log) =>
      log.endpoint.toLowerCase().includes(search.toLowerCase()) ||
      log.method.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: "created_at",
      header: "Time",
      render: (log: ApiLog) => (
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm" title={format(new Date(log.created_at), "PPpp")}>
            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
          </span>
        </div>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (log: ApiLog) => (
        <span
          className={`font-mono text-xs font-medium ${
            log.method === "GET"
              ? "text-success"
              : log.method === "POST"
              ? "text-primary"
              : log.method === "PATCH"
              ? "text-warning"
              : log.method === "DELETE"
              ? "text-destructive"
              : ""
          }`}
        >
          {log.method}
        </span>
      ),
    },
    {
      key: "endpoint",
      header: "Endpoint",
      render: (log: ApiLog) => (
        <span className="font-mono text-sm text-muted-foreground">
          {log.endpoint}
        </span>
      ),
    },
    {
      key: "tenant_id",
      header: "Tenant",
      render: (log: ApiLog) => {
        const tenant = tenants.find((t) => t.id === log.tenant_id);
        return (
          <span className="text-sm">
            {tenant?.name || log.tenant_id?.slice(0, 8) || "—"}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (log: ApiLog) => (
        <StatusBadge
          variant={log.status === "success" ? "success" : log.status === "error" ? "error" : "pending"}
          dot
        >
          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
        </StatusBadge>
      ),
    },
    {
      key: "response_time_ms",
      header: "Latency",
      render: (log: ApiLog) => (
        <span
          className={`text-sm font-mono ${
            log.response_time_ms && log.response_time_ms > 1000
              ? "text-warning"
              : "text-muted-foreground"
          }`}
        >
          {log.response_time_ms ? `${log.response_time_ms}ms` : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (log: ApiLog) => (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(log);
          }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Logs</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of all CRM API calls
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search endpoints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Tenants" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tenants</SelectItem>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        keyExtractor={(log: ApiLog) => log.id}
        isLoading={isLoading}
        onRowClick={setSelectedLog}
        emptyMessage="No API logs found. Logs will appear here when API calls are made."
      />

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span
                className={`font-mono text-sm ${
                  selectedLog?.method === "GET"
                    ? "text-success"
                    : selectedLog?.method === "POST"
                    ? "text-primary"
                    : ""
                }`}
              >
                {selectedLog?.method}
              </span>
              <span className="font-mono text-sm text-muted-foreground">
                {selectedLog?.endpoint}
              </span>
              {selectedLog && (
                <StatusBadge
                  variant={
                    selectedLog.status === "success"
                      ? "success"
                      : selectedLog.status === "error"
                      ? "error"
                      : "pending"
                  }
                >
                  {selectedLog.status}
                </StatusBadge>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Request Payload</h4>
                <pre className="rounded-lg bg-muted p-4 text-xs font-mono overflow-auto">
                  {selectedLog?.request_payload
                    ? JSON.stringify(selectedLog.request_payload, null, 2)
                    : "No request payload"}
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Response</h4>
                <pre className="rounded-lg bg-muted p-4 text-xs font-mono overflow-auto">
                  {selectedLog?.response
                    ? JSON.stringify(selectedLog.response, null, 2)
                    : "No response"}
                </pre>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  <strong>Response Time:</strong>{" "}
                  {selectedLog?.response_time_ms
                    ? `${selectedLog.response_time_ms}ms`
                    : "N/A"}
                </span>
                <span>
                  <strong>Timestamp:</strong>{" "}
                  {selectedLog?.created_at &&
                    format(new Date(selectedLog.created_at), "PPpp")}
                </span>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
