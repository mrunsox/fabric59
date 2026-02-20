import { useState } from "react";
import { useNotifications, useNotificationStats } from "@/hooks/useNotifications";
import { useTenants } from "@/hooks/useTenants";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCircle2, XCircle, Clock, Eye } from "lucide-react";
import type { Notification } from "@/types/database";

export default function NotificationsPage() {
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  
  const { data: tenants } = useTenants();
  const { data: notifications, isLoading } = useNotifications(
    tenantFilter === "all" ? undefined : tenantFilter
  );
  const { data: stats } = useNotificationStats();

  const getTenantName = (tenantId: string) => {
    return tenants?.find((t) => t.id === tenantId)?.name || "Unknown";
  };

  const getStatusBadgeVariant = (status: string): "success" | "error" | "pending" | "info" => {
    switch (status) {
      case "sent":
        return "success";
      case "failed":
        return "error";
      case "pending":
        return "pending";
      default:
        return "info";
    }
  };

  const formatTriggerEvent = (event: string) => {
    return event
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notification Logs</h1>
        <p className="text-muted-foreground">
          Monitor Slack notifications sent to tenants
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sent"
          value={stats?.total || 0}
          icon={Bell}
        />
        <StatCard
          title="Successful"
          value={stats?.sent || 0}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Failed"
          value={stats?.failed || 0}
          icon={XCircle}
          variant={stats?.failed ? "destructive" : "default"}
        />
        <StatCard
          title="Last 24h"
          value={stats?.last24h || 0}
          icon={Clock}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by tenant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              {tenants?.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : notifications?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No notifications yet
                </TableCell>
              </TableRow>
            ) : (
              notifications?.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(notification.created_at), "MMM d, HH:mm:ss")}
                  </TableCell>
                  <TableCell>{getTenantName(notification.tenant_id)}</TableCell>
                  <TableCell className="capitalize">{notification.channel}</TableCell>
                  <TableCell>{formatTriggerEvent(notification.trigger_event)}</TableCell>
                  <TableCell>
                    <StatusBadge
                      variant={getStatusBadgeVariant(notification.status)}
                    >
                      {notification.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedNotification(notification)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Details Dialog */}
      <Dialog
        open={!!selectedNotification}
        onOpenChange={() => setSelectedNotification(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Tenant:</span>
                  <p className="font-medium">
                    {getTenantName(selectedNotification.tenant_id)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p>
                    <StatusBadge
                      variant={getStatusBadgeVariant(selectedNotification.status)}
                    >
                      {selectedNotification.status}
                    </StatusBadge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Channel:</span>
                  <p className="font-medium capitalize">
                    {selectedNotification.channel}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Trigger:</span>
                  <p className="font-medium">
                    {formatTriggerEvent(selectedNotification.trigger_event)}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Recipient:</span>
                  <p className="font-mono text-xs break-all">
                    {selectedNotification.recipient}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Payload:</span>
                <ScrollArea className="h-[150px] mt-1">
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                    {JSON.stringify(selectedNotification.payload, null, 2)}
                  </pre>
                </ScrollArea>
              </div>

              {selectedNotification.response && (
                <div>
                  <span className="text-sm text-muted-foreground">Response:</span>
                  <ScrollArea className="h-[100px] mt-1">
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                      {JSON.stringify(selectedNotification.response, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
