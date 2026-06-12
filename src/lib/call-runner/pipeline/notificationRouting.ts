/**
 * Phase 7 — notification routing.
 *
 * Pure routing logic. Backend dispatch uses existing channels (`notifications`
 * table + `send-notification` edge function); this module decides who needs
 * to know and what the payload looks like.
 *
 * Industry-neutral: specialty/practice-area inputs flow through but are not
 * hardcoded to any vertical.
 */
import type {
  InteractionRecord,
  NotificationJobInput,
} from "./types";

export interface WorkspaceNotificationRule {
  id: string;
  /** Outcome code prefix or exact code; empty/"*" matches any outcome. */
  outcomeMatch: string;
  /** Optional specialty filter (e.g., "personal_injury"); empty matches any. */
  specialtyMatch?: string;
  urgency?: "low" | "normal" | "high" | "urgent";
  channel: "email" | "slack" | "webhook" | "internal";
  recipient: string;
}

export interface NotificationRoutingInput {
  rec: InteractionRecord;
  rules: WorkspaceNotificationRule[];
  /** Optional fallback (e.g., workspace contact owner email). */
  fallbackInternalRecipient?: string;
  /** Copilot-suggested targets carried from the runner. */
  copilotSuggestedTargets?: string[];
}

const URGENT_OUTCOME_PATTERNS = [/urgent/i, /emergency/i, /escal/i, /crisis/i];

export function inferUrgency(rec: InteractionRecord): "low" | "normal" | "high" | "urgent" {
  const explicit = typeof rec.values.urgency === "string" ? (rec.values.urgency as string).toLowerCase() : "";
  if (explicit === "urgent" || explicit === "high" || explicit === "normal" || explicit === "low") {
    return explicit;
  }
  const code = (rec.outcomeCode ?? "").toLowerCase();
  if (URGENT_OUTCOME_PATTERNS.some((re) => re.test(code))) return "urgent";
  return "normal";
}

export function inferSpecialty(rec: InteractionRecord): string {
  const candidates = [rec.values.specialty, rec.values.practice_area, rec.values["matter.practice_area"]];
  for (const v of candidates) {
    if (typeof v === "string" && v.trim()) return v.toLowerCase().trim();
  }
  return "";
}

export function routeNotifications(input: NotificationRoutingInput): NotificationJobInput[] {
  const { rec, rules, fallbackInternalRecipient, copilotSuggestedTargets } = input;
  const urgency = inferUrgency(rec);
  const specialty = inferSpecialty(rec);
  const outcome = (rec.outcomeCode ?? "").toLowerCase();

  const matched = rules.filter((rule) => {
    if (rule.outcomeMatch && rule.outcomeMatch !== "*") {
      if (!outcome.startsWith(rule.outcomeMatch.toLowerCase())) return false;
    }
    if (rule.specialtyMatch && rule.specialtyMatch !== "*") {
      if (rule.specialtyMatch.toLowerCase() !== specialty) return false;
    }
    if (rule.urgency) {
      if (rankUrgency(urgency) < rankUrgency(rule.urgency)) return false;
    }
    return true;
  });

  const jobs: NotificationJobInput[] = matched.map((rule) => ({
    channel: rule.channel,
    recipient: rule.recipient,
    triggerEvent: `interaction.${outcome || "submitted"}`,
    payload: buildPayload(rec, urgency, specialty),
    idempotencyKey: `${rec.id}:notif:${rule.id}`,
  }));

  // Urgency escalation fallback — if nothing matched but this is urgent, fan out
  // to the workspace's internal fallback so something always lands.
  if (jobs.length === 0 && urgency === "urgent" && fallbackInternalRecipient) {
    jobs.push({
      channel: "internal",
      recipient: fallbackInternalRecipient,
      triggerEvent: `interaction.urgent_escalation`,
      payload: buildPayload(rec, urgency, specialty),
      idempotencyKey: `${rec.id}:notif:urgent-fallback`,
    });
  }

  // Copilot-suggested recipients are layered on as "advisory" notifications —
  // they do NOT replace rule-based routing.
  for (const target of copilotSuggestedTargets ?? []) {
    if (!target.trim()) continue;
    jobs.push({
      channel: "internal",
      recipient: target,
      triggerEvent: "interaction.copilot_suggested",
      payload: buildPayload(rec, urgency, specialty),
      idempotencyKey: `${rec.id}:notif:copilot:${target}`,
    });
  }

  return jobs;
}

function rankUrgency(u: "low" | "normal" | "high" | "urgent"): number {
  return { low: 0, normal: 1, high: 2, urgent: 3 }[u];
}

function buildPayload(rec: InteractionRecord, urgency: string, specialty: string) {
  return {
    interaction_id: rec.id,
    workspace_id: rec.workspaceId,
    campaign_id: rec.campaignId,
    outcome: rec.outcomeCode,
    urgency,
    specialty,
    summary: rec.copilotSummary ?? rec.notes?.slice(0, 280) ?? "",
    caller_ani: rec.ani,
    finalized_at: rec.finalizedAt,
  };
}
