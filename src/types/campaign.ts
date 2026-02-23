// Decision Tree types
export interface DecisionTreeOption {
  label: string;
  nextNodeId: string | null; // null = endpoint
  action?: "transfer" | "disposition" | "escalate" | "end_call" | "skip" | null;
  actionValue?: string; // e.g. disposition name, transfer number
  condition?: string; // e.g. "before 3:30pm EST", "caller in rep list"
  skipToNodeId?: string | null; // for skip/jump action
  isRequired?: boolean; // gate: must collect data before proceeding
  fallbackScript?: string; // optional script for the agent if caller persists
}

export interface DecisionTreeNode {
  id: string;
  question: string;
  notes?: string;
  dataToCapture?: string;
  options: DecisionTreeOption[];
  isGate?: boolean; // If true, data must be collected to proceed
  gateFailMessage?: string; // Script to read if data not provided
  closingScript?: string; // Closing statement for this node
  conditionalClosings?: Array<{
    condition: string;
    script: string;
  }>;
}

// Per-disposition email configuration
export interface DispositionEmailConfig {
  dispositionName: string;
  emailRecipients: string; // comma-separated
  emailReplyTo?: string;
  emailFrom?: string;
  emailSubjectTemplate?: string; // e.g. "CALL from CUSTOMER: NEW CLAIM - {caller_name}"
}

// Campaign connector entry
export interface CampaignConnector {
  id: string;
  type: "backend_doc" | "website" | "script" | "custom";
  name: string;
  url: string;
}

// Department within a multi-department campaign
export interface CampaignDepartment {
  id: string;
  name: string; // e.g. "New Claim", "Dealership", "Sales Rep"
  ivrPromptNumber: number; // IVR menu number (1, 2, 3...)
  ivrGreeting?: string; // Department-specific greeting
  skillName?: string; // Optional separate skill per department
  decisionTree: DecisionTreeNode[];
  dispositionEmailConfigs: DispositionEmailConfig[];
  dispatchInstructions?: string; // Free-text dispatch notes
}

// Intake form data stored in campaign_setups.intake_data
export interface CampaignIntakeData {
  // Section 1: Basics
  campaignName: string;
  clientName: string;
  campaignDescription?: string;
  whiteLabel: boolean;
  isMultiDepartment?: boolean;
  departments?: CampaignDepartment[];

  // Section 2: Phone Numbers
  aniNumbers: string[];
  dnisNumbers: string[];
  transferDisplayNumber?: string;

  // Section 3: Schedule
  coverageType: "24/7" | "scheduled";
  weekdayStart?: string;
  weekdayEnd?: string;
  weekendStart?: string;
  weekendEnd?: string;
  noWeekendCoverage?: boolean;
  afterHoursHandling?: "vm" | "overflow" | "disconnect" | "transfer";
  afterHoursTransferNumber?: string;

  // Section 4: Prompts
  ivrGreetingPrompt?: string;
  whisperPrompt?: string;
  holdMusicPrompt?: string;
  ivrAnnouncementPrompt?: string;
  vmGreetingType?: "existing" | "upload";
  vmGreetingPrompt?: string;
  vmGreetingFileUrl?: string;

  // Section 5: Dispositions
  existingDispositions: string[];
  newDispositions: string[];
  enableDispositionEmail: boolean;
  // Legacy flat fields (kept for backward compat)
  emailTemplateName?: string;
  emailRecipients?: string;
  emailReplyTo?: string;
  emailFrom?: string;
  dispositionMenuGrouping?: string;
  // New per-disposition email configs
  dispositionEmailConfigs?: DispositionEmailConfig[];

  // Section 6: Connectors (legacy flat fields kept for backward compat)
  backendDocConnector: boolean;
  backendDocUrl?: string;
  websiteConnectorUrl?: string;
  scriptConnectorName?: string;
  // New dynamic connectors
  connectors?: CampaignConnector[];

  // Section 7: Decision Tree
  decisionTree: DecisionTreeNode[];

  // Section 8: Skill & Users
  skillName: string;
  assignedUsers: string[];
  addSkillToIvr: boolean;

  // Section 9: Notes
  additionalNotes?: string;
  priority: "normal" | "urgent";
  targetGoLive?: string;
}

