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
    name: "User Access Control",
    items: [
      { name: "Granular Permissions Table", description: "Per-user permission keys stored in user_permissions", status: "done" },
      { name: "Permission-Based Sidebar", description: "Nav items filtered by user permissions", status: "done" },
      { name: "Team Members Manager", description: "Admin UI to toggle permissions per org member", status: "done" },
      { name: "Security Definer Check", description: "user_has_permission() function for RLS", status: "done" },
    ],
  },
  {
    name: "Profile & Onboarding",
    items: [
      { name: "Profiles Table", description: "User profile with display name, phone, timezone", status: "done" },
      { name: "Profile Settings Page", description: "Edit profile, change password, avatar", status: "done" },
      { name: "Guided Tour Component", description: "Step-by-step onboarding overlay with framer-motion", status: "done" },
      { name: "Admin Dashboard Tour", description: "Highlight sidebar sections for new admin users", status: "done" },
      { name: "Master Dashboard Tour", description: "Tour for system-level admin features", status: "done" },
      { name: "Scroll to Top", description: "Auto-scroll on route navigation", status: "done" },
      { name: "Landing Page Animations", description: "Framer-motion entrance and scroll-reveal effects", status: "done" },
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
      { name: "Call Phase Tabs", description: "Pre-Call, During Call, Post-Call mapping sections", status: "done" },
      { name: "Mapping Templates", description: "Quick-start templates for Clio, Workiz, Salesforce", status: "done" },
      { name: "Import/Export JSON", description: "Download and upload mapping configurations", status: "done" },
      { name: "Validation Preview Panel", description: "Test mappings against sample data", status: "done" },
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
      { name: "Date Range Filters", description: "Filter logs by date with calendar picker", status: "done" },
      { name: "Latency Chart", description: "Recharts area chart showing response times", status: "done" },
      { name: "Log Export CSV", description: "Download filtered logs as CSV file", status: "done" },
      { name: "Summary Stat Cards", description: "Total requests, success rate, avg latency, errors", status: "done" },
      { name: "Call Phase Simulation", description: "Pre-call, during-call, post-call test tabs", status: "done" },
      { name: "Request History", description: "Local storage history with replay", status: "done" },
      { name: "Real-time Log Streaming", description: "Live log updates via Postgres realtime", status: "done" },
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
    name: "Integrations Library",
    items: [
      { name: "Integrations Catalog Page", description: "Marketplace-style grid of 55+ integrations", status: "done" },
      { name: "Search and Category Filters", description: "Real-time search and tab-based category filtering", status: "done" },
      { name: "Integration Detail Dialog", description: "Full details with supported actions and docs links", status: "done" },
      { name: "Brand Logos", description: "Real SVG logos for recognizable integrations", status: "done" },
      { name: "Connected Status Badges", description: "Show which integrations are active per tenant", status: "done" },
      { name: "Integration Configure Flow", description: "End-to-end setup wizard for each integration", status: "planned" },
      { name: "Live API Connection Testing", description: "Test integration credentials before saving", status: "planned" },
    ],
  },
  {
    name: "Call Flow Builder",
    items: [
      { name: "AI Chat Edge Function", description: "Gemini-powered call flow configuration generator", status: "done" },
      { name: "Call Flow Builder Page", description: "Split-panel AI chat + visual preview", status: "done" },
      { name: "Interactive Simulator", description: "Step-through call scenario with live integration triggers", status: "done" },
      { name: "Practice Area Scenarios", description: "Legal, home services, healthcare, insurance templates", status: "done" },
      { name: "Integration Status Indicators", description: "Real-time status for CRM, calendar, Slack during simulation", status: "done" },
    ],
  },
  {
    name: "Settings & UX",
    items: [
      { name: "Settings Page", description: "Organization-level configuration", status: "done" },
      { name: "Integration Credentials UI", description: "Admin UI to configure Five9, Resend, and Google Workspace keys", status: "done" },
      { name: "Dark Mode UI", description: "Consistent dark theme throughout the app", status: "done" },
      { name: "Responsive Sidebar", description: "Mobile-friendly collapsible navigation", status: "done" },
      { name: "Onboarding Flow", description: "New user org creation wizard", status: "done" },
      { name: "Build Outline Page", description: "Living build map showing feature progress", status: "done" },
      { name: "Profile Page", description: "User profile settings with password change", status: "done" },
    ],
  },
  {
    name: "Agent Lifecycle Management",
    items: [
      { name: "Agents Nav Item", description: "New 'Agents' link in sidebar navigation", status: "done" },
      { name: "Agents Module Page", description: "/admin/agents with Onboarding/Offboarding tabs", status: "done" },
      { name: "Database Tables", description: "agents, scheduled_jobs, audit_logs, app_config tables with RLS", status: "done" },
      { name: "Five9 Provisioning Function", description: "SOAP wrapper — createUser, deactivate, getExtensions, getAllUsers, getSkills", status: "done" },
      { name: "Google Workspace Function", description: "Admin Directory API — createUser, suspendUser, deleteUser", status: "done" },
      { name: "Send Credentials Function", description: "Styled HTML credential email via Resend", status: "done" },
      { name: "Process Jobs Function", description: "Background job processor for scheduled deprovisionings", status: "done" },
      { name: "Provisioning Form", description: "Agent onboarding form with extension conflict check and skills", status: "done" },
      { name: "Workflow Stepper", description: "5-step animated provisioning workflow panel", status: "done" },
      { name: "Credentials Card", description: "Post-provisioning credentials display with copy buttons", status: "done" },
      { name: "Five9 Users Table", description: "Live Five9 agent roster with search and role inference", status: "done" },
      { name: "Agent Search List", description: "Searchable offboarding list with status badges and multi-select", status: "done" },
      { name: "Deprovisioning Modal", description: "Grace period, data transfer config, reason textarea", status: "done" },
      { name: "Deprovisioning Workflow Panel", description: "6-step offboarding stepper with real Google/Five9 calls", status: "done" },
      { name: "Audit Log Table", description: "Immutable log of every lifecycle action", status: "done" },
      { name: "Slack Invite / Remove", description: "Wire real Slack API for onboarding/offboarding steps", status: "planned" },
      { name: "Data Transfer Step", description: "Google Drive Transfer API for offboarding step 1", status: "planned" },
      { name: "HR Notification Email", description: "Resend email confirming offboarding completion to HR", status: "planned" },
      { name: "Cron Trigger for process-jobs", description: "pg_cron scheduled job every 30 minutes", status: "planned" },
    ],
  },
  {
    name: "Branding & Landing",
    items: [
      { name: "Landing Page", description: "Public hero-style marketing page at /", status: "done" },
      { name: "Bold Logo / Icon", description: "High-contrast SVG icon with geometric F letterform", status: "done" },
      { name: "SVG Favicon", description: "Crisp favicon from new SVG icon", status: "done" },
      { name: "Terms Page", description: "Placeholder legal terms page", status: "done" },
      { name: "Security Page", description: "Data security and compliance overview", status: "done" },
    ],
  },
];
