import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, CreditCard, AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useWorkspaceInvoices } from "@/hooks/useWorkspaceBilling";
import { useWorkspaceKpis } from "@/hooks/useWorkspaceAnalytics";

/**
 * Phase 8 — Honest canonical billing shell.
 *
 * Surfaces real `invoices` data + a usage snapshot derived from canonical
 * call/outcome counts. Plan/subscription primitives are deferred until the
 * billing backend lands; that scope is documented in /outline.
 */
export default function WorkspaceBillingPage() {
  useParams<{ workspaceId: string }>();
  const { data: invoices = [], isLoading } = useWorkspaceInvoices(25);
  const { data: kpis } = useWorkspaceKpis();

  const totalAmount = invoices.reduce((s, i) => s + Number(i.total_amount ?? 0), 0);
  const outstanding = invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + Number(i.total_amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing & Usage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your workspace invoices and usage at a glance.
        </p>
      </div>

      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="py-3 flex items-start gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div>
            Plan changes, payment methods, and self-serve checkout are handled by your account
            manager. Reach out to update billing details — this page shows your current invoices
            and usage.
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Plan"
          value="Custom"
          icon={CreditCard}
          hint="Managed by platform admin"
        />
        <KpiCard
          label="Invoices"
          value={invoices.length}
          icon={Receipt}
          loading={isLoading}
        />
        <KpiCard
          label="Total invoiced"
          value={`$${totalAmount.toFixed(2)}`}
          loading={isLoading}
        />
        <KpiCard
          label="Outstanding"
          value={`$${outstanding.toFixed(2)}`}
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Usage snapshot (7d)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Calls</div>
            <div className="text-lg font-semibold tabular-nums">{kpis?.callsLast7d ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Outcomes</div>
            <div className="text-lg font-semibold tabular-nums">{kpis?.outcomesLast7d ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Active campaigns</div>
            <div className="text-lg font-semibold tabular-nums">{kpis?.campaignsActive ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Published guides</div>
            <div className="text-lg font-semibold tabular-nums">{kpis?.guidesPublished ?? 0}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Invoices</CardTitle>
          <Button variant="outline" size="sm" disabled>
            Export
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">Loading…</p>
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices yet"
              description="Invoices generated from canonical usage will appear here."
            />
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between border rounded-md px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium">
                      {inv.currency} {Number(inv.total_amount).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Issued {inv.issue_date}
                      {inv.due_date && <> · Due {inv.due_date}</>}
                    </div>
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
