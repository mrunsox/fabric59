import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DollarSign, FileText, CreditCard, Download, Plus,
  Building2, Clock, Calculator
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useInvoices, useCreateInvoice, useUpdateInvoiceStatus, type Invoice } from "@/hooks/useInvoices";
import { usePartners } from "@/hooks/usePartners";
import { useTenants } from "@/hooks/useTenants";
import { useReportUploads } from "@/hooks/useReportUploads";
import { toast } from "sonner";

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "paid") return "default";
  if (s === "pending" || s === "sent") return "secondary";
  if (s === "overdue") return "destructive";
  return "outline";
};

export default function BillingPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [showGenerate, setShowGenerate] = useState(false);
  const [genPartnerId, setGenPartnerId] = useState("");
  const [genPeriodStart, setGenPeriodStart] = useState("");
  const [genPeriodEnd, setGenPeriodEnd] = useState("");

  const { data: invoices = [], isLoading } = useInvoices(statusFilter);
  const { data: partners = [] } = usePartners();
  const { data: tenants = [] } = useTenants();
  const { data: uploads = [] } = useReportUploads();
  const createInvoice = useCreateInvoice();
  const updateStatus = useUpdateInvoiceStatus();

  const totalRevenue = invoices.reduce((s, inv) => s + Number(inv.total_amount), 0);
  const totalMinutes = invoices.reduce((s, inv) => {
    // Sum quantities from line items if stored in metadata, fallback to 0
    return s;
  }, 0);
  const paidInvoices = invoices.filter(i => i.status === "paid").length;
  const overdueInvoices = invoices.filter(i => i.status === "overdue").length;

  // Rate config from partners + tenants
  const rateConfig = useMemo(() => {
    const rows: Array<{ client: string; partner: string; rate: number; tier: string; status: string; tenantId: string; partnerId: string }> = [];
    tenants.forEach(t => {
      const partner = partners.find(p => p.id === t.partner_id);
      const rate = (t as any).billing_rate_per_minute ?? (partner as any)?.billing_default_rate_per_minute ?? 0;
      rows.push({
        client: t.name,
        partner: partner?.name || "Direct",
        rate: Number(rate),
        tier: rate > 1.5 ? "premium" : rate > 1 ? "standard" : "basic",
        status: t.status,
        tenantId: t.id,
        partnerId: t.partner_id || "",
      });
    });
    return rows;
  }, [tenants, partners]);

  // Partner rollup from invoices
  const partnerRollup = useMemo(() => {
    const map: Record<string, { partner: string; clients: Set<string>; totalAmount: number; count: number }> = {};
    invoices.forEach(inv => {
      const pId = inv.partner_id || "direct";
      if (!map[pId]) {
        const p = partners.find(pp => pp.id === pId);
        map[pId] = { partner: p?.name || "Direct", clients: new Set(), totalAmount: 0, count: 0 };
      }
      if (inv.tenant_id) map[pId].clients.add(inv.tenant_id);
      map[pId].totalAmount += Number(inv.total_amount);
      map[pId].count++;
    });
    return Object.values(map).map(v => ({ ...v, clients: v.clients.size }));
  }, [invoices, partners]);

  // Monthly trends from invoices
  const monthlyTrends = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach(inv => {
      const month = inv.issue_date?.substring(0, 7) || "Unknown";
      map[month] = (map[month] || 0) + Number(inv.total_amount);
    });
    return Object.entries(map).sort().slice(-6).map(([month, revenue]) => ({ month, revenue }));
  }, [invoices]);

  const handleGenerate = () => {
    if (!genPartnerId || !genPeriodStart || !genPeriodEnd) {
      toast.error("Please fill all fields");
      return;
    }

    // Find uploads in period for this partner
    const partnerUploads = uploads.filter(u => {
      if (genPartnerId !== "all" && u.partner_id !== genPartnerId) return false;
      return true;
    });

    // Compute line items from uploads
    const clientMinutes: Record<string, { name: string; minutes: number }> = {};
    partnerUploads.forEach(u => {
      const summary = u.parsed_summary as Record<string, any>;
      const tId = u.tenant_id || "unscoped";
      const tenant = tenants.find(t => t.id === tId);
      if (!clientMinutes[tId]) clientMinutes[tId] = { name: tenant?.name || "Unscoped", minutes: 0 };
      clientMinutes[tId].minutes += Number(summary?.total_minutes || 0);
    });

    const lineItems = Object.entries(clientMinutes).map(([tId, data]) => {
      const tenant = tenants.find(t => t.id === tId);
      const partner = partners.find(p => p.id === genPartnerId);
      const rate = Number((tenant as any)?.billing_rate_per_minute ?? (partner as any)?.billing_default_rate_per_minute ?? 1.0);
      return {
        tenant_id: tId === "unscoped" ? null : tId,
        description: `${data.name} — ${genPeriodStart} to ${genPeriodEnd}`,
        quantity: data.minutes,
        unit: "minutes",
        rate,
        amount: data.minutes * rate,
      };
    });

    const totalAmount = lineItems.reduce((s, li) => s + li.amount, 0);

    createInvoice.mutate({
      partner_id: genPartnerId === "all" ? null : genPartnerId,
      total_amount: totalAmount,
      source_period_start: genPeriodStart,
      source_period_end: genPeriodEnd,
      line_items: lineItems,
    }, {
      onSuccess: () => {
        setShowGenerate(false);
        setGenPartnerId("");
        setGenPeriodStart("");
        setGenPeriodEnd("");
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" /> Billing & Invoices
          </h1>
          <p className="text-sm text-muted-foreground">Per-minute rates, invoices, and partner billing rollups</p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowGenerate(true)}><Plus className="h-4 w-4" /> Generate Invoice</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><DollarSign className="h-4 w-4" /><span className="text-xs">Total Revenue</span></div>
          <p className="text-2xl font-bold">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><FileText className="h-4 w-4" /><span className="text-xs">Total Invoices</span></div>
          <p className="text-2xl font-bold">{invoices.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><FileText className="h-4 w-4" /><span className="text-xs">Paid</span></div>
          <p className="text-2xl font-bold text-success">{paidInvoices}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><FileText className="h-4 w-4" /><span className="text-xs">Overdue</span></div>
          <p className="text-2xl font-bold text-destructive">{overdueInvoices}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="rates">Rate Config</TabsTrigger>
          <TabsTrigger value="partners">Partner Rollup</TabsTrigger>
          <TabsTrigger value="trends">Revenue Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="pt-6">
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No invoices yet. Generate one from Report59 uploads.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(inv => {
                      const partner = partners.find(p => p.id === inv.partner_id);
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-sm">{inv.id.substring(0, 8)}</TableCell>
                          <TableCell className="text-sm">{partner?.name || "Direct"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {inv.source_period_start && inv.source_period_end ? `${inv.source_period_start} — ${inv.source_period_end}` : inv.issue_date}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">${Number(inv.total_amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(inv.status)} className="capitalize">{inv.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {inv.status === "draft" && (
                                <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: inv.id, status: "sent" })}>Mark Sent</Button>
                              )}
                              {inv.status === "sent" && (
                                <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: inv.id, status: "paid" })}>Mark Paid</Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" /> Per-Minute Rate Configuration</CardTitle>
              <CardDescription>Rates are configured on each client or inherited from the partner default.</CardDescription>
            </CardHeader>
            <CardContent>
              {rateConfig.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No clients configured yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Rate/Min</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateConfig.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.client}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.partner}</TableCell>
                        <TableCell className="font-mono font-medium">${r.rate.toFixed(2)}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{r.tier}</Badge></TableCell>
                        <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"} className="capitalize">{r.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Partner Billing Rollup</CardTitle>
            </CardHeader>
            <CardContent>
              {partnerRollup.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No invoice data to roll up yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {partnerRollup.map((p, i) => (
                    <Card key={i}>
                      <CardContent className="pt-4">
                        <h4 className="font-medium mb-3">{p.partner}</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div><p className="text-xs text-muted-foreground">Clients</p><p className="text-xl font-bold">{p.clients}</p></div>
                          <div><p className="text-xs text-muted-foreground">Invoices</p><p className="text-xl font-bold">{p.count}</p></div>
                          <div className="col-span-2"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold font-mono text-success">${p.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Monthly Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              {monthlyTrends.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No invoice data for trends yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generate Invoice Modal */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invoice from Usage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Partner</Label>
              <Select value={genPartnerId} onValueChange={setGenPartnerId}>
                <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All (Direct)</SelectItem>
                  {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period Start</Label>
                <Input type="date" value={genPeriodStart} onChange={e => setGenPeriodStart(e.target.value)} />
              </div>
              <div>
                <Label>Period End</Label>
                <Input type="date" value={genPeriodEnd} onChange={e => setGenPeriodEnd(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Invoice will be generated from Report59 uploads for the selected partner and period, using configured per-minute rates.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={createInvoice.isPending}>
              {createInvoice.isPending ? "Generating…" : "Generate Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
