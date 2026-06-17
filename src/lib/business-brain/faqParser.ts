/**
 * Business Brain — FAQ paste parser (Slice 2).
 *
 * Deterministically extract Q/A pairs from common FAQ paste formats. When
 * confident (≥2 pairs parsed cleanly), the ingest path skips AI and emits
 * `faq` extractions directly. When ambiguous, we fall back to the AI
 * extractor so we never silently drop content.
 *
 * Supported formats:
 *   1. Q: ... / A: ...                (most reliable, any of `:`, `.`, `)`, `-`)
 *   2. Numbered list: `1. Question?` then answer line(s) until next number.
 *   3. Blank-line-separated paragraphs where the first line ends with `?`.
 */

export interface FaqPair {
  question: string;
  answer: string;
}

function dedupe(pairs: FaqPair[]): FaqPair[] {
  const seen = new Set<string>();
  const out: FaqPair[] = [];
  for (const p of pairs) {
    const q = p.question.trim();
    const a = p.answer.trim();
    if (!q || !a) continue;
    const k = q.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ question: q, answer: a });
  }
  return out;
}

function parseQAMarkers(text: string): FaqPair[] {
  // Capture Q: ... A: ... blocks, where the answer runs until next Q: or EOF.
  const re =
    /(?:^|\n)\s*Q\s*[:.)\-]\s*([\s\S]+?)\n\s*A\s*[:.)\-]\s*([\s\S]+?)(?=\n\s*Q\s*[:.)\-]|\s*$)/gi;
  const pairs: FaqPair[] = [];
  for (const m of text.matchAll(re)) {
    pairs.push({ question: m[1].trim(), answer: m[2].trim() });
  }
  return pairs;
}

function parseNumbered(text: string): FaqPair[] {
  // `1. Question?\nAnswer line(s)` until the next `N.` or EOF.
  const re =
    /(?:^|\n)\s*(\d+)[.)]\s*([^\n?]*\?)\s*\n([\s\S]+?)(?=\n\s*\d+[.)]|\s*$)/g;
  const pairs: FaqPair[] = [];
  for (const m of text.matchAll(re)) {
    pairs.push({ question: m[2].trim(), answer: m[3].trim() });
  }
  return pairs;
}

function parseBlankLineParagraphs(text: string): FaqPair[] {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const pairs: FaqPair[] = [];
  for (const b of blocks) {
    const m = b.match(/^([^\n?]+\?)\s*\n([\s\S]+)$/);
    if (m) pairs.push({ question: m[1].trim(), answer: m[2].trim() });
  }
  return pairs;
}

/**
 * Try the strategies in order of reliability. Returns the first strategy
 * that yields ≥2 pairs (a single match is too low-signal to skip AI).
 */
export function parseFaqText(text: string): FaqPair[] {
  if (!text || typeof text !== "string") return [];
  const strategies = [parseQAMarkers, parseNumbered, parseBlankLineParagraphs];
  for (const fn of strategies) {
    const pairs = dedupe(fn(text));
    if (pairs.length >= 2) return pairs;
  }
  return [];
}
