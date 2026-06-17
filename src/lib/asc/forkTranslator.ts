/**
 * ASC Slice 8 — fork translator (ASC-local → canonical intake prefill).
 *
 * This is the only module allowed to translate AscDraft / AscGenerated
 * shapes into canonical `CampaignIntakeData`. The translator:
 *   - is pure (same input → same output, no I/O, no Date.now()),
 *   - never throws on missing optional fields (degrades to omitting them),
 *   - never creates or updates database rows (Slice 8 fork is purely
 *     client-side prefill: navigate to /w/:id/campaigns/new with router
 *     state and let the existing intake page render the form),
 *   - returns a `Partial<CampaignIntakeData>` so the canonical intake page
 *     can apply default-fills for sections we don't populate,
 *   - does NOT propagate ASC-only metadata (interviewer turns, gap-finder
 *     items, Logic Architect proposals).
 *
 * Generated TODOs are carried over conservatively into
 * `additionalNotes` under an explicit "ASC draft follow-ups" header so
 * reviewers don't mistake them for user-authored notes.
 */
import type { AscDraft } from "./types";
import type { CampaignIntakeData } from "@/types/campaign";

export interface AscForkResult {
  prefill: Partial<CampaignIntakeData>;
  source: "asc-wizard";
  ascDraftId: string;
}

const ASC_NOTES_HEADER = "ASC draft follow-ups (review before publish):";
const MAX_TODO_CARRY = 20;
const MAX_TODO_CHARS_EACH = 240;

function trimSafe(s: string | undefined): string {
  return (s ?? "").toString().trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

export function translateAscDraftToIntake(draft: AscDraft): AscForkResult {
  const input = draft.input;
  const generated = draft.generated;

  const prefill: Partial<CampaignIntakeData> = {};

  // ── Section 1: Basics ────────────────────────────────────────────────
  const description = trimSafe(input.business?.description);
  if (description) {
    prefill.campaignDescription = truncate(description, 2000);
  }

  // ── Section 7: Decision tree (omitted) ───────────────────────────────
  // The ASC-local AscGenerated.flow is intentionally NOT translated into
  // a canonical DecisionTreeNode[] in this slice. The canonical intake
  // page already supports building the decision tree manually; we will
  // map it explicitly in a later slice once the canonical shape is
  // settled. Carrying half-mapped flow data risks silent corruption.

  // ── Notes: TODOs + advisory carry-over ────────────────────────────────
  const noteLines: string[] = [];
  const todos = (generated?.todos ?? []).filter(Boolean);
  if (todos.length > 0) {
    noteLines.push(ASC_NOTES_HEADER);
    for (const t of todos.slice(0, MAX_TODO_CARRY)) {
      noteLines.push(
        `- [${t.area}] ${truncate(trimSafe(t.message) || "(no detail)", MAX_TODO_CHARS_EACH)}`,
      );
    }
    if (todos.length > MAX_TODO_CARRY) {
      noteLines.push(
        `- (+${todos.length - MAX_TODO_CARRY} more follow-ups omitted)`,
      );
    }
  }

  const primaryOutcome = trimSafe(input.purpose?.primaryOutcome);
  if (primaryOutcome) {
    if (noteLines.length === 0) noteLines.push(ASC_NOTES_HEADER);
    noteLines.push(`- Primary outcome (ASC): ${truncate(primaryOutcome, 240)}`);
  }
  const secondaryOutcome = trimSafe(input.purpose?.secondaryOutcome);
  if (secondaryOutcome) {
    noteLines.push(
      `- Secondary outcome (ASC): ${truncate(secondaryOutcome, 240)}`,
    );
  }

  const reasons = (input.callerReasons ?? []).filter(Boolean);
  if (reasons.length > 0) {
    if (noteLines.length === 0) noteLines.push(ASC_NOTES_HEADER);
    noteLines.push(
      `- Caller reasons (ASC, ${reasons.length}): ${reasons
        .slice(0, 12)
        .map((r) => truncate(trimSafe(r.label) || "(unlabeled)", 80))
        .join("; ")}${reasons.length > 12 ? "; …" : ""}`,
    );
  }

  const dest = input.destination;
  if (dest?.kind) {
    if (noteLines.length === 0) noteLines.push(ASC_NOTES_HEADER);
    const parts: string[] = [`kind=${dest.kind}`];
    if (dest.externalUrl) parts.push(`url=${truncate(dest.externalUrl, 240)}`);
    if (dest.deepLinkTemplate)
      parts.push(`template=${truncate(dest.deepLinkTemplate, 240)}`);
    if (dest.openMode) parts.push(`open=${dest.openMode}`);
    noteLines.push(`- Destination (ASC): ${parts.join(", ")}`);
  }

  const slug = trimSafe(input.launch?.slug);
  if (slug) {
    if (noteLines.length === 0) noteLines.push(ASC_NOTES_HEADER);
    noteLines.push(`- Launch slug (ASC): ${truncate(slug, 120)}`);
  }

  if (noteLines.length > 0) {
    prefill.additionalNotes = noteLines.join("\n");
  }

  return {
    prefill,
    source: "asc-wizard",
    ascDraftId: draft.id,
  };
}
