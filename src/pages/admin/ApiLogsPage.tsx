import { useState, useMemo } from "react";
import { useApiLogs } from "@/hooks/useApiLogs";
import { useTenants } from "@/hooks/useTenants";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Search, RefreshCw, Clock, ExternalLink, CalendarIcon, Download, Activity, CheckCircle2, AlertCircle, Timer, Radio } from "lucide-react";
import { format, formatDistanceToNow, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ApiLogsPage() {
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { data: tenants = [] } = useTenants();
  const { data: logs = [], isLoading, refetch, isFetching, isLive, toggleLive } = useApiLogs({
    tenantId: tenantFilter === "all" ? undefined : tenantFilter,
    status: statusFilter === "all" ? undefined : (statusFilter as "success" | "error" | "pending"),
  });

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = log.endpoint.toLowerCase().includes(search.toLowerCase()) || log.method.toLowerCase().includes(search.toLowerCase());
      const logDate = new Date(log.created_at);
      const matchesFrom = dateFrom ? isAfter(logDate, startOfDay(dateFrom)) : true;
      const matchesTo = dateTo ? isBefore(logDate, endOfDay(dateTo)) : true;
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [logs, search, dateFrom, dateTo]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const success = filteredLogs.filter((l) => l.status === "success").length;
    const errors = filteredLogs.filter((l) => l.status === "error").length;
    const avgLatency = total > 0 ? Math.round(filteredLogs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / total) : 0;
    return { total, successRate: total > 0 ? Math.round((success / total) * 100) : 100, avgLatency, errors };
  }, [filteredLogs]);

  // Chart data
  const chartData = useMemo(() => {
    const sorted = [...filteredLogs].reverse().slice(-50);
    return sorted.map((log) => ({
      time: format(new Date(log.created_at), "HH:mm"),
      latency: log.response_time_ms || 0,
    }));
  }, [filteredLogs]);

  const handleExportCSV = () => {
    const headers = ["Time", "Method", "Endpoint", "Status", "Latency (ms)"];
    const rows = filteredLogs.map((log) => [
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      log.method,
      log.endpoint,
      log.status,
      log.response_time_ms?.toString() || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <span className={`font-mono text-xs font-medium ${log.method === "GET" ? "text-success" : log.method === "POST" ? "text-primary" : log.method === "PATCH" ? "text-warning" : log.method === "DELETE" ? "text-destructive" : ""}`}>
          {log.method}
        </span>
      ),
    },
    {
      key: "endpoint",
      header: "Endpoint",
      render: (log: ApiLog) => <span className="font-mono text-sm text-muted-foreground">{log.endpoint}</span>,
    },
    {
      key: "tenant_id",
      header: "Client",
      render: (log: ApiLog) => {
        const tenant = tenants.find((t) => t.id === log.tenant_id);
        return <span className="text-sm">{tenant?.name || log.tenant_id?.slice(0, 8) || "—"}</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (log: ApiLog) => (
        <StatusBadge variant={log.status === "success" ? "success" : log.status === "error" ? "error" : "pending"} dot>
          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
        </StatusBadge>
      ),
    },
    {
      key: "response_time_ms",
      header: "Latency",
      render: (log: ApiLog) => (
        <span className={`text-sm font-mono ${log.response_time_ms && log.response_time_ms > 1000 ? "text-warning" : "text-muted-foreground"}`}>
          {log.response_time_ms ? `${log.response_time_ms}ms` : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (log: ApiLog) => (
        <Button variant="ghost" size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}>
          <ExternalLink className="h-3.5 w-3.5" />Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">API Logs</h1>
            <p className="text-muted-foreground">Real-time monitoring of all CRM API calls</p>
          </div>
          {isLive && (
            <span className="flex items-center gap-1.5 rounded-full bg-success/15 border border-success/30 px-2.5 py-0.5 text-xs font-medium text-success">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              Live
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />CSV
          </Button>
          <Button
            variant={isLive ? "default" : "outline"}
            size="sm"
            onClick={toggleLive}
            className="gap-2"
          >
            <Radio className="h-4 w-4" />
            {isLive ? "Pause" : "Resume"}
          </Button>
          {!isLive && (
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Requests" value={stats.total} icon={Activity} color="bg-primary/10 text-primary" />
        <StatCard label="Success Rate" value={`${stats.successRate}%`} icon={CheckCircle2} color="bg-success/10 text-success" />
        <StatCard label="Avg Latency" value={`${stats.avgLatency}ms`} icon={Timer} color="bg-warning/10 text-warning" />
        <StatCard label="Errors" value={stats.errors} icon={AlertCircle} color="bg-destructive/10 text-destructive" />
      </div>

      {/* Latency Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="latency" stroke="hsl(var(--primary))" fill="url(#latencyGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search endpoints..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-2", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="h-4 w-4" />{dateFrom ? format(dateFrom, "PP") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-2", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="h-4 w-4" />{dateTo ? format(dateTo, "PP") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>Clear dates</Button>
        )}

        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {tenants.map((tenant) => (<SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={filteredLogs} keyExtractor={(log: ApiLog) => log.id} isLoading={isLoading} onRowClick={setSelectedLog} emptyMessage="No API logs found. Logs will appear here when API calls are made." />

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className={`font-mono text-sm ${selectedLog?.method === "GET" ? "text-success" : selectedLog?.method === "POST" ? "text-primary" : ""}`}>
                {selectedLog?.method}
              </span>
              <span className="font-mono text-sm text-muted-foreground">{selectedLog?.endpoint}</span>
              {selectedLog && (
                <StatusBadge variant={selectedLog.status === "success" ? "success" : selectedLog.status === "error" ? "error" : "pending"}>
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
                  {selectedLog?.request_payload ? JSON.stringify(selectedLog.request_payload, null, 2) : "No request payload"}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Response</h4>
                <pre className="rounded-lg bg-muted p-4 text-xs font-mono overflow-auto">
                  {selectedLog?.response ? JSON.stringify(selectedLog.response, null, 2) : "No response"}
                </pre>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span><strong>Response Time:</strong> {selectedLog?.response_time_ms ? `${selectedLog.response_time_ms}ms` : "N/A"}</span>
                <span><strong>Timestamp:</strong> {selectedLog?.created_at && format(new Date(selectedLog.created_at), "PPpp")}</span>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