// Checklist
export interface ChecklistItem {
  id: string;
  category: string;
  task: string;
  automated: boolean;
  done: boolean;
  blocked?: string;
}

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  // Objects
  { id: "obj_campaign", category: "Objects", task: "Create Campaign", automated: true, done: false },
  { id: "obj_profile", category: "Objects", task: "Create Campaign Profile", automated: true, done: false },
  { id: "obj_skill", category: "Objects", task: "Create Skill", automated: true, done: false },
  { id: "obj_prompts", category: "Objects", task: "Select Prompts", automated: false, done: false },
  { id: "obj_connectors", category: "Objects", task: "Create Connectors", automated: false, done: false },
  { id: "obj_ivrs", category: "Objects", task: "Create IVRs", automated: false, done: false },
  // Important
  { id: "imp_wl", category: "Important", task: "WL Partner?", automated: false, done: false },
  { id: "imp_vm", category: "Important", task: "VM Configured?", automated: false, done: false },
  { id: "imp_dnis_test", category: "Important", task: "DNIS Tested?", automated: false, done: false },
  // Campaign Profile
  { id: "cp_anis", category: "Campaign Profile", task: "Configure ANIs", automated: false, done: false },
  { id: "cp_layout", category: "Campaign Profile", task: "Configure Layout", automated: false, done: false },
  { id: "cp_dispo_menu", category: "Campaign Profile", task: "Configure Disposition Menu", automated: false, done: false },
  { id: "cp_assoc", category: "Campaign Profile", task: "Associate Profile to Campaign", automated: true, done: false },
  // Skill
  { id: "sk_users", category: "Skill", task: "Add Users to Skill", automated: false, done: false },
  { id: "sk_campaign", category: "Skill", task: "Add Skill to Campaign", automated: true, done: false },
  { id: "sk_ivr", category: "Skill", task: "Add Skill in IVR Routing", automated: false, done: false },
  // Campaign
  { id: "cmp_dnis", category: "Campaign", task: "Add DNIS", automated: true, done: false },
  { id: "cmp_ivr_biz", category: "Campaign", task: "IVR Schedule — Business Hours", automated: false, done: false },
  { id: "cmp_ivr_ah", category: "Campaign", task: "IVR Schedule — After Hours", automated: false, done: false },
  { id: "cmp_dispos", category: "Campaign", task: "Add Dispositions", automated: true, done: false },
  { id: "cmp_connectors", category: "Campaign", task: "Add Connectors", automated: false, done: false },
  { id: "cmp_script", category: "Campaign", task: "Add Script (embedded)", automated: false, done: false },
  { id: "cmp_worksheets", category: "Campaign", task: "Configure Worksheets", automated: false, done: false },
  { id: "cmp_hold", category: "Campaign", task: "Add Hold Music", automated: false, done: false },
  { id: "cmp_whisper", category: "Campaign", task: "Add Whisper Prompt", automated: false, done: false },
  // Connector
  { id: "con_backend", category: "Connector", task: "Backend Document", automated: false, done: false },
  { id: "con_website", category: "Connector", task: "Website", automated: false, done: false },
  { id: "con_script", category: "Connector", task: "Script", automated: false, done: false },
  // IVR
  { id: "ivr_greeting", category: "IVR", task: "IVR Greeting", automated: false, done: false },
  { id: "ivr_announce", category: "IVR", task: "Announcement/Hold Message", automated: false, done: false },
  { id: "ivr_vm", category: "IVR", task: "Configure VM", automated: false, done: false },
  // Prompts
  { id: "prm_whisper", category: "Prompts", task: "Upload Whisper", automated: false, done: false },
  { id: "prm_ivr", category: "Prompts", task: "Upload IVR Greeting", automated: false, done: false },
  { id: "prm_vm", category: "Prompts", task: "Upload VM Message", automated: false, done: false },
  // Dispositions
  { id: "dsp_email", category: "Dispositions", task: "Enable Email", automated: false, done: false, blocked: "Waiting for Roman" },
  { id: "dsp_template", category: "Dispositions", task: "Select Email Template", automated: false, done: false, blocked: "Waiting for Roman" },
  { id: "dsp_recipients", category: "Dispositions", task: "Set Recipients", automated: false, done: false, blocked: "Waiting for Roman" },
  { id: "dsp_reply", category: "Dispositions", task: "Set Reply-To", automated: false, done: false, blocked: "Waiting for Roman" },
  { id: "dsp_from", category: "Dispositions", task: "Set From Address", automated: false, done: false, blocked: "Waiting for Roman" },
  { id: "dsp_menu", category: "Dispositions", task: "Configure in Disposition Menu", automated: false, done: false },
  // Misc
  { id: "misc_tracker", category: "Misc", task: "Add to Transfer Tracker", automated: false, done: false },
  { id: "misc_dnis_area", category: "Misc", task: "Check DNIS Area Code", automated: false, done: false },
  { id: "misc_turn_on", category: "Misc", task: "Turn ON Campaign", automated: false, done: false },
  { id: "misc_test", category: "Misc", task: "Test and Approve to go LIVE", automated: false, done: false },
];

export interface CampaignSetup {
  id: string;
  organization_id: string;
  five9_domain_id: string | null;
  campaign_name: string;
  client_name: string;
  campaign_type: string;
  intake_data: CampaignIntakeData;
  checklist_state: Record<string, { done: boolean; blocked?: string }>;
  status: string;
  notes: string | null;
  priority: string;
  target_go_live: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
