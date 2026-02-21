import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, UserMinus, Users2, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { ProvisioningForm } from "@/components/agents/onboarding/ProvisioningForm";
import { WorkflowPanel } from "@/components/agents/onboarding/WorkflowPanel";
import { Five9UsersTable } from "@/components/agents/onboarding/Five9UsersTable";
import { AgentSearchList } from "@/components/agents/offboarding/AgentSearchList";
import { DeprovisioningWorkflowPanel } from "@/components/agents/offboarding/DeprovisioningWorkflowPanel";
import { DeprovisioningModal } from "@/components/agents/offboarding/DeprovisioningModal";
import { AuditLogTable } from "@/components/agents/offboarding/AuditLogTable";
import { useProvisioning } from "@/hooks/useProvisioning";
import { useDeprovisioning } from "@/hooks/useDeprovisioning";
import { useFive9Sync } from "@/hooks/useFive9Sync";
import { ProvisioningHistory, ProvisioningInput } from "@/types/provisioning";
import { DataTransferConfig } from "@/types/deprovisioning";
import { useAuth } from "@/contexts/AuthContext";

export default function AgentsPage() {
  const { user, organization } = useAuth();
  const { steps, isProvisioning, lastResult, history, provisionAgent, refreshAgents, findNextExtension } = useProvisioning();
  const { syncFromFive9, isSyncing } = useFive9Sync();
  const {
    steps: deprovSteps,
    isDeprovisioning,
    auditEntries,
    scheduleDeprovisioning,
    cancelDeprovisioning,
    executeDeprovisioning,
    confirmActiveAgent,
    refreshAuditLog,
  } = useDeprovisioning();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<ProvisioningHistory[]>([]);

  const handleProvision = async (input: ProvisioningInput) => {
    await provisionAgent(input);
  };

  const handleOffboard = (agent: ProvisioningHistory) => {
    setSelectedAgents([agent]);
    setModalOpen(true);
  };

  const handleQuickOffboard = (agent: ProvisioningHistory) => {
    setSelectedAgents([agent]);
    // Immediately confirm with defaults: no grace period, no data transfer
    handleModalConfirm(0, { enabled: false, transferEmail: false, transferDrive: false }, 'Quick offboard');
  };

  const handleBatchOffboard = (agents: ProvisioningHistory[]) => {
    setSelectedAgents(agents);
    setModalOpen(true);
  };

  const handleModalConfirm = async (gracePeriodHours: number, dataTransfer: DataTransferConfig, reason: string) => {
    for (const agent of selectedAgents) {
      await scheduleDeprovisioning(agent, gracePeriodHours, dataTransfer, user?.id || '', reason);
      if (gracePeriodHours === 0) {
        const request = {
          agentId: agent.id,
          agentName: agent.agentName,
          email: agent.email,
          extension: agent.extension,
          role: agent.role,
          scheduledDate: new Date(),
          gracePeriodHours,
          dataTransfer,
          initiatedBy: user?.id || '',
          initiatedAt: new Date(),
          status: 'scheduled' as const,
          reason,
        };
        await executeDeprovisioning(request, user?.id || '');
      }
    }
    await refreshAgents();
    await refreshAuditLog();
    setSelectedAgents([]);
  };

  const handleCancel = async (agent: ProvisioningHistory) => {
    await cancelDeprovisioning(agent.id, user?.id || '');
    await refreshAgents();
  };

  const handleRestore = async (agent: ProvisioningHistory) => {
    await confirmActiveAgent(agent.id);
    await refreshAgents();
  };

  const totalAgents = history.length;
  const activeAgents = history.filter(a => a.status === 'active').length;
  const deprovisionedAgents = history.filter(a => a.status === 'deprovisioned').length;
  const pendingJobs = history.filter(a => a.status === 'pending_deletion').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agent Lifecycle</h1>
          <p className="text-muted-foreground text-sm mt-1">Provision and offboard Five9 agents across Google Workspace and Slack</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await syncFromFive9(organization?.id);
            await refreshAgents();
          }}
          disabled={isSyncing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing…' : 'Sync from Five9'}
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Agents" value={totalAgents} icon={Users2} variant="default" />
        <StatCard title="Active" value={activeAgents} icon={CheckCircle2} variant="success" />
        <StatCard title="Deprovisioned" value={deprovisionedAgents} icon={XCircle} variant="destructive" />
        <StatCard title="Pending Jobs" value={pendingJobs} icon={Clock} variant="warning" />
      </div>

      <Tabs defaultValue="onboarding">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="onboarding" className="gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> Onboarding
          </TabsTrigger>
          <TabsTrigger value="offboarding" className="gap-1.5">
            <UserMinus className="h-3.5 w-3.5" /> Offboarding
          </TabsTrigger>
        </TabsList>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProvisioningForm onSubmit={handleProvision} isLoading={isProvisioning} findNextExtension={findNextExtension} />
            <WorkflowPanel steps={steps} result={lastResult} isProvisioning={isProvisioning} />
          </div>
          <Five9UsersTable />
        </TabsContent>

        {/* Offboarding Tab */}
        <TabsContent value="offboarding" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AgentSearchList
              agents={history}
              onOffboard={handleOffboard}
              onCancel={handleCancel}
              onRestore={handleRestore}
              onBatchOffboard={handleBatchOffboard}
              onQuickOffboard={handleQuickOffboard}
            />
            <DeprovisioningWorkflowPanel steps={deprovSteps} isRunning={isDeprovisioning} />
          </div>
          <AuditLogTable entries={auditEntries} />
        </TabsContent>
      </Tabs>

      <DeprovisioningModal
        agents={selectedAgents}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleModalConfirm}
      />
    </div>
  );
}
