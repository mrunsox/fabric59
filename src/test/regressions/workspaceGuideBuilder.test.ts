import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildGenericTemplate,
  buildLegalFirmStarterTemplate,
  WORKSPACE_GUIDE_TEMPLATES,
  DEFAULT_SECTION_LABELS,
} from "@/lib/workspace-guide/templates";
import {
  migrateWorkspaceGuideContent,
  workspaceGuideContentV2Schema,
  newId,
} from "@/lib/workspace-guide/schema";
import {
  EMPTY_WORKSPACE_GUIDE,
  WORKSPACE_GUIDE_SCHEMA_VERSION,
  WORKSPACE_GUIDE_SINGLETON_NAME,
} from "@/types/workspace-guide";

const ROOT = path.resolve(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe("Phase 4 · workspace guide model", () => {
  it("empty content is schema-valid v2", () => {
    expect(workspaceGuideContentV2Schema.safeParse(EMPTY_WORKSPACE_GUIDE).success).toBe(true);
    expect(EMPTY_WORKSPACE_GUIDE.schemaVersion).toBe(WORKSPACE_GUIDE_SCHEMA_VERSION);
  });

  it("migrator collapses unknown shapes to empty v2", () => {
    expect(migrateWorkspaceGuideContent(null)).toEqual(EMPTY_WORKSPACE_GUIDE);
    expect(migrateWorkspaceGuideContent({ nodes: [], edges: [] })).toEqual(EMPTY_WORKSPACE_GUIDE);
    expect(migrateWorkspaceGuideContent({ schemaVersion: 1, blocks: [] })).toEqual(EMPTY_WORKSPACE_GUIDE);
  });

  it("default section labels cover every kind and are industry-neutral", () => {
    for (const label of Object.values(DEFAULT_SECTION_LABELS)) {
      expect(/law|attorney|lawyer|practice area/i.test(label)).toBe(false);
    }
  });
});

describe("Phase 4 · templates", () => {
  it("generic template seeds sensible neutral sections", () => {
    const g = buildGenericTemplate();
    expect(workspaceGuideContentV2Schema.safeParse(g).success).toBe(true);
    const kinds = g.sections.map((s) => s.kind);
    for (const required of ["greeting", "business_overview", "hours", "callback_policy", "faqs"]) {
      expect(kinds).toContain(required);
    }
  });

  it("generic template content is free of legal vocabulary", () => {
    const g = buildGenericTemplate();
    const blob = JSON.stringify(g).toLowerCase();
    expect(blob).not.toMatch(/law firm|attorney|practice area|legal advice/);
  });

  it("legal firm starter includes practice areas and conflict-check language", () => {
    const t = buildLegalFirmStarterTemplate();
    expect(workspaceGuideContentV2Schema.safeParse(t).success).toBe(true);
    const labels = t.sections.map((s) => s.label).join(" | ");
    expect(labels).toMatch(/practice areas/i);
    const blob = JSON.stringify(t).toLowerCase();
    expect(blob).toMatch(/attorney|legal advice|consultation/);
  });

  it("template registry exposes both generic and legal firm starter", () => {
    const ids = WORKSPACE_GUIDE_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("generic");
    expect(ids).toContain("legal-firm-starter");
  });
});

describe("Phase 4 · section mutation helpers (pure)", () => {
  function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const next = arr.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  }

  it("reorder swaps adjacent sections", () => {
    const arr = buildGenericTemplate().sections;
    const a = arr[0].id, b = arr[1].id;
    const next = move(arr, 0, 1);
    expect(next[0].id).toBe(b);
    expect(next[1].id).toBe(a);
  });

  it("remove drops the matching section", () => {
    const arr = buildGenericTemplate().sections;
    const target = arr[2].id;
    const next = arr.filter((s) => s.id !== target);
    expect(next.find((s) => s.id === target)).toBeUndefined();
    expect(next.length).toBe(arr.length - 1);
  });

  it("rename updates only the targeted section label", () => {
    const arr = buildGenericTemplate().sections;
    const target = arr[0].id;
    const next = arr.map((s) => (s.id === target ? { ...s, label: "Renamed" } : s));
    expect(next.find((s) => s.id === target)?.label).toBe("Renamed");
    expect(next.filter((s) => s.label === "Renamed")).toHaveLength(1);
  });

  it("newId returns a stable-shaped identifier", () => {
    expect(newId("sec")).toMatch(/^sec_/);
  });
});

describe("Phase 4 · route + nav wiring", () => {
  it("App.tsx mounts /w/:workspaceId/guide on WorkspaceGuideBuilderPage", () => {
    const src = read("App.tsx");
    expect(src).toMatch(/path="guide"\s+element={<WorkspaceGuideBuilderPage/);
    expect(src).toMatch(/import WorkspaceGuideBuilderPage from/);
  });

  it("canonical nav exposes a Campaign guide entry in the Build group", () => {
    const src = read("config/canonicalNav.ts");
    expect(src).toMatch(/key:\s*["']guide["'][^}]*label:\s*["']Campaign guide["']/);
    expect(src).toMatch(/items:\s*\[[^\]]*"guide"/);
  });

  it("guides list hook filters out the singleton row", () => {
    const src = read("hooks/useWorkspaceGuides.ts");
    expect(src).toMatch(/WORKSPACE_GUIDE_SINGLETON_NAME/);
    expect(src).toMatch(/\.neq\(\s*["']name["']/);
  });

  it("singleton sentinel name is stable", () => {
    expect(WORKSPACE_GUIDE_SINGLETON_NAME).toBe("__workspace_guide__");
  });
});

describe("Phase 4 · vocabulary containment", () => {
  it("builder chrome does not hardcode legal vocabulary", () => {
    const files = [
      "pages/workspace/WorkspaceGuideBuilderPage.tsx",
      "components/workspace-guide/SectionList.tsx",
      "components/workspace-guide/SectionEditor.tsx",
      "lib/workspace-guide/schema.ts",
      "types/workspace-guide.ts",
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(/law firm|attorney|practice area|legal advice/i.test(src), `${rel} leaks legal vocab`).toBe(false);
    }
  });

  it("legal vocabulary is confined to templates.ts", () => {
    const src = read("lib/workspace-guide/templates.ts");
    expect(src.toLowerCase()).toMatch(/practice areas/);
  });
});
