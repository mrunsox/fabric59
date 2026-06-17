/**
 * Business Brain — hours normalization (Slice 2, best-effort).
 *
 * Parses common business-hours shorthand into a per-weekday record. The
 * original free-form schedule string is ALWAYS preserved on the payload;
 * `weekly` is populated only when parsing is confident.
 */

export interface Weekly {
  mon?: string;
  tue?: string;
  wed?: string;
  thu?: string;
  fri?: string;
  sat?: string;
  sun?: string;
}

const ORDER: Array<keyof Weekly> = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function dayIdx(s: string): number {
  return ORDER.indexOf(s.toLowerCase().slice(0, 3) as keyof Weekly);
}

/**
 * Best-effort. Recognized patterns:
 *   "Mon-Fri 9-5"
 *   "Mon–Fri 9am-5pm"
 *   "Mon to Thu 8am-6pm, Fri 8-3"
 *   "Saturday 10-2"
 * Returns `undefined` when nothing parses, so callers fall back to free-form.
 */
export function parseWeekly(schedule: string | undefined): Weekly | undefined {
  if (!schedule || typeof schedule !== "string") return undefined;
  const weekly: Weekly = {};
  let matched = false;

  const segments = schedule.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  for (const seg of segments) {
    // Range form: Mon-Fri 9-5
    const rangeMatch = seg.match(
      /^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*(?:-|–|—|to)\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s+(.+)$/i,
    );
    if (rangeMatch) {
      const a = dayIdx(rangeMatch[1]);
      const b = dayIdx(rangeMatch[2]);
      const hours = rangeMatch[3].trim();
      if (a >= 0 && b >= a && hours) {
        for (let i = a; i <= b; i += 1) weekly[ORDER[i]] = hours;
        matched = true;
        continue;
      }
    }
    // Single-day form: Mon 9-5, Saturday 10-2
    const singleMatch = seg.match(
      /^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s+(.+)$/i,
    );
    if (singleMatch) {
      const a = dayIdx(singleMatch[1]);
      const hours = singleMatch[2].trim();
      if (a >= 0 && hours) {
        weekly[ORDER[a]] = hours;
        matched = true;
      }
    }
  }

  return matched ? weekly : undefined;
}
