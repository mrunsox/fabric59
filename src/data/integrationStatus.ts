/**
 * Single source of truth for integration / capability lifecycle status.
 *
 * Any user-facing claim about whether something is "live", "queued",
 * or "coming soon" on Fabric59's marketing surfaces should derive from
 * this file. Update one row here — landing page badges, FAQ copy,
 * structured data, and SEO descriptions stay aligned automatically.
 *
 * Status semantics:
 *  - "live"        → shipped, in production, available to active engagements today
 *  - "queued"      → built or substantially built, gated on an external dependency
 *                    (OAuth credentials, partner activation, customer secret, etc.)
 *  - "coming_soon" → on the active roadmap, not yet built or only partially built
 */

import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Building2,
  Globe,
  Mail,
  MessageSquare,
  Phone,
  Scale,
  Sparkles,
} from "lucide-react";

export type IntegrationStatus = "live" | "queued" | "coming_soon";

export type IntegrationCategory =
  | "telephony"
  | "crm"
  | "collaboration"
  | "ai"
  | "billing";

export interface IntegrationStatusEntry {
  /** Stable id — safe to use as React key or analytics tag. */
  id: string;
  /** Short display name. */
  name: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  /** Lucide icon used by landing-page cards / bullets. */
  icon: LucideIcon;
  /**
   * One-sentence canonical status statement. This is what the landing
   * page renders verbatim — keep it accurate to the truth on the ground.
   */
  statement: string;
  /** Optional shorter label used inside spotlight bullets. */
  bullet?: string;
}

export const INTEGRATION_STATUS: readonly IntegrationStatusEntry[] = [
  {
    id: "five9-soap",
    name: "Five9 SOAP Admin API",
    category: "telephony",
    status: "live",
    icon: Phone,
    statement:
      "30+ Five9 SOAP actions covering agents, campaigns, skills, profiles, DNIS, dispositions, and call variables — wired through one unified edge function.",
    bullet: "Sub-500ms ANI-based pre-call lookup with screen-pop",
  },
  {
    id: "mycase",
    name: "MyCase",
    category: "crm",
    status: "live",
    icon: Scale,
    statement: "MyCase is live via per-client API key intake.",
    bullet: "MyCase integration via per-client API key intake",
  },
  {
    id: "clio-grow",
    name: "Clio Grow",
    category: "crm",
    status: "live",
    icon: Globe,
    statement:
      "Clio Grow Lead Inbox shipped as MVP via the clio-grow edge function with idempotent sync jobs.",
    bullet: "Clio Grow Lead Inbox MVP via clio-grow edge function",
  },
  {
    id: "slack",
    name: "Slack",
    category: "collaboration",
    status: "live",
    icon: MessageSquare,
    statement:
      "Real-time Slack provisioning for agent workspaces and post-call event notifications routed by urgency.",
    bullet: "Slack workspace provisioning + post-call notifications",
  },
  {
    id: "clio-manage",
    name: "Clio Manage",
    category: "crm",
    status: "queued",
    icon: Scale,
    statement:
      "Clio Manage adapter is queued behind OAuth provisioning — full write-back activates once OAuth credentials are configured.",
    bullet: "Clio Manage adapter — activates on OAuth provisioning",
  },
  {
    id: "ai-call-flow-export",
    name: "AI Call Flow → Five9 IVR export",
    category: "ai",
    status: "coming_soon",
    icon: Bot,
    statement:
      "AI Call Flow builder and runtime simulator are live; one-click Five9 IVR export is in progress.",
    bullet: "One-click Five9 IVR export from AI Call Flow",
  },
  {
    id: "crm-writebacks",
    name: "Disposition → CRM writebacks",
    category: "crm",
    status: "coming_soon",
    icon: Mail,
    statement:
      "Branded disposition emails and post-call automations are live; direct CRM field writebacks are landing next.",
    bullet: "Direct disposition → CRM field writebacks",
  },
  {
    id: "google-workspace",
    name: "Google Workspace provisioning",
    category: "collaboration",
    status: "coming_soon",
    icon: Building2,
    statement:
      "Five9 + Slack provisioning is live; Google Workspace provisioning is on the roadmap.",
    bullet: "Google Workspace provisioning",
  },
  {
    id: "self-serve-billing",
    name: "Self-serve billing & plans",
    category: "billing",
    status: "coming_soon",
    icon: Sparkles,
    statement:
      "Usage metering is live; onboarding is founder-led today and Stripe self-serve billing is on the roadmap.",
    bullet: "Stripe self-serve billing",
  },
] as const;

// ---------- Selectors ---------------------------------------------------

export const byStatus = (status: IntegrationStatus) =>
  INTEGRATION_STATUS.filter((entry) => entry.status === status);

export const byCategory = (category: IntegrationCategory) =>
  INTEGRATION_STATUS.filter((entry) => entry.category === category);

export const liveIntegrations = () => byStatus("live");
export const queuedIntegrations = () => byStatus("queued");
export const comingSoonIntegrations = () => byStatus("coming_soon");

/** Live + queued + coming_soon entries that are NOT generally available yet. */
export const notYetGenerallyAvailable = () =>
  INTEGRATION_STATUS.filter((entry) => entry.status !== "live");

export const STATUS_LABEL: Record<IntegrationStatus, string> = {
  live: "Live",
  queued: "Queued",
  coming_soon: "Coming soon",
};

// ---------- Derived prose (used in FAQ + SEO) ---------------------------

const joinWithAnd = (items: readonly string[]): string => {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

/** Human-readable list of live CRMs for SEO + body copy. */
export const liveCrmNames = (): string[] =>
  byCategory("crm").filter((e) => e.status === "live").map((e) => e.name);

/** Human-readable list of queued CRMs (built, gated). */
export const queuedCrmNames = (): string[] =>
  byCategory("crm").filter((e) => e.status === "queued").map((e) => e.name);

/** Canonical single-paragraph CRM-support answer used in FAQ. */
export const crmSupportAnswer = (): string => {
  const live = byCategory("crm").filter((e) => e.status === "live");
  const queued = byCategory("crm").filter((e) => e.status === "queued");
  const liveSentence = live.map((e) => e.statement).join(" ");
  const queuedSentence = queued.map((e) => e.statement).join(" ");
  return [
    liveSentence,
    queuedSentence,
    "Additional CRMs are added per engagement through the same adapter pattern.",
  ]
    .filter(Boolean)
    .join(" ");
};

/** Short phrase for SEO meta — e.g. "MyCase + Clio Grow". */
export const liveCrmSeoPhrase = (): string =>
  liveCrmNames().join(" + ") || "legal CRMs";

/** Human prose for hero subhead — e.g. "MyCase and Clio Grow intake". */
export const liveCrmSubheadPhrase = (): string => {
  const names = liveCrmNames();
  return names.length ? `${joinWithAnd(names)} intake` : "legal CRM intake";
};
