/**
 * Vertical Skin System — Phase 5
 * Copy-preset registry.
 *
 * A copy preset is a small, deterministic bundle of vertical-aware
 * strings (greetings, openers, transfer lines, neutral labels) that the
 * product can consume instead of branching on `skin.id`. Phase 5 only
 * defines the registry + lookup. Consumption sites are migrated in
 * later phases.
 *
 * Preset ids match the `copyPresetId` declared by each Phase 2 skin pack
 * (see `src/lib/skins/packs/*`). Unknown ids fall back to the `general`
 * preset. There is no nullable lookup — every consumer always receives a
 * usable preset.
 */

import type { SkinId } from "@/lib/theme/types";
import { getSkin, FALLBACK_SKIN_ID } from "@/lib/skins/themeRegistry";

export interface CopyPreset {
  id: string;
  /** Human label shown in admin previews. */
  label: string;
  /** Default callback term used in chrome (e.g. "client", "patient"). */
  callerNoun: string;
  callerNounPlural: string;
  /** Default name for an org's "client" record across the app chrome. */
  accountNoun: string;
  /** Greeting lines an agent can choose from. First entry is the default. */
  greetings: string[];
  /** Opening prompts after the greeting. */
  callOpeners: string[];
  /** Vertical-aware transfer phrasing. */
  transferLines: {
    warm: string;
    cold: string;
    voicemail: string;
  };
  /** Tone descriptor — admin preview only, not user-facing chrome. */
  tone: string;
}

const GENERAL: CopyPreset = {
  id: "general.default",
  label: "General",
  callerNoun: "caller",
  callerNounPlural: "callers",
  accountNoun: "client",
  greetings: [
    "Thanks for calling {{client_name}}. How can I help you today?",
    "{{client_name}}, this is {{agent_name}} speaking. How can I help?",
  ],
  callOpeners: [
    "Can I start by getting your name?",
    "Could you tell me what you're calling about today?",
  ],
  transferLines: {
    warm: "Let me connect you with the right person. Please hold for a moment.",
    cold: "I'll transfer you now.",
    voicemail: "I'll send you to voicemail so you can leave a message.",
  },
  tone: "Neutral, professional, friendly.",
};

const LEGAL: CopyPreset = {
  id: "legal.default",
  label: "Legal",
  callerNoun: "caller",
  callerNounPlural: "callers",
  accountNoun: "client",
  greetings: [
    "Thank you for calling {{client_name}}. This is {{agent_name}} on the intake team.",
    "{{client_name}}, intake desk. How may I help you today?",
  ],
  callOpeners: [
    "May I start with your full name and a good callback number?",
    "Can you tell me briefly what happened so I can route you to the right team?",
  ],
  transferLines: {
    warm: "Let me bring an attorney's assistant on the line. One moment please.",
    cold: "I'll transfer you to the attorney's line now.",
    voicemail: "I'll connect you to the attorney's confidential voicemail.",
  },
  tone: "Formal, trust-forward, careful with privileged information.",
};

const MEDICAL: CopyPreset = {
  id: "medical.default",
  label: "Medical",
  callerNoun: "patient",
  callerNounPlural: "patients",
  accountNoun: "practice",
  greetings: [
    "Thanks for calling {{client_name}}. This is {{agent_name}}. How can I help you today?",
    "{{client_name}}, you've reached patient services. How can I help?",
  ],
  callOpeners: [
    "Can I start with your full name and date of birth?",
    "Is this about an existing appointment or a new concern?",
  ],
  transferLines: {
    warm: "Let me get a nurse on the line. One moment please.",
    cold: "I'll connect you with the clinical team now.",
    voicemail: "I'll send you to the clinical voicemail.",
  },
  tone: "Calm, clear, HIPAA-aware. No clinical advice.",
};

const FINANCIAL: CopyPreset = {
  id: "financial.default",
  label: "Financial",
  callerNoun: "client",
  callerNounPlural: "clients",
  accountNoun: "account",
  greetings: [
    "Thank you for calling {{client_name}}. This is {{agent_name}} on the client services team.",
    "{{client_name}}, how can I help you today?",
  ],
  callOpeners: [
    "May I have your full name and the last four of your account?",
    "Is this about an existing account or a new inquiry?",
  ],
  transferLines: {
    warm: "Let me bring an advisor on the line. One moment.",
    cold: "I'll transfer you to the advisor now.",
    voicemail: "I'll send you to the advisor's secure voicemail.",
  },
  tone: "Discreet, precise, compliance-aware. Avoid speculative advice.",
};

const INSURANCE: CopyPreset = {
  id: "insurance.default",
  label: "Insurance",
  callerNoun: "policyholder",
  callerNounPlural: "policyholders",
  accountNoun: "policy",
  greetings: [
    "Thanks for calling {{client_name}}. This is {{agent_name}}. How can I help with your policy today?",
    "{{client_name}}, policyholder services. How can I help?",
  ],
  callOpeners: [
    "May I have your full name and policy number?",
    "Is this about a claim, a quote, or your existing policy?",
  ],
  transferLines: {
    warm: "Let me bring an adjuster on the line. One moment please.",
    cold: "I'll transfer you to the claims team now.",
    voicemail: "I'll send you to the claims voicemail.",
  },
  tone: "Reassuring, methodical, claims-aware.",
};

