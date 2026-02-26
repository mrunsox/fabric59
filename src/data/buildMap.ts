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
    name: "Campaign Setup",
    items: [
      { name: "Campaigns Nav Item", description: "Megaphone icon in sidebar navigation", status: "done", tested: true },
      { name: "Campaigns List Page", description: "Table with status, progress, go-live date", status: "done", tested: true },
      { name: "Campaign Intake Form", description: "9-section collapsible intake with zod validation", status: "done", tested: true },
      { name: "Campaign Detail Page", description: "Read-only summary + live checklist sidebar", status: "done", tested: true },
      { name: "Phone Numbers Section", description: "ANI/DNIS multi-input with add/remove rows", status: "done", tested: true },
      { name: "Schedule and Coverage", description: "24/7 vs scheduled with after-hours handling", status: "done", tested: true },
      { name: "Prompt Selector", description: "Dropdown populated from Five9 getPrompts API", status: "done", tested: true },
      { name: "Dispositions Section", description: "Multi-select existing + create new dispositions", status: "done", tested: true },
      { name: "Connectors Section", description: "Backend document, website, script connector inputs", status: "done", tested: true },
      { name: "Decision Tree Builder", description: "Nested Q&A script editor with branching logic", status: "done", tested: true },
      { name: "Skill and User Assignment", description: "Auto-suggested skill name + Five9 user multi-select", status: "done", tested: true },
      { name: "Campaign Checklist", description: "40-item grouped checklist with auto/manual/blocked states", status: "done", tested: true },
      { name: "Database Table", description: "campaign_setups with JSONB intake_data and checklist_state", status: "done", tested: true },
      { name: "Five9 Campaign SOAP Actions", description: "createInboundCampaign, createSkill, createCampaignProfile, addDNIS", status: "done", tested: true },
      { name: "Auto-Provisioning on Submit", description: "Sequential Five9 API calls with checklist updates", status: "done", tested: true },
      { name: "Custom VM Greeting Upload", description: "Audio file upload to campaign-assets bucket", status: "done", tested: true },
      { name: "Auto-Save Drafts", description: "Debounced save on section change", status: "done", tested: true },
      { name: "Per-Disposition Email Routing", description: "Each disposition gets its own recipients, subject template, reply-to, and from", status: "done", tested: false },
      { name: "Multiple Connectors", description: "Dynamic list of typed connectors (backend doc, website, script, custom)", status: "done", tested: false },
      { name: "Decision Tree Skip/Jump Logic", description: "Skip-to-Q, end-call actions, conditions, required gates, closing scripts", status: "done", tested: false },
      { name: "Multi-Department Campaigns", description: "Tabbed department editor with per-department worksheets and dispatch", status: "done", tested: false },
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
  {
    name: "Report59 — Advanced Reporting",
    items: [
      { name: "CSV/XLSX Upload Parser", description: "Drag-drop file upload with column detection and preview", status: "planned" },
      { name: "Column Exclusion Editor", description: "Select/deselect columns before import with saved presets", status: "planned" },
      { name: "KPI Dashboard Cards", description: "Real-time stat cards for call volume, handle time, SLA, abandonment", status: "planned" },
      { name: "Automation Status Monitor", description: "Visual status of post-call automations (email, CRM push, SMS)", status: "planned" },
      { name: "Report Charts", description: "Recharts visualizations (bar, line, pie) for uploaded/live data", status: "planned" },
      { name: "Report Templates", description: "Saved report configurations with one-click regeneration", status: "planned" },
    ],
  },
  {
    name: "Scripter Runtime",
    items: [
      { name: "Script Preview Console", description: "Retro monospace terminal-style script viewer for active calls", status: "planned" },
      { name: "Script Wizard Mode", description: "Step-by-step guided script flow with branching navigation", status: "planned" },
      { name: "Call Timer Widget", description: "Live call duration timer with hold/transfer/ACW phase tracking", status: "planned" },
      { name: "Knowledge Base Sidebar", description: "Collapsible sidebar with searchable KB articles during calls", status: "planned" },
      { name: "After-Call Work (ACW) Panel", description: "Post-call disposition entry, notes, and wrap-up form", status: "planned" },
      { name: "Callback Scheduler", description: "Schedule follow-up callbacks with date/time and notes", status: "planned" },
      { name: "Script Variable Injection", description: "Auto-populate script fields from Five9 call variables", status: "planned" },
    ],
  },
  {
    name: "Agent Dashboard",
    items: [
      { name: "Agent Task Queue", description: "Personal task list with priority, due dates, and status", status: "planned" },
      { name: "Call History Table", description: "Agent's own call log with disposition, duration, timestamps", status: "planned" },
      { name: "Training Widget", description: "Embedded training modules with progress tracking", status: "planned" },
      { name: "Performance Stats Cards", description: "Personal metrics: calls handled, avg handle time, adherence", status: "planned" },
      { name: "Retro Bento Grid Layout", description: "Responsive bento-style grid with monospace/terminal aesthetic", status: "planned" },
    ],
  },
  {
    name: "Supervisor Views",
    items: [
      { name: "Live Agent Status Board", description: "Real-time view of agent states (available, on-call, ACW, break)", status: "planned" },
      { name: "Script Management Panel", description: "View/edit/assign scripts to campaigns from supervisor view", status: "planned" },
      { name: "Disposition Stats Dashboard", description: "Real-time disposition breakdown charts per campaign", status: "planned" },
      { name: "Agent Performance Rankings", description: "Leaderboard with key metrics and trend indicators", status: "planned" },
      { name: "Queue Monitor", description: "Live queue depth, wait times, and service level indicators", status: "planned" },
    ],
  },
  {
    name: "QA & Analytics",
    items: [
      { name: "Script Path Analysis", description: "Visualize which script branches agents follow most", status: "planned" },
      { name: "Script Completion Rates", description: "Track percentage of scripts completed vs. abandoned", status: "planned" },
      { name: "Call Quality Scoring", description: "Configurable scoring rubric for call evaluations", status: "planned" },
      { name: "QA Review Queue", description: "Flagged calls for supervisor review with annotation tools", status: "planned" },
    ],
  },
  {
    name: "Billing Module",
    items: [
      { name: "Per-Minute Rate Config", description: "Set billing rates per client/partner with tier support", status: "planned" },
      { name: "Invoice Generator", description: "Auto-generate invoices from call duration data", status: "planned" },
      { name: "Invoice History", description: "Searchable list of all invoices with status and PDF download", status: "planned" },
      { name: "Partner Billing Rollup", description: "Aggregate billing across a partner's clients", status: "planned" },
      { name: "Stripe Integration", description: "Connect Stripe for payment processing and subscription management", status: "planned" },
    ],
  },
  {
    name: "Post-Call Automations",
    items: [
      { name: "AI Email Summary", description: "Generate and send AI-powered call summary emails post-call", status: "planned" },
      { name: "SMS Notifications", description: "Trigger SMS alerts via Twilio on specific dispositions", status: "planned" },
      { name: "Push Notifications", description: "Browser/mobile push for urgent call outcomes", status: "planned" },
      { name: "Automation Rules Engine", description: "Configure trigger conditions and action chains per campaign", status: "planned" },
      { name: "Urgency-Based Channel Routing", description: "Add urgency level (LOW/NORMAL/HIGH) to notification payloads; HIGH prefers real-time channels (SMS/Slack), LOW uses email only", status: "planned" },
      { name: "Quiet Hours per Organization", description: "Per-org quiet hours window (start/end time + timezone); non-HIGH notifications delayed until window ends", status: "planned" },
      { name: "Channel Preference & Fallback", description: "Primary/secondary channel selection per org with automatic fallback when primary fails (Slack → SMS → Email)", status: "planned" },
      { name: "Disposition-to-Channel Mapping", description: "Extend disposition email engine so each disposition can trigger specific notification channels beyond email", status: "planned" },
    ],
  },
  {
    name: "Platform Utilities",
    items: [
      { name: "AI59 Import Tool", description: "Import scripts, templates, and configs from AI59 exports", status: "planned" },
      { name: "Pabbly Five9 Auth Bridge", description: "Proxy Five9 admin login via Pabbly for restricted API access", status: "planned" },
      { name: "Role-Based View Switcher", description: "Sidebar role switcher (Agent/Supervisor/Admin/Client views)", status: "planned" },
    ],
  },
];
