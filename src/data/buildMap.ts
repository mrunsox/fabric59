export type ItemStatus = "done" | "in-progress" | "planned";

export interface BuildItem {
  name: string;
  description: string;
  status: ItemStatus;
  tested?: boolean;
}

export interface BuildCategory {
  name: string;
  items: BuildItem[];
}

export const buildMap: BuildCategory[] = [
  {
    name: "Authentication & Access",
    items: [
      { name: "Login Page", description: "Email/password authentication", status: "done", tested: true },
      { name: "Signup Page", description: "New organization registration", status: "done", tested: true },
      { name: "Back Button on Login", description: "Navigate back from login page", status: "done", tested: true },
      { name: "Forgot Password", description: "Email-based password reset flow", status: "done", tested: true },
      { name: "Reset Password Page", description: "Set new password after reset link click", status: "done", tested: true },
      { name: "Dev Mode Bypass", description: "Development auth bypass for faster building", status: "done", tested: true },
      { name: "Master Admin Access", description: "Hidden /system-access route for platform admins", status: "done", tested: true },
    ],
  },
  {
    name: "User Access Control",
    items: [
      { name: "Granular Permissions Table", description: "Per-user permission keys stored in user_permissions", status: "done", tested: true },
      { name: "Permission-Based Sidebar", description: "Nav items filtered by user permissions", status: "done", tested: true },
      { name: "Team Members Manager", description: "Admin UI to toggle permissions per org member", status: "done", tested: true },
      { name: "Security Definer Check", description: "user_has_permission() function for RLS", status: "done", tested: true },
    ],
  },
  {
    name: "Profile & Onboarding",
    items: [
      { name: "Profiles Table", description: "User profile with display name, phone, timezone", status: "done", tested: true },
      { name: "Profile Settings Page", description: "Edit profile, change password, avatar", status: "done", tested: true },
      { name: "Guided Tour Component", description: "Step-by-step onboarding overlay with framer-motion", status: "done", tested: true },
      { name: "Admin Dashboard Tour", description: "Highlight sidebar sections for new admin users", status: "done", tested: true },
      { name: "Master Dashboard Tour", description: "Tour for system-level admin features", status: "done", tested: true },
      { name: "Scroll to Top", description: "Auto-scroll on route navigation", status: "done", tested: true },
      { name: "Landing Page Animations", description: "Framer-motion entrance and scroll-reveal effects", status: "done", tested: true },
    ],
  },
  {
    name: "Tenant Management",
    items: [
      { name: "Tenants List", description: "View and manage all tenants/clients", status: "done", tested: true },
      { name: "Add/Edit Tenant", description: "Form to create and update tenant records", status: "done", tested: true },
      { name: "Delete Tenant", description: "Remove tenant with confirmation dialog", status: "done", tested: true },
      { name: "Tenant CRM Type", description: "Tag tenants by CRM system (Clio, Workiz, etc.)", status: "done", tested: true },
    ],
  },
  {
    name: "Five9 Domain Management",
    items: [
      { name: "Domains List", description: "View all connected Five9 domains", status: "done", tested: true },
      { name: "Domain Detail Page", description: "Per-domain settings with tabbed UI", status: "done", tested: true },
      { name: "API Credentials Tab", description: "Securely store Five9 username and password", status: "done", tested: true },
      { name: "Test Connection", description: "Validate Five9 API credentials via SOAP", status: "done", tested: true },
      { name: "Workflow Settings", description: "Configure IVR, callback, and queue behavior", status: "done", tested: true },
      { name: "Branding Settings", description: "Per-domain greeting, company name, colors", status: "done", tested: true },
    ],
  },
  {
    name: "Field Mapping Builder",
    items: [
      { name: "Mappings List", description: "View all field mapping configurations", status: "done", tested: true },
      { name: "Visual Mapping Canvas", description: "Drag-and-drop field mapping interface using React Flow", status: "done", tested: true },
      { name: "Source Fields Panel", description: "Five9 contact fields and call variables", status: "done", tested: true },
      { name: "Target Fields Panel", description: "CRM destination fields", status: "done", tested: true },
      { name: "Transform Dialog", description: "Add transformation logic to field mappings", status: "done", tested: true },
      { name: "Live Five9 Schema", description: "Dynamically fetch real fields from connected Five9 domain", status: "done", tested: true },
      { name: "Call Phase Tabs", description: "Pre-Call, During Call, Post-Call mapping sections", status: "done", tested: true },
      { name: "Mapping Templates", description: "Quick-start templates for Clio, Workiz, Salesforce", status: "done", tested: true },
      { name: "Import/Export JSON", description: "Download and upload mapping configurations", status: "done", tested: true },
      { name: "Validation Preview Panel", description: "Test mappings against sample data", status: "done", tested: true },
    ],
  },
  {
    name: "API & Integrations",
    items: [
      { name: "Contacts Edge Function", description: "Handle incoming contact sync requests", status: "done", tested: true },
      { name: "Intakes Edge Function", description: "Process intake form submissions from Five9", status: "done", tested: true },
      { name: "Five9 Schema Function", description: "Fetch fields/dispositions via SOAP API", status: "done", tested: true },
      { name: "CRM Push Logic", description: "Send mapped data to tenant CRM systems", status: "done", tested: true },
      { name: "Webhook Support", description: "Receive real-time events from Five9", status: "done", tested: true },
    ],
  },
  {
    name: "Monitoring & Logs",
    items: [
      { name: "API Logs Page", description: "View inbound/outbound API request history", status: "done", tested: true },
      { name: "Notifications Page", description: "System alerts and event notifications", status: "done", tested: true },
      { name: "Test Console", description: "Send test API requests and view responses", status: "done", tested: true },
      { name: "Date Range Filters", description: "Filter logs by date with calendar picker", status: "done", tested: true },
      { name: "Latency Chart", description: "Recharts area chart showing response times", status: "done", tested: true },
      { name: "Log Export CSV", description: "Download filtered logs as CSV file", status: "done", tested: true },
      { name: "Summary Stat Cards", description: "Total requests, success rate, avg latency, errors", status: "done", tested: true },
      { name: "Call Phase Simulation", description: "Pre-call, during-call, post-call test tabs", status: "done", tested: true },
      { name: "Request History", description: "Local storage history with replay", status: "done", tested: true },
      { name: "Real-time Log Streaming", description: "Live log updates via Postgres realtime", status: "done", tested: true },
      { name: "Error Alerting", description: "Email/Slack alerts for critical failures", status: "done", tested: true },
    ],
  },
  {
    name: "Master Admin (Platform)",
    items: [
      { name: "Master Dashboard", description: "Platform-wide stats and health overview", status: "done", tested: true },
      { name: "Organizations Overview", description: "View all tenant organizations on the platform", status: "done", tested: true },
      { name: "Users Management", description: "Manage platform users and roles", status: "done", tested: true },
    ],
  },
  {
    name: "Integrations Library",
    items: [
      { name: "Integrations Catalog Page", description: "Marketplace-style grid of 55+ integrations", status: "done", tested: true },
      { name: "Search and Category Filters", description: "Real-time search and tab-based category filtering", status: "done", tested: true },
      { name: "Integration Detail Dialog", description: "Full details with supported actions and docs links", status: "done", tested: true },
      { name: "Brand Logos", description: "Real SVG logos for recognizable integrations", status: "done", tested: true },
      { name: "Connected Status Badges", description: "Show which integrations are active per tenant", status: "done", tested: true },
      { name: "Integration Configure Flow", description: "End-to-end setup wizard for each integration", status: "done", tested: true },
      { name: "Live API Connection Testing", description: "Test integration credentials before saving", status: "done", tested: true },
    ],
  },
  {
    name: "Call Flow Builder",
    items: [
      { name: "AI Chat Edge Function", description: "Gemini-powered call flow configuration generator", status: "done", tested: true },
      { name: "Call Flow Builder Page", description: "Split-panel AI chat + visual preview", status: "done", tested: true },
      { name: "Interactive Simulator", description: "Step-through call scenario with live integration triggers", status: "done", tested: true },
      { name: "Practice Area Scenarios", description: "Legal, home services, healthcare, insurance templates", status: "done", tested: true },
      { name: "Integration Status Indicators", description: "Real-time status for CRM, calendar, Slack during simulation", status: "done", tested: true },
    ],
  },
  {
    name: "Settings & UX",
    items: [
      { name: "Settings Page", description: "Organization-level configuration", status: "done", tested: true },
      { name: "Integration Credentials UI", description: "Admin UI to configure Five9, Resend, and Google Workspace keys", status: "done", tested: true },
      { name: "Dark Mode UI", description: "Consistent dark theme throughout the app", status: "done", tested: true },
      { name: "Responsive Sidebar", description: "Mobile-friendly collapsible navigation", status: "done", tested: true },
      { name: "Onboarding Flow", description: "New user org creation wizard", status: "done", tested: true },
      { name: "Build Outline Page", description: "Living build map showing feature progress", status: "done", tested: true },
      { name: "Profile Page", description: "User profile settings with password change", status: "done", tested: true },
    ],
  },
  {
    name: "Agent Lifecycle Management",
    items: [
      { name: "Agents Nav Item", description: "New 'Agents' link in sidebar navigation", status: "done", tested: true },
      { name: "Agents Module Page", description: "/admin/agents with Onboarding/Offboarding tabs", status: "done", tested: true },
      { name: "Database Tables", description: "agents, scheduled_jobs, audit_logs, app_config tables with RLS", status: "done", tested: true },
      { name: "Five9 Provisioning Function", description: "SOAP wrapper — createUser, deactivate, getExtensions, getAllUsers, getSkills", status: "done", tested: true },
      { name: "Google Workspace Function", description: "Admin Directory API — createUser, suspendUser, deleteUser", status: "done", tested: true },
      { name: "Send Credentials Function", description: "Styled HTML credential email via Resend", status: "done", tested: true },
      { name: "Process Jobs Function", description: "Background job processor for scheduled deprovisionings", status: "done", tested: true },
      { name: "Provisioning Form", description: "Agent onboarding form with extension conflict check and skills", status: "done", tested: true },
      { name: "Workflow Stepper", description: "5-step animated provisioning workflow panel", status: "done", tested: true },
      { name: "Credentials Card", description: "Post-provisioning credentials display with copy buttons", status: "done", tested: true },
      { name: "Five9 Users Table", description: "Live Five9 agent roster with search and role inference", status: "done", tested: true },
      { name: "Agent Search List", description: "Searchable offboarding list with status badges and multi-select", status: "done", tested: true },
      { name: "Deprovisioning Modal", description: "Grace period, data transfer config, reason textarea", status: "done", tested: true },
      { name: "Deprovisioning Workflow Panel", description: "6-step offboarding stepper with real Google/Five9 calls", status: "done", tested: true },
      { name: "Audit Log Table", description: "Immutable log of every lifecycle action", status: "done", tested: true },
      { name: "Slack Invite / Remove", description: "Wire real Slack API for onboarding/offboarding steps", status: "done", tested: true },
      { name: "Data Transfer Step", description: "Google Drive Transfer API for offboarding step 1", status: "done", tested: true },
      { name: "HR Notification Email", description: "Resend email confirming offboarding completion to HR", status: "done", tested: true },
      { name: "Cron Trigger for process-jobs", description: "pg_cron scheduled job every 30 minutes", status: "done", tested: true },
    ],
  },
  {
    name: "Branding & Landing",
    items: [
      { name: "Landing Page", description: "Public hero-style marketing page at /", status: "done", tested: true },
      { name: "Bold Logo / Icon", description: "High-contrast SVG icon with geometric F letterform", status: "done", tested: true },
      { name: "SVG Favicon", description: "Crisp favicon from new SVG icon", status: "done", tested: true },
      { name: "Terms Page", description: "Placeholder legal terms page", status: "done", tested: true },
      { name: "Security Page", description: "Data security and compliance overview", status: "done", tested: true },
    ],
  },
  {
    name: "SEO & AI Visibility",
    items: [
      { name: "SEOHead Component", description: "Reusable per-page meta tags, canonical, Open Graph", status: "done", tested: true },
      { name: "JSON-LD Structured Data", description: "Organization, SoftwareApplication, FAQPage schemas", status: "done", tested: true },
      { name: "sitemap.xml", description: "Static sitemap for all public routes", status: "done", tested: true },
      { name: "llms.txt", description: "LLM-readable product summary for AI crawlers", status: "done", tested: true },
      { name: "ai.txt", description: "AI agent discoverability file with capabilities", status: "done", tested: true },
      { name: "robots.txt AI Directives", description: "GPTBot, PerplexityBot, ClaudeBot crawler access", status: "done", tested: true },
      { name: "FAQ Section", description: "Accordion FAQ for AEO snippet extraction", status: "done", tested: true },
      { name: "How It Works Section", description: "3-step process for LLMO citability", status: "done", tested: true },
      { name: "Semantic HTML Landmarks", description: "Main, nav, section aria-labels for AXO/VLM", status: "done", tested: true },
    ],
  },
];
