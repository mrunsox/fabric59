// Deterministic entity matching: never auto-pick on ambiguity.
// Order: existing entity_link → email → phone → full_name → review queue.

import type { NormalizedContact } from "./normalized-entities.ts";

export interface MatchInput {
  email?: string;
  phone?: string;
  full_name?: string;
  provider_id?: string;
  client_id: string;
  provider: string;
}

export type MatchOutcome =
  | { kind: "linked"; provider_id: string; via: "entity_link" }
  | { kind: "exact"; candidate: NormalizedContact; via: "email" | "phone" | "provider_id" }
  | { kind: "single_fuzzy"; candidate: NormalizedContact; via: "full_name" }
  | { kind: "ambiguous"; candidates: NormalizedContact[]; via: string }
  | { kind: "none" };

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits.length ? `+${digits}` : "";
}

export function normalizeMatchInput(input: MatchInput): MatchInput {
  return {
    ...input,
    email: input.email?.trim().toLowerCase(),
    phone: input.phone ? normalizePhone(input.phone) : undefined,
    full_name: input.full_name?.trim(),
  };
}

export async function findEntityLink(
  supabase: { from: (t: string) => any },
  input: MatchInput,
): Promise<string | null> {
  if (!input.provider_id) return null;
  const { data } = await supabase
    .from("legal_connect_entity_links")
    .select("provider_entity_id")
    .eq("client_id", input.client_id)
    .eq("provider", input.provider)
    .eq("entity_type", "contact")
    .eq("provider_entity_id", input.provider_id)
    .maybeSingle();
  return data?.provider_entity_id ?? null;
}

export function evaluateMatch(
  input: MatchInput,
  candidates: NormalizedContact[],
): MatchOutcome {
  const norm = normalizeMatchInput(input);

  // Exact provider_id
  if (norm.provider_id) {
    const exact = candidates.find((c) => c.provider_id === norm.provider_id);
    if (exact) return { kind: "exact", candidate: exact, via: "provider_id" };
  }

  // Exact email
  if (norm.email) {
    const matches = candidates.filter((c) => c.email?.toLowerCase() === norm.email);
    if (matches.length === 1) return { kind: "exact", candidate: matches[0], via: "email" };
    if (matches.length > 1) return { kind: "ambiguous", candidates: matches, via: "email" };
  }

  // Exact phone
  if (norm.phone) {
    const matches = candidates.filter(
      (c) => normalizePhone(c.phone ?? "") === norm.phone || normalizePhone(c.alt_phone ?? "") === norm.phone,
    );
    if (matches.length === 1) return { kind: "exact", candidate: matches[0], via: "phone" };
    if (matches.length > 1) return { kind: "ambiguous", candidates: matches, via: "phone" };
  }

  // Fuzzy by full name (only single-result acceptance)
  if (norm.full_name) {
    const target = norm.full_name.toLowerCase();
    const matches = candidates.filter(
      (c) => (c.full_name ?? `${c.first_name ?? ""} ${c.last_name ?? ""}`).trim().toLowerCase() === target,
    );
    if (matches.length === 1) return { kind: "single_fuzzy", candidate: matches[0], via: "full_name" };
    if (matches.length > 1) return { kind: "ambiguous", candidates: matches, via: "full_name" };
  }

  return { kind: "none" };
}

export async function routeToReviewQueue(
  supabase: { from: (t: string) => any },
  args: {
    organization_id: string;
    client_id: string;
    provider: string;
    reason: string;
    payload: Record<string, unknown>;
    candidates?: NormalizedContact[];
    correlation_id?: string;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from("legal_connect_review_queue")
    .insert({
      organization_id: args.organization_id,
      client_id: args.client_id,
      provider: args.provider,
      reason: args.reason,
      payload: args.payload,
      candidates: args.candidates ?? [],
      correlation_id: args.correlation_id ?? null,
      status: "pending",
    })
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[entity-matcher] review queue insert failed:", error.message);
    return null;
  }
  return data?.id ?? null;
}
