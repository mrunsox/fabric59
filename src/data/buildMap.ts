export type ItemStatus = "done" | "in-progress" | "planned";

export interface BuildItem {
  name: string;
  description: string;
  status: ItemStatus;
}

export interface BuildCategory {
  name: string;
  items: BuildItem[];
}

export const buildMap: BuildCategory[] = [
  {
    name: "Authentication & Access",
    items: [
      { name: "Login Page", description: "Email/password authentication", status: "done" },
      { name: "Signup Page", description: "New organization registration", status: "done" },
      { name: "Back Button on Login", description: "Navigate back from login page", status: "done" },
      { name: "Forgot Password", description: "Email-based password reset flow", status: "done" },
      { name: "Reset Password Page", description: "Set new password after reset link click", status: "done" },
      { name: "Dev Mode Bypass", description: "Development auth bypass for faster building", status: "done" },
      { name: "Master Admin Access", description: "Hidden /system-access route for platform admins", status: "done" },
    ],
  },
  {
    name: "Tenant Management",
    items: [
      { name: "Tenants List", description: "View and manage all tenants/clients", status: "done" },
      { name: "Add/Edit Tenant", description: "Form to create and update tenant records", status: "done" },
      { name: "Delete Tenant", description: "Remove tenant with confirmation dialog", status: "done" },
      { name: "Tenant CRM Type", description: "Tag tenants by CRM system (Clio, Workiz, etc.)", status: "done" },
    ],
  },
  {
    name: "Five9 Domain Management",
    items: [
      { name: "Domains List", description: "View all connected Five9 domains", status: "done" },
      { name: "Domain Detail Page", description: "Per-domain settings with tabbed UI", status: "done" },
      { name: "API Credentials Tab", description: "Securely store Five9 username and password", status: "done" },
      { name: "Test Connection", description: "Validate Five9 API credentials via SOAP", status: "done" },
      { name: "Workflow Settings", description: "Configure IVR, callback, and queue behavior", status: "done" },
      { name: "Branding Settings", description: "Per-domain greeting, company name, colors", status: "done" },
    ],
  },
  {
    name: "Field Mapping Builder",
    items: [
      { name: "Mappings List", description: "View all field mapping configurations", status: "done" },
      { name: "Visual Mapping Canvas", description: "Drag-and-drop field mapping interface using React Flow", status: "done" },
      { name: "Source Fields Panel", description: "Five9 contact fields and call variables", status: "done" },
      { name: "Target Fields Panel", description: "CRM destination fields", status: "done" },
      { name: "Transform Dialog", description: "Add transformation logic to field mappings", status: "done" },
      { name: "Live Five9 Schema", description: "Dynamically fetch real fields from connected Five9 domain", status: "done" },
    ],
  },
  {
    name: "API & Integrations",
    items: [
      { name: "Contacts Edge Function", description: "Handle incoming contact sync requests", status: "done" },
      { name: "Intakes Edge Function", description: "Process intake form submissions from Five9", status: "done" },
      { name: "Five9 Schema Function", description: "Fetch fields/dispositions via SOAP API", status: "done" },
      { name: "CRM Push Logic", description: "Send mapped data to tenant CRM systems", status: "planned" },
      { name: "Webhook Support", description: "Receive real-time events from Five9", status: "planned" },
    ],
  },
  {
    name: "Monitoring & Logs",
    items: [
      { name: "API Logs Page", description: "View inbound/outbound API request history", status: "done" },
      { name: "Notifications Page", description: "System alerts and event notifications", status: "done" },
      { name: "Test Console", description: "Send test API requests and view responses", status: "done" },
      { name: "Real-time Log Streaming", description: "Live log updates via websockets", status: "planned" },
      { name: "Error Alerting", description: "Email/Slack alerts for critical failures", status: "planned" },
    ],
  },
  {
    name: "Master Admin (Platform)",
    items: [
      { name: "Master Dashboard", description: "Platform-wide stats and health overview", status: "done" },
      { name: "Organizations Overview", description: "View all tenant organizations on the platform", status: "done" },
      { name: "Users Management", description: "Manage platform users and roles", status: "done" },
    ],
  },
  {
    name: "Settings & UX",
    items: [
      { name: "Settings Page", description: "Organization-level configuration", status: "done" },
      { name: "Dark Mode UI", description: "Consistent dark theme throughout the app", status: "done" },
      { name: "Responsive Sidebar", description: "Mobile-friendly collapsible navigation", status: "done" },
      { name: "Onboarding Flow", description: "New user org creation wizard", status: "done" },
      { name: "Build Outline Page", description: "Living build map showing feature progress", status: "done" },
    ],
  },
];
