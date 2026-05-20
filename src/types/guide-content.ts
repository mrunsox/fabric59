/**
 * Canonical guide content model (V1).
 *
 * Stored in `guide_versions.content` jsonb for native canonical guides
 * (source_type IS NULL). Legacy script-mirrored guides (source_type='script')
 * are NOT migrated to this shape — they continue to use the legacy
 * ScriptBuilder pipeline.
 */

export const GUIDE_CONTENT_SCHEMA_VERSION = 1 as const;

export type GuideBlock =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "info"; text: string }
  | { id: string; type: "script"; text: string }
  | { id: string; type: "connector"; label: string; href: string };

export type GuideBlockType = GuideBlock["type"];

export interface GuideContentV1 {
  schemaVersion: 1;
  blocks: GuideBlock[];
}

export const EMPTY_GUIDE_CONTENT: GuideContentV1 = {
  schemaVersion: 1,
  blocks: [],
};
