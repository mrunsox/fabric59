INSERT INTO public.vault_features (
  slug, name, status, summary, reason_archived,
  original_routes, frontend_files, backend_files, edge_functions, db_objects,
  required_secrets, dependencies, risks, restore_notes, extraction_notes
) VALUES (
  'agent-lifecycle',
  'Agent Lifecycle',
  'archived',
  'End-to-end provisioning and deprovisioning of Five9 agents across Google Workspace and Slack, with audit logging, batch operations, and HR notifications.',
  'Removed from main navigation as part of the Five9 integration configurator pivot. The integration core focuses on flows, deployments, and runs — not agent HR operations. Preserved here as a high-value standalone module candidate.',
  ARRAY['/admin/agents','/admin/agent-dashboard','/admin/supervisor'],
  ARRAY[
    'src/pages/admin/AgentsPage.tsx',
    'src/pages/admin/AgentDashboardPage.tsx',
    'src/pages/admin/SupervisorPage.tsx',
    'src/components/agents/onboarding/ProvisioningForm.tsx',
    'src/components/agents/onboarding/WorkflowPanel.tsx',
    'src/components/agents/onboarding/WorkflowStepper.tsx',
    'src/components/agents/onboarding/CredentialsCard.tsx',
    'src/components/agents/onboarding/Five9UsersTable.tsx',
    'src/components/agents/offboarding/AgentSearchList.tsx',
    'src/components/agents/offboarding/DeprovisioningWorkflowPanel.tsx',
    'src/components/agents/offboarding/DeprovisioningModal.tsx',
    'src/components/agents/offboarding/AuditLogTable.tsx',
    'src/hooks/useProvisioning.ts',
    'src/hooks/useDeprovisioning.ts',
    'src/hooks/useFive9Sync.ts',
    'src/types/provisioning.ts',
    'src/types/deprovisioning.ts'
  ],
  ARRAY[]::text[],
  ARRAY['five9-provisioning','slack-agent','send-credentials','google-workspace','send-hr-notification'],
  ARRAY['agents (table)','agents RLS policies'],
  ARRAY['FIVE9_USERNAME','FIVE9_PASSWORD','SLACK_API_KEY'],
  '{"five9":"SOAP Admin API v13","slack":"Lovable connector gateway","google":"Workspace Admin SDK"}'::jsonb,
  'Provisioning writes directly to live Five9 / Slack / Google Workspace. Use sandbox credentials for testing. Hard-delete is irreversible.',
  'Re-add nav entry in src/config/navigation.ts and reroute /admin/agents to the original page. All routes remain mounted in App.tsx.',
  'To extract as standalone product: (1) replace AuthContext with a standalone auth provider, (2) swap multi-tenant org_id scoping for single-tenant, (3) re-deploy the 5 edge functions with the same secret names, (4) port the agents table schema and RLS, (5) lift the components/agents/* tree and the 3 hooks. Connector wiring (Slack via Lovable connectors) will need replacement with direct Slack OAuth.'
)
ON CONFLICT (slug) DO NOTHING;