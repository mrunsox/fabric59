import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROUTE_GROUPS: { group: string; routes: { path: string; label: string }[] }[] = [
  {
    group: "Integration core",
    routes: [
      { path: "/admin", label: "Overview" },
      { path: "/admin/workspaces", label: "Workspaces" },
      { path: "/admin/clients", label: "Clients" },
      { path: "/admin/five9", label: "Five9" },
      { path: "/admin/connectors", label: "Connectors" },
      { path: "/admin/flows", label: "Flows" },
      { path: "/admin/deployments", label: "Deployments" },
      { path: "/admin/runs", label: "Runs" },
      { path: "/admin/templates", label: "Templates" },
      { path: "/admin/settings", label: "Settings" },
    ],
  },
  {
    group: "Five9 sub-pages",
    routes: [
      { path: "/admin/five9/campaign-builder", label: "Campaign Builder" },
      { path: "/admin/domains", label: "Domains" },
      { path: "/admin/dispositions", label: "Dispositions" },
      { path: "/admin/campaigns", label: "Campaigns (legacy)" },
      { path: "/admin/campaigns/overview", label: "Campaigns Overview" },
      { path: "/admin/campaigns/drafts", label: "Campaign Drafts" },
      { path: "/admin/campaigns/readiness", label: "Campaign Readiness" },
      { path: "/admin/campaigns/event-log", label: "Event Log" },
    ],
  },
  {
    group: "Archived — Agent Lifecycle",
    routes: [
      { path: "/admin/agents", label: "Agents (provisioning)" },
      { path: "/admin/agent-dashboard", label: "Agent Dashboard" },
      { path: "/admin/supervisor", label: "Supervisor" },
    ],
  },
  {
    group: "Archived — Scripts & call flow",
    routes: [
      { path: "/admin/scripts", label: "Script Editor" },
      { path: "/admin/scriptflow", label: "ScriptFlow Hub" },
      { path: "/admin/scripter", label: "Scripter" },
      { path: "/admin/script-routing", label: "Script Routing" },
      { path: "/admin/call-flow", label: "Call Flow Builder" },
      { path: "/admin/tree-editor", label: "Tree Editor" },
    ],
  },
  {
    group: "Archived — Operations",
    routes: [
      { path: "/admin/qa", label: "QA Analytics" },
      { path: "/admin/training", label: "Training" },
      { path: "/admin/kb", label: "Knowledge Base" },
      { path: "/admin/reports", label: "Reports" },
      { path: "/admin/billing", label: "Billing" },
      { path: "/admin/goals", label: "Goals" },
      { path: "/admin/automations", label: "Post-Call Automations" },
      { path: "/admin/feedback", label: "Feedback" },
      { path: "/admin/partners", label: "Partners" },
      { path: "/admin/campaign-blueprints", label: "Campaign Blueprints" },
      { path: "/admin/data-plane", label: "Data Plane" },
      { path: "/admin/identity", label: "Identity Resolution" },
      { path: "/admin/mappings", label: "Mappings" },
      { path: "/admin/email-templates", label: "Email Templates" },
      { path: "/admin/summary-templates", label: "Call Summary Templates" },
      { path: "/admin/qr-routing", label: "QR Routing" },
      { path: "/admin/utilities", label: "Platform Utilities" },
      { path: "/admin/design-system", label: "Design System" },
      { path: "/admin/test", label: "Test Console" },
      { path: "/admin/logs", label: "API Logs" },
      { path: "/admin/notifications", label: "Notifications" },
    ],
  },
  {
    group: "Superadmin",
    routes: [
      { path: "/superadmin", label: "Overview" },
      { path: "/superadmin/vault", label: "Feature Vault" },
      { path: "/superadmin/exports", label: "Source Exports" },
      { path: "/superadmin/docs", label: "System Docs" },
    ],
  },
];

export default function AdvancedRoutesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Advanced Routes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Every route in the app, including archived ones. Direct URLs always resolve.
        </p>
      </div>

      <div className="space-y-6">
        {ROUTE_GROUPS.map((g) => (
          <Card key={g.group}>
            <CardHeader>
              <CardTitle className="text-base">{g.group}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {g.routes.map((r) => (
                  <Link
                    key={r.path}
                    to={r.path}
                    className="flex flex-col gap-0.5 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-sm text-foreground">{r.label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{r.path}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
