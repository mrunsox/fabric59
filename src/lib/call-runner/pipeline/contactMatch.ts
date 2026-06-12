/**
 * Phase 7 — contact match.
 *
 * Pure scoring + selection logic. Backend match runs in the edge function
 * against `legal_connect_contacts`; this module is the deterministic
 * decision layer also used by tests.
 */
import type { ContactCandidate, ContactMatchOutcome, InteractionRecord } from "./types";

function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

function normalizeEmail(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

function normalizeName(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function extractMatchKeysFromInteraction(rec: InteractionRecord): {
  phone: string;
  email: string;
  fullName: string;
} {
  const v = rec.values ?? {};
  const phoneCandidate =
    (typeof v.caller_phone === "string" && v.caller_phone) ||
    (typeof v.phone === "string" && v.phone) ||
    rec.ani ||
    "";
  const emailCandidate = (typeof v.caller_email === "string" && v.caller_email) || (typeof v.email === "string" && v.email) || "";
  const nameCandidate =
    (typeof v.caller_name === "string" && v.caller_name) ||
    (typeof v.full_name === "string" && v.full_name) ||
    [v.first_name, v.last_name].filter(Boolean).join(" ");
  return {
    phone: normalizePhone(String(phoneCandidate)),
    email: normalizeEmail(String(emailCandidate)),
    fullName: normalizeName(String(nameCandidate)),
  };
}

/**
 * Match strategy (in priority order):
 *   1. Exact phone match — unambiguous, link.
 *   2. Exact email match — unambiguous, link.
 *   3. Name + email or name + phone partial — single match, link.
 *   4. Multiple plausible — return ambiguous; pick most-recently-active as
 *      a deterministic default but flag as ambiguous so it lands in the
 *      exception queue for human review.
 *   5. Otherwise — none (caller will request new-contact creation downstream).
 */
export function resolveMatch(
  rec: InteractionRecord,
  candidates: ContactCandidate[],
): ContactMatchOutcome {
  const keys = extractMatchKeysFromInteraction(rec);

  if (keys.phone) {
    const exact = candidates.filter((c) => normalizePhone(c.phone) === keys.phone);
    if (exact.length === 1) return { kind: "linked", contact: exact[0], via: "phone" };
    if (exact.length > 1) {
      const chosen = pickMostRecent(exact);
      return { kind: "ambiguous", candidates: exact, via: "phone", chosen };
    }
  }

  if (keys.email) {
    const exact = candidates.filter((c) => normalizeEmail(c.email) === keys.email);
    if (exact.length === 1) return { kind: "linked", contact: exact[0], via: "email" };
    if (exact.length > 1) {
      const chosen = pickMostRecent(exact);
      return { kind: "ambiguous", candidates: exact, via: "email", chosen };
    }
  }

  if (keys.fullName) {
    const nameMatches = candidates.filter((c) => candidateFullName(c) === keys.fullName);
    if (keys.email) {
      const withEmail = nameMatches.filter((c) => normalizeEmail(c.email) === keys.email);
      if (withEmail.length === 1) return { kind: "linked", contact: withEmail[0], via: "name_plus_email" };
    }
    if (keys.phone) {
      const withPhone = nameMatches.filter((c) => normalizePhone(c.phone) === keys.phone);
      if (withPhone.length === 1) return { kind: "linked", contact: withPhone[0], via: "name_plus_phone" };
    }
    if (nameMatches.length > 1) {
      const chosen = pickMostRecent(nameMatches);
      return { kind: "ambiguous", candidates: nameMatches, via: "full_name", chosen };
    }
  }

  return { kind: "none" };
}

function candidateFullName(c: ContactCandidate): string {
  return normalizeName(c.fullName ?? [c.firstName, c.lastName].filter(Boolean).join(" "));
}

function pickMostRecent(list: ContactCandidate[]): ContactCandidate {
  return [...list].sort((a, b) => {
    const at = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
    const bt = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
    return bt - at;
  })[0];
}
