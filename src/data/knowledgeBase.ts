/**
 * Structured Knowledge Base derived from buildMap.
 * Each entry corresponds to a user-facing feature and contains
 * client-ready documentation fields for the AI assistant and /help pages.
 */

export interface KBEntry {
  featureName: string;
  category: string;
  publicTitle: string;
  summary: string;
  howItWorks: string;
  whenToUseIt: string;
  faq: { q: string; a: string }[];
}

export const knowledgeBase: KBEntry[] = [
  // ── Authentication & Access ──
  {
    featureName: "Login Page",
    category: "Authentication & Access",
    publicTitle: "Sign In to Fabric59",
    summary: "Secure email and password login for all Fabric59 users.",
    howItWorks: "Enter your registered email and password on the /login page. After successful authentication, you are redirected to your organization dashboard.",
    whenToUseIt: "Every time you need to access your Fabric59 account.",
    faq: [
      { q: "Can I use social login?", a: "Not yet. Email/password is the current sign-in method." },
      { q: "What if I forget my password?", a: "Use the Forgot Password link on the login page to receive a reset email." },
    ],
  },
  {
    featureName: "Forgot Password",
    category: "Authentication & Access",
    publicTitle: "Reset Your Password",
    summary: "Request a password reset link sent to your email.",
    howItWorks: "Click Forgot Password on the login page, enter your email, and check your inbox for a reset link. The link takes you to a page where you set a new password.",
    whenToUseIt: "When you cannot remember your current password.",
    faq: [
      { q: "How long is the reset link valid?", a: "Reset links expire after 1 hour." },
    ],
  },
  // ── Tenant Management ──
  {
    featureName: "Tenants List",
    category: "Tenant Management",
    publicTitle: "Managing Your Clients",
    summary: "View, search, and manage all client (tenant) records in your organization.",
    howItWorks: "Navigate to the Clients section in the sidebar. You will see a searchable table of all tenants with their CRM type, status, and key details. Click any row to edit.",
    whenToUseIt: "When you need to onboard a new client, update client settings, or review your client roster.",
    faq: [
      { q: "Can I delete a client?", a: "Yes. Open the client record and use the delete option. A confirmation dialog prevents accidental deletions." },
      { q: "What is the CRM type field?", a: "It tags each client with their legal or business CRM system (Clio, Workiz, MyCase, etc.) so integrations are configured correctly." },
    ],
  },
  // ── Five9 Domain Management ──
  {
    featureName: "Test Connection",
    category: "Five9 Domain Management",
    publicTitle: "Testing Your Five9 Connection",
    summary: "Validate that your Five9 API credentials are working before going live.",
    howItWorks: "Go to the domain detail page, enter your Five9 username and password, and click Test Connection. The system makes a SOAP API call to verify access.",
    whenToUseIt: "After entering or changing Five9 credentials, and before provisioning agents or campaigns.",
    faq: [
      { q: "What if the test fails?", a: "Double-check your username and password. Ensure your Five9 account has Admin API access enabled." },
    ],
  },
  // ── Field Mapping Builder ──
  {
    featureName: "Visual Mapping Canvas",
    category: "Field Mapping Builder",
    publicTitle: "Drag and Drop Field Mapping",
    summary: "Visually connect Five9 fields to CRM destination fields using an interactive canvas.",
    howItWorks: "Open a mapping configuration. The left panel shows Five9 source fields, the right panel shows CRM target fields. Drag lines between fields to create mappings. Add transformations (formatting, concatenation) via the transform dialog.",
    whenToUseIt: "When setting up how call data flows from Five9 into your CRM system.",
    faq: [
      { q: "Can I map one source field to multiple targets?", a: "Yes. Drag from the same source field to different target fields." },
      { q: "What transformations are available?", a: "String formatting, concatenation, date conversion, phone normalization, and custom expressions." },
    ],
  },
  // ── Agent Lifecycle Management ──
  {
    featureName: "Provisioning Form",
    category: "Agent Lifecycle Management",
    publicTitle: "Onboarding a New Agent",
    summary: "Add a new agent to Five9, Google Workspace, and Slack in a single guided workflow.",
    howItWorks: "Fill in the agent's name, email, and role. Select Five9 skills and an available extension. Click Provision to trigger automated account creation across Five9, Google Workspace, and Slack. Credentials are emailed to the new agent.",
    whenToUseIt: "Whenever a new agent joins your team and needs system access.",
    faq: [
      { q: "What if an extension is already taken?", a: "The form checks for conflicts and suggests the next available extension." },
      { q: "Can I skip Google Workspace?", a: "The workflow handles available integrations. If Google Workspace is not configured, that step is skipped." },
    ],
  },
  // ── Campaign Setup ──
  {
    featureName: "Campaign Intake Form",
    category: "Campaign Setup",
    publicTitle: "Creating a New Campaign",
    summary: "A comprehensive 9-section form to configure every aspect of a new Five9 campaign.",
    howItWorks: "Navigate to Campaigns and click New Campaign. Fill in sections including client info, phone numbers, schedule, dispositions, scripts, and skill assignments. The form auto-saves as you work. Submit to trigger Five9 provisioning.",
    whenToUseIt: "When launching a new inbound or outbound calling campaign for a client.",
    faq: [
      { q: "Can I save a draft and come back later?", a: "Yes. The form auto-saves on every section change." },
      { q: "What happens when I submit?", a: "Fabric59 creates the campaign, skill, profile, and DNIS in Five9 automatically." },
    ],
  },
  // ── Integrations Library ──
  {
    featureName: "Integrations Catalog Page",
    category: "Integrations Library",
    publicTitle: "Browse Available Integrations",
    summary: "A marketplace-style catalog of 55+ integrations across CRM, communication, productivity, and billing tools.",
    howItWorks: "Go to Integrations in the sidebar. Browse by category or search by name. Click any integration to see supported actions, documentation links, and configuration options.",
    whenToUseIt: "When you want to connect a third-party tool to your Fabric59 workflow.",
    faq: [
      { q: "Are all integrations live?", a: "Many integrations have full API support. Some show as available for configuration with manual setup steps." },
    ],
  },
  // ── Build Outline ──
  {
    featureName: "Build Outline Page",
    category: "Settings & UX",
    publicTitle: "Feature Roadmap and Progress",
    summary: "A living map of every feature in Fabric59, showing what is built, in progress, and planned.",
    howItWorks: "Visit /outline to see all feature categories with progress bars, status icons, and testing checkboxes. Unfinished features float to the top for easy tracking.",
    whenToUseIt: "To check overall product readiness, track what has been tested, or review upcoming features.",
    faq: [
      { q: "Can I mark features as tested?", a: "Yes. Each feature has a Tested checkbox that persists in your browser." },
      { q: "Is this visible to all users?", a: "The outline is accessible to anyone with the link. It does not require authentication." },
    ],
  },
];
