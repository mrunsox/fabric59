export interface Five9ToCrmRules {
  enabled: boolean;
  autoCreateContact: boolean;
  autoCreateMatterOrCase: boolean;
  autoCreateOnlyForQueues: string[];
  attachToLatestOpenOnly: boolean;
  fallbackToContactOnly: boolean;
  createTimeEntryForBillable: boolean;
  perQueueOverrides?: Record<string, Partial<Omit<Five9ToCrmRules, 'enabled' | 'perQueueOverrides' | 'autoCreateOnlyForQueues'>>>;
}

export interface CrmProfile {
  id: string;
  label: string;
  description: string;
  rules: Five9ToCrmRules;
}

export const CLIO_PROFILES: CrmProfile[] = [
  {
    id: "intake-heavy-pi",
    label: "Intake-Heavy PI Firm",
    description: "Auto-create contacts & matters for Intake queues, with billable time entries",
    rules: {
      enabled: true,
      autoCreateContact: true,
      autoCreateMatterOrCase: true,
      autoCreateOnlyForQueues: ["Intake"],
      attachToLatestOpenOnly: true,
      fallbackToContactOnly: true,
      createTimeEntryForBillable: true,
      perQueueOverrides: {
        "Existing Clients": { autoCreateContact: false, autoCreateMatterOrCase: false, createTimeEntryForBillable: true },
        "Support": { autoCreateContact: false, autoCreateMatterOrCase: false, createTimeEntryForBillable: false },
      },
    },
  },
  {
    id: "conservative",
    label: "Conservative",
    description: "Log calls only — no auto-creation of contacts or matters",
    rules: {
      enabled: true,
      autoCreateContact: false,
      autoCreateMatterOrCase: false,
      autoCreateOnlyForQueues: [],
      attachToLatestOpenOnly: true,
      fallbackToContactOnly: true,
      createTimeEntryForBillable: false,
    },
  },
  {
    id: "solo-generalist",
    label: "Solo Generalist",
    description: "Auto-create contacts but manually manage matters",
    rules: {
      enabled: true,
      autoCreateContact: true,
      autoCreateMatterOrCase: false,
      autoCreateOnlyForQueues: [],
      attachToLatestOpenOnly: true,
      fallbackToContactOnly: true,
      createTimeEntryForBillable: false,
    },
  },
  {
    id: "high-volume",
    label: "High-Volume",
    description: "Auto-create everything — contacts, matters, and time entries for all queues",
    rules: {
      enabled: true,
      autoCreateContact: true,
      autoCreateMatterOrCase: true,
      autoCreateOnlyForQueues: [],
      attachToLatestOpenOnly: true,
      fallbackToContactOnly: true,
      createTimeEntryForBillable: true,
    },
  },
  {
    id: "family-law",
    label: "Family Law",
    description: "Auto-create only for Family Intake queue",
    rules: {
      enabled: true,
      autoCreateContact: true,
      autoCreateMatterOrCase: true,
      autoCreateOnlyForQueues: ["Family Intake"],
      attachToLatestOpenOnly: true,
      fallbackToContactOnly: true,
      createTimeEntryForBillable: true,
      perQueueOverrides: {
        "General Inquiry": { autoCreateMatterOrCase: false },
      },
    },
  },
  {
    id: "super-safe",
    label: "Super Safe",
    description: "Log only when a matching contact already exists — never create anything",
    rules: {
      enabled: true,
      autoCreateContact: false,
      autoCreateMatterOrCase: false,
      autoCreateOnlyForQueues: [],
      attachToLatestOpenOnly: true,
      fallbackToContactOnly: false,
      createTimeEntryForBillable: false,
    },
  },
];

export const MYCASE_PROFILES: CrmProfile[] = [
  {
    id: "intake-only",
    label: "Intake-Only Automation",
    description: "Auto-create contacts & cases for Intake queues",
    rules: {
      enabled: true,
      autoCreateContact: true,
      autoCreateMatterOrCase: true,
      autoCreateOnlyForQueues: ["Intake"],
      attachToLatestOpenOnly: true,
      fallbackToContactOnly: true,
      createTimeEntryForBillable: false,
      perQueueOverrides: {
        "Support": { autoCreateContact: false, autoCreateMatterOrCase: false },
        "Existing Clients": { autoCreateMatterOrCase: false },
      },
    },
  },
  {
    id: "log-only",
    label: "Log Only",
    description: "No auto-creation — just log calls on existing contacts/cases",
    rules: {
      enabled: true,
      autoCreateContact: false,
      autoCreateMatterOrCase: false,
      autoCreateOnlyForQueues: [],
      attachToLatestOpenOnly: true,
      fallbackToContactOnly: true,
      createTimeEntryForBillable: false,
    },
  },
  {
    id: "aggressive",
    label: "Aggressive Automation",
    description: "Auto-create contacts & cases for all queues",
    rules: {
      enabled: true,
      autoCreateContact: true,
      autoCreateMatterOrCase: true,
      autoCreateOnlyForQueues: [],
      attachToLatestOpenOnly: true,
      fallbackToContactOnly: true,
      createTimeEntryForBillable: false,
    },
  },
  {
    id: "existing-clients",
    label: "Existing Clients First",
    description: "Auto-create contacts only — cases must exist",
    rules: {
      enabled: true,
      autoCreateContact: true,
      autoCreateMatterOrCase: false,
      autoCreateOnlyForQueues: [],
      attachToLatestOpenOnly: true,
      fallbackToContactOnly: true,
      createTimeEntryForBillable: false,
    },
  },
  {
    id: "niche-practice",
    label: "Niche Practice",
    description: "Auto-create for specific queues only",
    rules: {
      enabled: true,
      autoCreateContact: true,
      autoCreateMatterOrCase: true,
      autoCreateOnlyForQueues: ["Intake"],
      attachToLatestOpenOnly: true,
      fallbackToContactOnly: true,
      createTimeEntryForBillable: false,
      perQueueOverrides: {
        "General Inquiry": { autoCreateMatterOrCase: false },
      },
    },
  },
  {
    id: "super-safe",
    label: "Super Safe",
    description: "Log only when contact exists — never create anything",
    rules: {
      enabled: true,
      autoCreateContact: false,
      autoCreateMatterOrCase: false,
      autoCreateOnlyForQueues: [],
      attachToLatestOpenOnly: true,
      fallbackToContactOnly: false,
      createTimeEntryForBillable: false,
    },
  },
];

export function detectProfile(rules: Five9ToCrmRules, profiles: CrmProfile[]): string | null {
  for (const profile of profiles) {
    const p = profile.rules;
    if (
      p.autoCreateContact === rules.autoCreateContact &&
      p.autoCreateMatterOrCase === rules.autoCreateMatterOrCase &&
      p.attachToLatestOpenOnly === rules.attachToLatestOpenOnly &&
      p.fallbackToContactOnly === rules.fallbackToContactOnly &&
      p.createTimeEntryForBillable === rules.createTimeEntryForBillable &&
      JSON.stringify(p.autoCreateOnlyForQueues) === JSON.stringify(rules.autoCreateOnlyForQueues)
    ) {
      return profile.id;
    }
  }
  return null;
}
