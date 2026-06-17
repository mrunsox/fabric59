/**
 * ASC → canonical intake translator (Phase 5 · Slice 1).
 *
 * Source of truth for handoff behavior: docs/asc-architecture.md
 *
 *
 * Pure (same input → same output). No I/O, no Date.now().
 *
 * Responsibilities:
 *   - Provide a deterministic, modest fallback for the required Section 1
 *     fields (`campaignName`, `clientName`) so the canonical form can
 *     actually save after handoff. We DO NOT synthesize polished
 *     marketing names in this slice — a short slice of the business
 *     description is used as-is and the user can edit.
 *   - Carry ASC-side structured context (outcomes, caller reasons,
 *     destination, launch slug, generation TODOs) into the additive,
 *     optional `ascOrigin` field on CampaignIntakeData. This is provenance
 *     only; canonical editable fields above it remain the true source of
 *     record.
 *   - Leave `additionalNotes` user-owned. We attach at most a single
 *     pointer line so a reviewer scrolling Section 9 knows where the
 *     structured context lives.
 *   - Never propagate ASC-only metadata (interviewer/gap-finder/logic
 *     architect proposals).
 */
import type { AscDraft } from "./types";
import type { CampaignIntakeData } from "@/types/campaign";

export interface AscForkResult {
  prefill: Partial<CampaignIntakeData>;
  source: "asc-wizard";
  ascDraftId: string;
}

const ASC_NOTES_POINTER =
  "Handed off from ASC — see the ASC origin panel at the top of this form for caller reasons, outcomes, destination, and follow-ups.";
const MAX_FOLLOWUP_CARRY = 20;
const MAX_FOLLOWUP_CHARS = 240;
const NAME_FALLBACK_MAX = 60;

function trimSafe(s: string | undefined | null): string {
  return (s ?? "").toString().trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Deterministic, unembellished name fallback. Returns the first
 * `NAME_FALLBACK_MAX` characters of the description, snapped to a word
 * boundary when possible. Empty input → empty string (caller decides).
 */
function deriveNameFallback(description: string): string {
  const cleaned = description.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= NAME_FALLBACK_MAX) return cleaned;
  const window = cleaned.slice(0, NAME_FALLBACK_MAX);
  const lastSpace = window.lastIndexOf(" ");
  return lastSpace > 20 ? window.slice(0, lastSpace) : window;
}

export function translateAscDraftToIntake(
  draft: AscDraft,
  options: { forkedAt: string },
): AscForkResult {
  const input = draft.input;
  const generated = draft.generated;
  const prefill: Partial<CampaignIntakeData> = {};

  // ── Section 1: deterministic name fallback ──────────────────────────
  const description = trimSafe(input.business?.description);
  if (description) {
    prefill.campaignDescription = truncate(description, 2000);
    const nameFallback = deriveNameFallback(description);
    if (nameFallback) {
      prefill.campaignName = nameFallback;
      prefill.clientName = nameFallback;
    }
  }

  // ── Provenance: ascOrigin ───────────────────────────────────────────
  const carried: NonNullable<
    NonNullable<CampaignIntakeData["ascOrigin"]>["carried"]
  > = {};

  const primaryOutcome = trimSafe(input.purpose?.primaryOutcome);
  if (primaryOutcome) carried.primaryOutcome = truncate(primaryOutcome, 240);
  const secondaryOutcome = trimSafe(input.purpose?.secondaryOutcome);
  if (secondaryOutcome)
    carried.secondaryOutcome = truncate(secondaryOutcome, 240);

  const reasons = (input.callerReasons ?? [])
    .filter(Boolean)
    .map((r) => ({
      id: r.id,
      label: truncate(trimSafe(r.label) || "(unlabeled)", 120),
    }));
  if (reasons.length > 0) carried.callerReasons = reasons;

  const dest = input.destination;
  if (dest?.kind) {
    carried.destination = {
      kind: dest.kind,
      ...(dest.externalUrl
        ? { externalUrl: truncate(dest.externalUrl, 500) }
        : {}),
      ...(dest.deepLinkTemplate
        ? { deepLinkTemplate: truncate(dest.deepLinkTemplate, 500) }
        : {}),
      ...(dest.openMode ? { openMode: dest.openMode } : {}),
    };
  }

  const slug = trimSafe(input.launch?.slug);
  if (slug) carried.launchSlug = truncate(slug, 120);

  const todos = (generated?.todos ?? []).filter(Boolean);
  const followUps = todos.slice(0, MAX_FOLLOWUP_CARRY).map((t) => ({
    id: t.id,
    area: String(t.area),
    message: truncate(trimSafe(t.message) || "(no detail)", MAX_FOLLOWUP_CHARS),
  }));
  if (todos.length > MAX_FOLLOWUP_CARRY) {
    followUps.push({
      id: "__overflow__",
      area: "meta",
      message: `(+${todos.length - MAX_FOLLOWUP_CARRY} more follow-ups omitted)`,
    });
  }

  const hasCarried = Object.keys(carried).length > 0;
  const hasFollowUps = followUps.length > 0;

  if (hasCarried || hasFollowUps) {
    prefill.ascOrigin = {
      ascDraftId: draft.id,
      forkedAt: options.forkedAt,
      ...(hasCarried ? { carried } : {}),
      ...(hasFollowUps ? { followUps } : {}),
      reviewState: { followUpsDismissedIds: [] },
    };
    prefill.additionalNotes = ASC_NOTES_POINTER;
  } else {
    // No structured carry-over: still record provenance so the panel
    // can show the "handed off from ASC" banner.
    prefill.ascOrigin = {
      ascDraftId: draft.id,
      forkedAt: options.forkedAt,
      reviewState: { followUpsDismissedIds: [] },
    };
  }

  return {
    prefill,
    source: "asc-wizard",
    ascDraftId: draft.id,
  };
}
