import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign, FileText, TrendingUp, CreditCard, Download, Plus,
  Building2, Users, Clock, Calculator
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const MOCK_RATES = [
  { client: "Smith & Associates", partner: "24H Virtual (Direct)", ratePerMin: 1.25, tier: "standard", status: "active" },
  { client: "Johnson Legal Group", partner: "24H Virtual (Direct)", ratePerMin: 1.50, tier: "premium", status: "active" },
  { client: "Garcia Home Services", partner: "Partner A", ratePerMin: 0.95, tier: "basic", status: "active" },
  { client: "Williams & Co", partner: "Partner A", ratePerMin: 1.25, tier: "standard", status: "active" },
  { client: "Davis Medical", partner: "24H Virtual (Direct)", ratePerMin: 1.75, tier: "premium", status: "paused" },
];

const MOCK_INVOICES = [
  { id: "INV-2026-001", client: "Smith & Associates", partner: "24H Virtual (Direct)", period: "Feb 2026", minutes: 2450, amount: 3062.50, status: "paid", paidDate: "2026-03-05" },
  { id: "INV-2026-002", client: "Johnson Legal Group", partner: "24H Virtual (Direct)", period: "Feb 2026", minutes: 1820, amount: 2730.00, status: "paid", paidDate: "2026-03-03" },
  { id: "INV-2026-003", client: "Garcia Home Services", partner: "Partner A", period: "Feb 2026", minutes: 3100, amount: 2945.00, status: "pending", paidDate: null },
  { id: "INV-2026-004", client: "Williams & Co", partner: "Partner A", period: "Feb 2026", minutes: 1540, amount: 1925.00, status: "overdue", paidDate: null },
  { id: "INV-2026-005", client: "Davis Medical", partner: "24H Virtual (Direct)", period: "Jan 2026", minutes: 890, amount: 1557.50, status: "paid", paidDate: "2026-02-10" },
];

const MOCK_PARTNER_ROLLUP = [
  { partner: "24H Virtual (Direct)", clients: 3, totalMinutes: 5160, totalAmount: 7350.00, status: "active" },
  { partner: "Partner A", clients: 2, totalMinutes: 4640, totalAmount: 4870.00, status: "active" },
];

const MOCK_MONTHLY = [
  { month: "Sep", revenue: 8200 },
  { month: "Oct", revenue: 9100 },
  { month: "Nov", revenue: 10400 },
  { month: "Dec", revenue: 9800 },
  { month: "Jan", revenue: 11200 },
  { month: "Feb", revenue: 12220 },
];

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "paid") return "default";
  if (s === "pending") return "secondary";
  if (s === "overdue") return "destructive";
  return "outline";
};

export default function BillingPage() {
  const [rateFilter, setRateFilter] = useState("all");

  const totalRevenue = MOCK_INVOICES.reduce((s, inv) => s + inv.amount, 0);
  const totalMinutes = MOCK_INVOICES.reduce((s, inv) => s + inv.minutes, 0);
  const paidInvoices = MOCK_INVOICES.filter(i => i.status === "paid").length;
  const overdueInvoices = MOCK_INVOICES.filter(i => i.status === "overdue").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" /> Billing
          </h1>
          <p className="text-sm text-muted-foreground">Per-minute rates, invoices, and partner billing rollups</p>
        </div>
        <Button className="gap-1.5"><Plus className="h-4 w-4" /> Generate Invoice</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><DollarSign className="h-4 w-4" /><span className="text-xs">Total Revenue</span></div>
          <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Clock className="h-4 w-4" /><span className="text-xs">Total Minutes</span></div>
          <p className="text-2xl font-bold">{totalMinutes.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><FileText className="h-4 w-4" /><span className="text-xs">Paid Invoices</span></div>
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
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Minutes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_INVOICES.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.id}</TableCell>
                      <TableCell className="font-medium">{inv.client}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.partner}</TableCell>
                      <TableCell>{inv.period}</TableCell>
                      <TableCell className="text-right font-mono">{inv.minutes.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono font-medium">${inv.amount.toFixed(2)}</TableCell>
                      <TableCell><Badge variant={statusVariant(inv.status)} className="capitalize">{inv.status}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="gap-1"><Download className="h-3.5 w-3.5" /> PDF</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" /> Per-Minute Rate Configuration</CardTitle>
                <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Rate</Button>
              </div>
            </CardHeader>
            <CardContent>
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
                  {MOCK_RATES.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.client}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.partner}</TableCell>
                      <TableCell className="font-mono font-medium">${r.ratePerMin.toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{r.tier}</Badge></TableCell>
                      <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"} className="capitalize">{r.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Partner Billing Rollup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MOCK_PARTNER_ROLLUP.map((p, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-3">{p.partner}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-xs text-muted-foreground">Clients</p><p className="text-xl font-bold">{p.clients}</p></div>
                        <div><p className="text-xs text-muted-foreground">Total Minutes</p><p className="text-xl font-bold font-mono">{p.totalMinutes.toLocaleString()}</p></div>
                        <div className="col-span-2"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold font-mono text-success">${p.totalAmount.toLocaleString()}</p></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Monthly Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={MOCK_MONTHLY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