const PROFESSIONAL_SERVICES: CopyPreset = {
  id: "professional_services.default",
  label: "Professional services",
  callerNoun: "client",
  callerNounPlural: "clients",
  accountNoun: "client",
  greetings: [
    "Thanks for calling {{client_name}}. This is {{agent_name}}. How can I help you today?",
    "{{client_name}}, client services. How can I help?",
  ],
  callOpeners: [
    "Can I start with your name and the project you're calling about?",
    "Is this about an existing engagement or a new inquiry?",
  ],
  transferLines: {
    warm: "Let me bring your account lead on the line. One moment please.",
    cold: "I'll transfer you to your account lead now.",
    voicemail: "I'll send you to your account lead's voicemail.",
  },
  tone: "Polished, consultative, succinct.",
};

const PROPERTY_MANAGEMENT: CopyPreset = {
  id: "property_management.default",
  label: "Property management",
  callerNoun: "resident",
  callerNounPlural: "residents",
  accountNoun: "property",
  greetings: [
    "Thanks for calling {{client_name}} property management. This is {{agent_name}}. How can I help?",
    "{{client_name}}, resident services. How can I help today?",
  ],
  callOpeners: [
    "Can I start with your full name and unit number?",
    "Is this a maintenance request, a lease question, or something else?",
  ],
  transferLines: {
    warm: "Let me bring a property manager on the line. One moment.",
    cold: "I'll transfer you to the property manager now.",
    voicemail: "I'll send you to the maintenance voicemail.",
  },
  tone: "Practical, prompt, problem-solving.",
};

const HOME_SERVICES: CopyPreset = {
  id: "home_services.default",
  label: "Home services",
  callerNoun: "customer",
  callerNounPlural: "customers",
  accountNoun: "job",
  greetings: [
    "Thanks for calling {{client_name}}. This is {{agent_name}}. How can I help today?",
    "{{client_name}}, dispatch. How can I help?",
  ],
  callOpeners: [
    "Can I start with your name and the address we'd be servicing?",
    "Is this an emergency or a scheduled service request?",
  ],
  transferLines: {
    warm: "Let me get dispatch on the line for you. One moment.",
    cold: "I'll transfer you to dispatch now.",
    voicemail: "I'll send you to the dispatch voicemail.",
  },
  tone: "Friendly, can-do, action-oriented.",
};

const ECOMMERCE: CopyPreset = {
  id: "ecommerce.default",
  label: "Ecommerce",
  callerNoun: "customer",
  callerNounPlural: "customers",
  accountNoun: "order",
  greetings: [
    "Thanks for calling {{client_name}} customer support. This is {{agent_name}}. How can I help?",
    "{{client_name}}, customer support. How can I help?",
  ],
  callOpeners: [
    "Can I start with your order number or the email on the order?",
    "Is this about an existing order, a return, or something else?",
  ],
  transferLines: {
    warm: "Let me bring a senior support rep on the line. One moment.",
    cold: "I'll transfer you to a senior rep now.",
    voicemail: "I'll send you to the support voicemail.",
  },
  tone: "Upbeat, fast, resolution-focused.",
};

const EDUCATION: CopyPreset = {
  id: "education.default",
  label: "Education",
  callerNoun: "caller",
  callerNounPlural: "callers",
  accountNoun: "program",
  greetings: [
    "Thanks for calling {{client_name}}. This is {{agent_name}}. How can I help you today?",
    "{{client_name}}, admissions and student services. How can I help?",
  ],
  callOpeners: [
    "Can I start with your name and the program you're calling about?",
    "Are you a current student, a prospective student, or a family member?",
  ],
  transferLines: {
    warm: "Let me bring an advisor on the line. One moment please.",
    cold: "I'll transfer you to an advisor now.",
    voicemail: "I'll send you to the advisor's voicemail.",
  },
  tone: "Warm, encouraging, clear about next steps.",
};

const REGISTRY: Record<string, CopyPreset> = {
  [GENERAL.id]: GENERAL,
  [LEGAL.id]: LEGAL,
  [MEDICAL.id]: MEDICAL,
  [FINANCIAL.id]: FINANCIAL,
  [INSURANCE.id]: INSURANCE,
  [PROFESSIONAL_SERVICES.id]: PROFESSIONAL_SERVICES,
  [PROPERTY_MANAGEMENT.id]: PROPERTY_MANAGEMENT,
  [HOME_SERVICES.id]: HOME_SERVICES,
  [ECOMMERCE.id]: ECOMMERCE,
  [EDUCATION.id]: EDUCATION,
};

/** Fallback copy preset id — always resolvable, always returns `GENERAL`. */
export const FALLBACK_COPY_PRESET_ID = GENERAL.id;

/** Lookup by preset id. Unknown ids return the `general` preset. */
export function getCopyPreset(id: string | null | undefined): CopyPreset {
  if (!id) return GENERAL;
  return REGISTRY[id] ?? GENERAL;
}

/**
 * Resolve the copy preset bound to a skin. Always deterministic: a skin
 * without a `copyPresetId` (shouldn't happen — Phase 2 invariant) or a
 * preset id that isn't registered both fall back to `general`.
 */
export function getCopyPresetForSkin(skinId: SkinId | null | undefined): CopyPreset {
  const skin = getSkin(skinId ?? FALLBACK_SKIN_ID);
  return getCopyPreset(skin.copyPresetId);
}

/** Stable list of all registered copy presets, in skin-registry order. */
export function listCopyPresets(): CopyPreset[] {
  return Object.values(REGISTRY);
}
