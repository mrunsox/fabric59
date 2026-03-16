import { useState, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, X, Filter, Clock, Phone, Users, TrendingUp, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useReportUploads, useCreateReportUpload, useDeleteReportUpload } from "@/hooks/useReportUploads";
import { usePartners } from "@/hooks/usePartners";
import { useTenants } from "@/hooks/useTenants";

interface ParsedRow {
  [key: string]: string;
}

const CHART_COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--warning))"
];

export function Report59Content() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [excludedColumns, setExcludedColumns] = useState<Set<string>>(new Set());
  const [excludedDispositions, setExcludedDispositions] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const pageSize = 50;

  const { data: uploads = [], isLoading: uploadsLoading } = useReportUploads();
  const createUpload = useCreateReportUpload();
  const deleteUpload = useDeleteReportUpload();
  const { data: partners = [] } = usePartners();
  const { data: tenants = [] } = useTenants();

  const filteredTenants = selectedPartnerId
    ? tenants.filter((t) => t.partner_id === selectedPartnerId)
    : tenants;

  const parseCSV = useCallback((text: string) => {
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    const hdrs = lines[0].split(delimiter).map(h => h.replace(/^"|"$/g, "").trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.replace(/^"|"$/g, "").trim());
      const row: ParsedRow = {};
      hdrs.forEach((h, i) => { row[h] = values[i] || ""; });
      return row;
    });
    return { headers: hdrs, rows };
  }, []);

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  }, []);

  const processFile = async (f: File) => {
    setFile(f);
    setIsUploading(true);
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    };
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: hdrs, rows } = parseCSV(text);
      setHeaders(hdrs);
      setParsedData(rows);
      setIsUploading(false);
      setUploadProgress(100);
      setPage(1);

      // Build parsed summary for DB persistence
      const talkCol = hdrs.find(h => h.toUpperCase().includes("TALK TIME") || h.toUpperCase().includes("HANDLE TIME"));
      const agentCol = hdrs.find(h => h.toUpperCase().includes("AGENT"));
      const dispCol = hdrs.find(h => h.toUpperCase().includes("DISPOSITION"));
      const campaignCol = hdrs.find(h => h.toUpperCase().includes("CAMPAIGN"));

      const parseDuration = (val: string) => {
        if (!val) return 0;
        const parts = val.split(":").map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return Number(val) || 0;
      };

      const totalSeconds = talkCol ? rows.reduce((s, r) => s + parseDuration(r[talkCol]), 0) : 0;
      const dispBreakdown: Record<string, number> = {};
      if (dispCol) rows.forEach(r => { const d = r[dispCol] || "Unknown"; dispBreakdown[d] = (dispBreakdown[d] || 0) + 1; });
      const agentBreakdown: Record<string, number> = {};
      if (agentCol) rows.forEach(r => { const a = r[agentCol]; if (a) agentBreakdown[a] = (agentBreakdown[a] || 0) + 1; });
      const campaign = campaignCol ? rows[0]?.[campaignCol] || "Unknown" : "Unknown";

      const parsedSummary = {
        total_calls: rows.length,
        total_minutes: Math.round(totalSeconds / 60),
        total_seconds: totalSeconds,
        campaign,
        disposition_breakdown: dispBreakdown,
        agent_breakdown: agentBreakdown,
        unique_agents: Object.keys(agentBreakdown).length,
      };

      // Persist to database
      createUpload.mutate({
        original_filename: f.name,
        file_size_bytes: f.size,
        file_type: f.name.endsWith(".xlsx") || f.name.endsWith(".xls") ? "xlsx" : "csv",
        partner_id: selectedPartnerId || null,
        tenant_id: selectedTenantId || null,
        parsed_summary: parsedSummary,
        exclusions_applied: [],
        row_count: rows.length,
      });

      toast.success(`Parsed ${rows.length} rows from ${hdrs.length} columns`);
    };
    reader.readAsText(f);
  };

  const clearUpload = () => {
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setExcludedColumns(new Set());
    setExcludedDispositions(new Set());
    setUploadProgress(0);
  };

  const toggleColumn = (col: string) => {
    setExcludedColumns(prev => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      return next;
    });
  };

  const toggleDisposition = (d: string) => {
    setExcludedDispositions(prev => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  };

  const activeHeaders = headers.filter(h => !excludedColumns.has(h));

  const filteredData = useMemo(() => {
    let data = parsedData;
    const dispCol = headers.find(h => h.toUpperCase().includes("DISPOSITION"));
    if (dispCol && excludedDispositions.size > 0) {
      data = data.filter(r => !excludedDispositions.has(r[dispCol]));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(r => Object.values(r).some(v => v.toLowerCase().includes(q)));
    }
    return data;
  }, [parsedData, excludedDispositions, searchQuery, headers]);

  const analytics = useMemo(() => {
    if (filteredData.length === 0) return null;
    const talkCol = headers.find(h => h.toUpperCase().includes("TALK TIME") || h.toUpperCase().includes("HANDLE TIME"));
    const agentCol = headers.find(h => h.toUpperCase().includes("AGENT"));
    const campaignCol = headers.find(h => h.toUpperCase().includes("CAMPAIGN"));
    const dispCol = headers.find(h => h.toUpperCase().includes("DISPOSITION"));
    const aniCol = headers.find(h => h.toUpperCase().includes("ANI") || h.toUpperCase().includes("PHONE"));

    const parseDuration = (val: string) => {
      if (!val) return 0;
      const parts = val.split(":").map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return Number(val) || 0;
    };

    const totalCalls = filteredData.length;
    const totalSeconds = talkCol ? filteredData.reduce((s, r) => s + parseDuration(r[talkCol]), 0) : 0;
    const totalMinutes = Math.round(totalSeconds / 60);
    const avgDuration = totalCalls > 0 ? Math.round(totalSeconds / totalCalls) : 0;
    const uniqueAgents = agentCol ? new Set(filteredData.map(r => r[agentCol]).filter(Boolean)).size : 0;
    const uniqueCallers = aniCol ? new Set(filteredData.map(r => r[aniCol]).filter(Boolean)).size : 0;

    const dispBreakdown: Record<string, number> = {};
    if (dispCol) filteredData.forEach(r => { const d = r[dispCol] || "Unknown"; dispBreakdown[d] = (dispBreakdown[d] || 0) + 1; });
    const dispData = Object.entries(dispBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));

    const campBreakdown: Record<string, number> = {};
    if (campaignCol) filteredData.forEach(r => { const c = r[campaignCol] || "Unknown"; campBreakdown[c] = (campBreakdown[c] || 0) + 1; });
    const campData = Object.entries(campBreakdown).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

    const agentBreakdown: Record<string, { calls: number; totalSec: number }> = {};
    if (agentCol) {
      filteredData.forEach(r => {
        const a = r[agentCol] || "Unknown";
        if (!agentBreakdown[a]) agentBreakdown[a] = { calls: 0, totalSec: 0 };
        agentBreakdown[a].calls++;
        if (talkCol) agentBreakdown[a].totalSec += parseDuration(r[talkCol]);
      });
    }
    const agentData = Object.entries(agentBreakdown).sort((a, b) => b[1].calls - a[1].calls).slice(0, 10).map(([name, { calls, totalSec }]) => ({ name, calls, avgSec: Math.round(totalSec / calls) }));

    const callerFreq: Record<string, number> = {};
    if (aniCol) filteredData.forEach(r => { const a = r[aniCol]; if (a) callerFreq[a] = (callerFreq[a] || 0) + 1; });
    const repeatCallers = Object.entries(callerFreq).filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([phone, count]) => ({ phone, count }));

    return { totalCalls, totalMinutes, avgDuration, uniqueAgents, uniqueCallers, dispData, campData, agentData, repeatCallers };
  }, [filteredData, headers]);

  const allDispositions = useMemo(() => {
    const dispCol = headers.find(h => h.toUpperCase().includes("DISPOSITION"));
    if (!dispCol) return [];
    const counts: Record<string, number> = {};
    parsedData.forEach(r => { const d = r[dispCol] || "Unknown"; counts[d] = (counts[d] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [parsedData, headers]);

  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  return (
    <div className="space-y-6">
      {file && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={clearUpload} className="gap-1.5">
            <X className="h-3.5 w-3.5" /> Clear Upload
          </Button>
        </div>
      )}

      {!file ? (
        <div className="space-y-6">
          {/* Partner/Client scope selectors */}
          <div className="flex gap-4">
            <div className="w-64">
              <label className="text-xs text-muted-foreground mb-1 block">Partner (optional)</label>
              <Select value={selectedPartnerId} onValueChange={(v) => { setSelectedPartnerId(v === "none" ? "" : v); setSelectedTenantId(""); }}>
                <SelectTrigger><SelectValue placeholder="All partners" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All partners</SelectItem>
                  {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-64">
              <label className="text-xs text-muted-foreground mb-1 block">Client (optional)</label>
              <Select value={selectedTenantId} onValueChange={(v) => setSelectedTenantId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="All clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All clients</SelectItem>
                  {filteredTenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Upload zone */}
          <Card>
            <CardContent className="pt-6">
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-1">Drop a Five9 report file here</h3>
                <p className="text-sm text-muted-foreground mb-4">Supports CSV, TSV, and XLSX exports from Five9 Reporting</p>
                <Button variant="outline" className="gap-1.5">
                  <FileSpreadsheet className="h-4 w-4" /> Browse Files
                </Button>
                <input id="file-input" type="file" accept=".csv,.tsv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
              </div>
            </CardContent>
          </Card>

          {/* Upload History from DB */}
          {uploads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" /> Upload History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead className="text-right">Minutes</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploads.map(h => {
                      const summary = h.parsed_summary as Record<string, any>;
                      return (
                        <TableRow key={h.id}>
                          <TableCell className="font-medium">{h.original_filename}</TableCell>
                          <TableCell>{summary?.campaign || "—"}</TableCell>
                          <TableCell>{h.row_count.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{(summary?.total_minutes || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(h.uploaded_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteUpload.mutate(h.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <>
          {isUploading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Parsing {file.name}…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {!isUploading && (
            <Tabs defaultValue="analytics">
              <TabsList>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="data">Data Table</TabsTrigger>
                <TabsTrigger value="dispositions">Dispositions</TabsTrigger>
                <TabsTrigger value="columns">Columns</TabsTrigger>
              </TabsList>

              <TabsContent value="analytics" className="space-y-6">
                {analytics && (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      <Card><CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1"><Phone className="h-4 w-4" /><span className="text-xs">Total Calls</span></div>
                        <p className="text-2xl font-bold">{analytics.totalCalls.toLocaleString()}</p>
                      </CardContent></Card>
                      <Card><CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1"><Clock className="h-4 w-4" /><span className="text-xs">Total Minutes</span></div>
                        <p className="text-2xl font-bold">{analytics.totalMinutes.toLocaleString()}</p>
                      </CardContent></Card>
                      <Card><CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1"><TrendingUp className="h-4 w-4" /><span className="text-xs">Avg Duration</span></div>
                        <p className="text-2xl font-bold">{Math.floor(analytics.avgDuration / 60)}:{String(analytics.avgDuration % 60).padStart(2, "0")}</p>
                      </CardContent></Card>
                      <Card><CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1"><Users className="h-4 w-4" /><span className="text-xs">Unique Agents</span></div>
                        <p className="text-2xl font-bold">{analytics.uniqueAgents}</p>
                      </CardContent></Card>
                      <Card><CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1"><Phone className="h-4 w-4" /><span className="text-xs">Unique Callers</span></div>
                        <p className="text-2xl font-bold">{analytics.uniqueCallers.toLocaleString()}</p>
                      </CardContent></Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {analytics.campData.length > 0 && (
                        <Card>
                          <CardHeader><CardTitle className="text-base">Calls by Campaign</CardTitle></CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={analytics.campData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      )}
                      {analytics.dispData.length > 0 && (
                        <Card>
                          <CardHeader><CardTitle className="text-base">Disposition Breakdown</CardTitle></CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <PieChart>
                                <Pie data={analytics.dispData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                                  {analytics.dispData.map((_, i) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {analytics.agentData.length > 0 && (
                        <Card>
                          <CardHeader><CardTitle className="text-base">Agent Leaderboard</CardTitle></CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead className="text-right">Calls</TableHead><TableHead className="text-right">Avg Duration</TableHead></TableRow></TableHeader>
                              <TableBody>
                                {analytics.agentData.map((a, i) => (
                                  <TableRow key={i}>
                                    <TableCell className="font-medium">{a.name}</TableCell>
                                    <TableCell className="text-right">{a.calls}</TableCell>
                                    <TableCell className="text-right">{Math.floor(a.avgSec / 60)}:{String(a.avgSec % 60).padStart(2, "0")}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      )}
                      {analytics.repeatCallers.length > 0 && (
                        <Card>
                          <CardHeader><CardTitle className="text-base">Repeat Callers</CardTitle></CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader><TableRow><TableHead>Phone Number</TableHead><TableHead className="text-right">Calls</TableHead></TableRow></TableHeader>
                              <TableBody>
                                {analytics.repeatCallers.map((c, i) => (
                                  <TableRow key={i}>
                                    <TableCell className="font-mono text-sm">{c.phone}</TableCell>
                                    <TableCell className="text-right"><Badge variant="secondary">{c.count}</Badge></TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="data" className="space-y-4">
                <div className="flex items-center gap-3">
                  <Input placeholder="Search all fields…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-sm" />
                  <Badge variant="outline">{filteredData.length.toLocaleString()} rows</Badge>
                  {excludedDispositions.size > 0 && <Badge variant="secondary">{excludedDispositions.size} dispositions excluded</Badge>}
                </div>
                <div className="border rounded-lg overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader><TableRow>{activeHeaders.map(h => <TableHead key={h} className="whitespace-nowrap text-xs">{h}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {paginatedData.map((row, i) => (
                        <TableRow key={i}>{activeHeaders.map(h => <TableCell key={h} className="text-xs whitespace-nowrap max-w-[200px] truncate">{row[h]}</TableCell>)}</TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="dispositions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" /> Disposition Exclusion Manager</CardTitle>
                    <CardDescription>Toggle dispositions to exclude from analysis.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {allDispositions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No disposition column found.</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2 mb-4">
                          <Badge variant="outline">{allDispositions.length} total</Badge>
                          <Badge variant="secondary">{excludedDispositions.size} excluded</Badge>
                          <Badge>{allDispositions.length - excludedDispositions.size} included</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {allDispositions.map(d => (
                            <div key={d.name} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                              <Checkbox checked={!excludedDispositions.has(d.name)} onCheckedChange={() => toggleDisposition(d.name)} />
                              <span className={`text-sm flex-1 ${excludedDispositions.has(d.name) ? "line-through text-muted-foreground" : ""}`}>{d.name}</span>
                              <Badge variant="secondary" className="text-xs">{d.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="columns" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Column Manager</CardTitle>
                    <CardDescription>{activeHeaders.length} of {headers.length} visible.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {headers.map(h => (
                        <div key={h} className="flex items-center gap-2 rounded border border-border px-3 py-2">
                          <Checkbox checked={!excludedColumns.has(h)} onCheckedChange={() => toggleColumn(h)} />
                          <span className={`text-sm ${excludedColumns.has(h) ? "line-through text-muted-foreground" : ""}`}>{h}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}

export default Report59Content;
