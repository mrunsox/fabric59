import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { CallLogTable } from "@/components/reports/CallLogTable";
import { ScheduleReportModal } from "@/components/reports/ScheduleReportModal";
import { DispositionGatingConfig } from "@/components/reports/DispositionGatingConfig";
import { useCallLogs, exportCallLogs, type CallLogRecord } from "@/hooks/useCallLogs";
import { useDispositionAccessList } from "@/hooks/useDispositionAccess";
import { useScheduledReports, useUpdateScheduledReportStatus } from "@/hooks/useScheduledReports";
import { usePartners } from "@/hooks/usePartners";
import { useTenants } from "@/hooks/useTenants";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, Download, Clock, Shield, Pause, Play, Trash2, FileSpreadsheet } from "lucide-react";
import { Report59Content } from "@/pages/admin/Report59UploadPage";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ReportsPage() {
  const { isMasterAdmin } = useAuth();
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [startDate, setStartDate] = useState(format(weekAgo, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));
  const [campaignFilter, setCampaignFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [dispositionFilter, setDispositionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [fetchEnabled, setFetchEnabled] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const { data: callLogs = [], isLoading, refetch } = useCallLogs(startDate, endDate, fetchEnabled);
  const { data: dispositionAccess = [] } = useDispositionAccessList();
  const { data: scheduledReports = [] } = useScheduledReports();
  const { data: partners = [] } = usePartners();
  const { data: tenants = [] } = useTenants();
  const updateStatus = useUpdateScheduledReportStatus();

  const filteredClients = useMemo(() => {
    if (partnerFilter === "all") return tenants;
    if (partnerFilter === "direct") return tenants.filter((t) => !t.partner_id);
    return tenants.filter((t) => t.partner_id === partnerFilter);
  }, [tenants, partnerFilter]);

  const allowedDispositions = useMemo(
    () => dispositionAccess.map((d) => d.disposition_name),
    [dispositionAccess]
  );

  const filteredRecords = useMemo(() => {
    let filtered = callLogs;
    if (campaignFilter) {
      filtered = filtered.filter((r) => r.campaignName?.toLowerCase().includes(campaignFilter.toLowerCase()));
    }
    if (agentFilter) {
      filtered = filtered.filter((r) => r.agentName?.toLowerCase().includes(agentFilter.toLowerCase()));
    }
    if (dispositionFilter && dispositionFilter !== "all") {
      filtered = filtered.filter((r) => r.disposition === dispositionFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.customerName?.toLowerCase().includes(q) ||
          r.phoneNumber?.includes(q)
      );
    }
    return filtered;
  }, [callLogs, campaignFilter, agentFilter, dispositionFilter, searchQuery]);

  const handleFetch = () => {
    setFetchEnabled(true);
    setPage(1);
    refetch();
  };

  const handleExport = async (fmt: "csv" | "xlsx" | "pdf") => {
    try {
      await exportCallLogs(filteredRecords, fmt);
      toast.success(`Export started (${fmt.toUpperCase()})`);
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Reports
          </h1>
          <p className="text-sm text-muted-foreground">Call log reports with disposition gating and exports</p>
        </div>
      </div>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">Call Logs</TabsTrigger>
          <TabsTrigger value="report59" className="gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" /> Report59</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          {isMasterAdmin && <TabsTrigger value="gating">Disposition Gating</TabsTrigger>}
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Partner / Client filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={partnerFilter}
              onChange={(e) => { setPartnerFilter(e.target.value); setClientFilter("all"); }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Partners</option>
              <option value="direct">Direct (no partner)</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Clients</option>
              {filteredClients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <ReportFilters
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            campaignFilter={campaignFilter}
            onCampaignFilterChange={setCampaignFilter}
            agentFilter={agentFilter}
            onAgentFilterChange={setAgentFilter}
            dispositionFilter={dispositionFilter}
            onDispositionFilterChange={setDispositionFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            allowedDispositions={allowedDispositions}
            onFetch={handleFetch}
            isLoading={isLoading}
          />

          {filteredRecords.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport("csv")} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> XLS
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowScheduleModal(true)} className="gap-1.5 ml-auto">
                <Clock className="h-3.5 w-3.5" /> Schedule Report
              </Button>
            </div>
          )}

          <CallLogTable
            records={filteredRecords}
            page={page}
            pageSize={25}
            onPageChange={setPage}
          />
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage recurring report schedules</p>
            <Button size="sm" onClick={() => setShowScheduleModal(true)} className="gap-1.5">
              <Clock className="h-3.5 w-3.5" /> New Schedule
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No scheduled reports
                    </TableCell>
                  </TableRow>
                ) : (
                  scheduledReports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="capitalize">{r.frequency}</TableCell>
                      <TableCell className="text-sm">{r.date_range_type.replace(/_/g, " ")}</TableCell>
                      <TableCell className="uppercase text-sm">{r.export_format}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(r.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {r.status === "active" ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: r.id, status: "paused" })}>
                              <Pause className="h-3.5 w-3.5" />
                            </Button>
                          ) : r.status === "paused" ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: r.id, status: "active" })}>
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateStatus.mutate({ id: r.id, status: "cancelled" })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {isMasterAdmin && (
          <TabsContent value="gating">
            <DispositionGatingConfig />
          </TabsContent>
        )}
      </Tabs>

      <ScheduleReportModal open={showScheduleModal} onOpenChange={setShowScheduleModal} />
    </div>
  );
}
