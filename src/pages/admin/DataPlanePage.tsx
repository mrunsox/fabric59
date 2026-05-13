import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database, Users, Phone, FileText, RefreshCw, Loader2, Activity, Shield } from "lucide-react";

export default function DataPlanePage() {
  const [activeTab, setActiveTab] = useState("call-usage");
  const [loading, setLoading] = useState(false);
  const [callUsage, setCallUsage] = useState<any[]>([]);
  const [agentActivity, setAgentActivity] = useState<any[]>([]);
  const [crmLeads, setCrmLeads] = useState<any[]>([]);
  const [agentsIdentity, setAgentsIdentity] = useState<any[]>([]);
  const [lifecycleAudit, setLifecycleAudit] = useState<any[]>([]);

  const loadView = async (view: string) => {
    setLoading(true);
    try {
      if (view === "call-usage") {
        const { data } = await supabase.from("fabric59_call_usage_summary" as any).select("*").limit(100);
        setCallUsage(data || []);
      } else if (view === "agent-activity") {
        const { data } = await supabase.from("fabric59_agent_activity_summary" as any).select("*").limit(100);
        setAgentActivity(data || []);
      } else if (view === "crm-leads") {
        const { data } = await supabase.from("fabric59_crm_push_leads" as any).select("*").limit(100);
        setCrmLeads(data || []);
      } else if (view === "agents-identity") {
        const { data } = await supabase.from("fabric59_agents_identity" as any).select("*").limit(100);
        setAgentsIdentity(data || []);
      } else if (view === "lifecycle") {
        const { data } = await supabase.from("fabric59_lifecycle_audit" as any).select("*").limit(100);
        setLifecycleAudit(data || []);
      }
    } catch {
      toast.error("Failed to load view data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadView(activeTab); }, [activeTab]);

  const ViewCard = ({ title, description, icon: Icon, count, viewName }: any) => (
    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab(viewName)}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
          <div className="flex-1">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Badge variant="outline">{count} rows</Badge>
        </div>
      </CardContent>
    </Card>
  );

  const renderTable = (data: any[], columns: string[]) => {
    if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    if (!data.length) return <p className="text-center py-12 text-muted-foreground">No data available. Views populate from operational data.</p>;
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>{columns.map((c) => <TableHead key={c} className="text-xs whitespace-nowrap">{c}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                {columns.map((c) => <TableCell key={c} className="text-sm font-mono whitespace-nowrap">{String(row[c] ?? "—")}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Plane Views</h1>
          <p className="text-sm text-muted-foreground mt-1">Normalized read-only contracts for billing, payroll, and AI agent integration</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadView(activeTab)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        <ViewCard title="Call Usage" description="Per-client call minutes & counts" icon={Phone} count={callUsage.length} viewName="call-usage" />
        <ViewCard title="Agent Activity" description="Talk/hold/wrap time per agent" icon={Activity} count={agentActivity.length} viewName="agent-activity" />
        <ViewCard title="CRM Push Leads" description="Normalized lead events" icon={FileText} count={crmLeads.length} viewName="crm-leads" />
        <ViewCard title="Agents Identity" description="Unified agent directory" icon={Users} count={agentsIdentity.length} viewName="agents-identity" />
        <ViewCard title="Lifecycle Audit" description="Provisioning audit trail" icon={Shield} count={lifecycleAudit.length} viewName="lifecycle" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {activeTab === "call-usage" && "fabric59_call_usage_summary"}
              {activeTab === "agent-activity" && "fabric59_agent_activity_summary"}
              {activeTab === "crm-leads" && "fabric59_crm_push_leads"}
              {activeTab === "agents-identity" && "fabric59_agents_identity"}
              {activeTab === "lifecycle" && "fabric59_lifecycle_audit"}
            </CardTitle>
          </div>
          <CardDescription>
            {activeTab === "call-usage" && "Per client/org/period: total_minutes, total_calls, skill breakdown, billable flags"}
            {activeTab === "agent-activity" && "Per agent/period: talk_time, ready_time, logged_in_time, call_count"}
            {activeTab === "crm-leads" && "Normalized lead events from api_logs where endpoint matches crm-push/*"}
            {activeTab === "agents-identity" && "Unified agent directory joining agents table with five9/slack/google IDs"}
            {activeTab === "lifecycle" && "Filtered audit_logs for agent provisioning/deprovisioning with structured details"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeTab === "call-usage" && renderTable(callUsage, ["org_id", "five9_domain_id", "period_start", "campaign", "skill", "disposition", "total_calls", "total_seconds"])}
          {activeTab === "agent-activity" && renderTable(agentActivity, ["org_id", "five9_domain_id", "external_agent_id", "agent_name", "period_start", "total_calls", "total_talk_seconds", "total_hold_seconds", "total_wrap_seconds", "total_duration_seconds"])}
          {activeTab === "crm-leads" && renderTable(crmLeads, ["org_id", "tenant_id", "crm_type", "crm_action", "contact_name", "contact_email", "contact_phone", "status", "created_at"])}
          {activeTab === "agents-identity" && renderTable(agentsIdentity, ["fabric59_agent_id", "first_name", "last_name", "email", "role", "status", "five9_username", "slack_user_id", "google_user_id", "extension"])}
          {activeTab === "lifecycle" && renderTable(lifecycleAudit, ["id", "action", "entity_type", "entity_id", "performed_by", "created_at", "ip_address"])}
        </CardContent>
      </Card>
    </div>
  );
}
