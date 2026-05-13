import { useMemo } from "react";
import { useInvoices } from "@/hooks/useInvoices";
import { useAuth } from "@/contexts/AuthContext";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Receipt, DollarSign, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

/**
 * Phase 5 — Canonical /org/billing.
 *
 * Honest org billing surface. Shows the org's plan/identity and a read-only
 * invoice ledger sourced from the canonical `invoices` table. Self-serve
 * payment methods, plan changes, and proration intentionally absent until the
 * subscription primitives land.
 */
export default function OrgBillingPage() {
  const { organization } = useAuth();
  const { data: invoices = [], isLoading } = useInvoices();

  const totals = useMemo(() => {
    let outstanding = 0;
    let paid = 0;
    let overdue = 0;
    const currency = invoices[0]?.currency ?? "USD";
    for (const inv of invoices) {
      const amt = Number(inv.total_amount) || 0;
      if (inv.status === "paid") paid += amt;
      else if (inv.status === "overdue") {
        overdue += amt;
        outstanding += amt;
      } else outstanding += amt;
    }
    return { outstanding, paid, overdue, currency };
  }, [invoices]);

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: totals.currency }).format(n);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 animate-fade-in">
      <OrgPageHeader
        eyebrow="Organization"
        title="Billing"
        lede="Plan and invoice ledger for your organization. Self-serve payment methods and plan changes are not yet available — talk to your account team for changes."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Plan</p>
            <p className="text-2xl font-semibold mt-1 capitalize">
              {(organization as { plan?: string } | null)?.plan ?? "Standard"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {organization?.status ? `Status: ${organization.status}` : "Active"}
            </p>
          </CardContent>
        </Card>
        <Stat label="Outstanding" value={fmtMoney(totals.outstanding)} icon={DollarSign} />
        <Stat label="Overdue" value={fmtMoney(totals.overdue)} icon={AlertTriangle} tone={totals.overdue > 0 ? "danger" : undefined} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices yet"
              description="Invoices will appear here once your account team issues them."
            />
          ) : (
            <div className="divide-y divide-border/60">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium tabular-nums">
                      {new Intl.NumberFormat(undefined, { style: "currency", currency: inv.currency || "USD" }).format(
                        Number(inv.total_amount) || 0,
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Issued {format(new Date(inv.issue_date), "MMM d, yyyy")}
                      {inv.due_date && (
                        <>
                          {" · due "}
                          {format(new Date(inv.due_date), "MMM d, yyyy")}
                        </>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "danger";
}) {
  const toneClass = tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          <Icon className={`h-3.5 w-3.5 ${toneClass}`} />
          <span>{label}</span>
        </div>
        <p className={`text-2xl font-semibold mt-1 tabular-nums ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
