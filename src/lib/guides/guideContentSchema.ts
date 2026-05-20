import { z } from "zod";
import {
  EMPTY_GUIDE_CONTENT,
  GUIDE_CONTENT_SCHEMA_VERSION,
  type GuideContentV1,
} from "@/types/guide-content";

const baseBlock = { id: z.string().min(1) };

export const guideBlockSchema = z.discriminatedUnion("type", [
  z.object({ ...baseBlock, type: z.literal("heading"), text: z.string() }),
  z.object({ ...baseBlock, type: z.literal("paragraph"), text: z.string() }),
  z.object({ ...baseBlock, type: z.literal("info"), text: z.string() }),
  z.object({ ...baseBlock, type: z.literal("script"), text: z.string() }),
  z.object({
    ...baseBlock,
    type: z.literal("connector"),
    label: z.string(),
    href: z.string(),
  }),
]);

export const guideContentV1Schema = z.object({
  schemaVersion: z.literal(GUIDE_CONTENT_SCHEMA_VERSION),
  blocks: z.array(guideBlockSchema),
});

/**
 * Safe, idempotent migrator. Anything that isn't a valid GuideContentV1
 * (null, undefined, legacy `{nodes, edges}` script shapes, arrays, random
 * objects) collapses to an empty V1 document.
 */
export function migrateGuideContentToV1(raw: unknown): GuideContentV1 {
  const parsed = guideContentV1Schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { ...EMPTY_GUIDE_CONTENT, blocks: [] };
}

/**
 * Validates the value is a well-formed GuideContentV1. Throws on failure.
 * Use before writing to persistence.
 */
export function assertGuideContentV1(value: unknown): GuideContentV1 {
  return guideContentV1Schema.parse(value);
}

/** Loose http(s) URL guard for connector paste-promotion. */
export function isHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
