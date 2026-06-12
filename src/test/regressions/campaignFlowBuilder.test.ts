import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildGenericIntakeTemplate,
  buildLegalIntakeTemplate,
  CAMPAIGN_FLOW_TEMPLATES,
  DEFAULT_STEP_TITLES,
} from "@/lib/campaign-flow/templates";
import {
  campaignFlowContentSchema,
  migrateCampaignFlowContent,
  newFlowId,
} from "@/lib/campaign-flow/schema";
import { evalCondition, evalGroup, ruleFires } from "@/lib/campaign-flow/evaluate";
import {
  CAMPAIGN_FLOW_SCHEMA_VERSION,
  CAMPAIGN_FLOW_SENTINEL_NAME,
  EMPTY_CAMPAIGN_FLOW,
  type FlowRule,
} from "@/types/campaign-flow";

const ROOT = path.resolve(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe("Phase 5 · campaign flow model", () => {
  it("empty content is schema-valid v1", () => {
    expect(campaignFlowContentSchema.safeParse(EMPTY_CAMPAIGN_FLOW).success).toBe(true);
    expect(EMPTY_CAMPAIGN_FLOW.schemaVersion).toBe(CAMPAIGN_FLOW_SCHEMA_VERSION);
  });

  it("migrator collapses unknown shapes to empty v1", () => {
    expect(migrateCampaignFlowContent(null)).toEqual(EMPTY_CAMPAIGN_FLOW);
    expect(migrateCampaignFlowContent({ nodes: [] })).toEqual(EMPTY_CAMPAIGN_FLOW);
    expect(migrateCampaignFlowContent({ schemaVersion: 9, steps: [] })).toEqual(EMPTY_CAMPAIGN_FLOW);
  });

  it("default step titles cover every step type and stay industry-neutral", () => {
    const required = [
      "question_branch", "information_display", "field_capture",
      "outcome_disposition", "escalation_trigger", "notification_trigger", "end_flow",
    ];
    for (const t of required) expect(DEFAULT_STEP_TITLES).toHaveProperty(t);
    for (const v of Object.values(DEFAULT_STEP_TITLES)) {
      expect(/law|attorney|practice area/i.test(v)).toBe(false);
    }
  });

  it("sentinel name is stable", () => {
    expect(CAMPAIGN_FLOW_SENTINEL_NAME).toBe("__campaign_flow__");
  });

  it("newFlowId is stable-shaped", () => {
    expect(newFlowId("stp")).toMatch(/^stp_/);
  });
});

describe("Phase 5 · templates", () => {
  it("generic intake template is schema-valid and neutral", () => {
    const g = buildGenericIntakeTemplate();
    expect(campaignFlowContentSchema.safeParse(g).success).toBe(true);
    expect(JSON.stringify(g).toLowerCase()).not.toMatch(/law firm|attorney|practice area|legal advice/);
  });

  it("legal intake template seeds practice area + attorney escalation language", () => {
    const t = buildLegalIntakeTemplate();
    expect(campaignFlowContentSchema.safeParse(t).success).toBe(true);
    const blob = JSON.stringify(t).toLowerCase();
    expect(blob).toMatch(/practice area|attorney|conflict/);
  });

  it("template registry exposes both generic and legal starters", () => {
    const ids = CAMPAIGN_FLOW_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("generic-intake");
    expect(ids).toContain("legal-intake");
  });

  it("generic template covers every major step type at least once across both templates", () => {
    const all = [...buildGenericIntakeTemplate().steps, ...buildLegalIntakeTemplate().steps];
    const kinds = new Set(all.map((s) => s.type));
    for (const required of [
      "information_display", "question_branch", "field_capture",
      "outcome_disposition", "escalation_trigger", "end_flow",
    ]) {
      expect(kinds.has(required as never)).toBe(true);
    }
  });
});

describe("Phase 5 · rule evaluation", () => {
  it("condition operators behave correctly", () => {
    const v = { color: "red", count: 5 };
    expect(evalCondition({ id: "c", source: "color", op: "eq", value: "red" }, v)).toBe(true);
    expect(evalCondition({ id: "c", source: "color", op: "neq", value: "blue" }, v)).toBe(true);
    expect(evalCondition({ id: "c", source: "color", op: "in", value: ["red", "blue"] }, v)).toBe(true);
    expect(evalCondition({ id: "c", source: "count", op: "gt", value: 3 }, v)).toBe(true);
    expect(evalCondition({ id: "c", source: "missing", op: "is_empty" }, v)).toBe(true);
    expect(evalCondition({ id: "c", source: "color", op: "is_set" }, v)).toBe(true);
  });

  it("AND and OR groups combine conditions", () => {
    const v = { a: "1", b: "2" };
    expect(evalGroup({
      id: "g", combinator: "AND", conditions: [
        { id: "1", source: "a", op: "eq", value: "1" },
        { id: "2", source: "b", op: "eq", value: "2" },
      ],
    }, v)).toBe(true);
    expect(evalGroup({
      id: "g", combinator: "OR", conditions: [
        { id: "1", source: "a", op: "eq", value: "x" },
        { id: "2", source: "b", op: "eq", value: "2" },
      ],
    }, v)).toBe(true);
  });

  it("rule fires when any group passes", () => {
    const r: FlowRule = {
      id: "r",
      groups: [
        { id: "g1", combinator: "AND", conditions: [{ id: "c", source: "x", op: "eq", value: "1" }] },
      ],
      action: { type: "jump_to", stepId: "s2" },
    };
    expect(ruleFires(r, { x: "1" })).toBe(true);
    expect(ruleFires(r, { x: "2" })).toBe(false);
  });
});

describe("Phase 5 · route + nav wiring", () => {
  it("App.tsx mounts canonical builder route", () => {
    const src = read("App.tsx");
    expect(src).toMatch(/path="campaigns\/:campaignId\/builder"\s+element={<WorkspaceCampaignFlowBuilderPage/);
    expect(src).toMatch(/import WorkspaceCampaignFlowBuilderPage from/);
  });

  it("campaign detail page links to the flow builder", () => {
    const src = read("pages/workspace/WorkspaceCampaignDetailPage.tsx");
    expect(src).toMatch(/\/builder/);
    expect(src).toMatch(/open-flow-builder|Open flow builder/);
  });

  it("guides list hook filters out the campaign-flow sentinel", () => {
    const src = read("hooks/useWorkspaceGuides.ts");
    expect(src).toMatch(/CAMPAIGN_FLOW_SENTINEL_NAME/);
  });

  it("legacy /app/workspaces/* still single-hops via LegacyWorkspaceRedirect", () => {
    const src = read("pages/workspace/LegacyWorkspaceRedirect.tsx");
    expect(src).toMatch(/\/w\/\$\{workspaceId/);
  });
});

describe("Phase 5 · vocabulary containment", () => {
  it("core builder chrome does not hardcode legal vocabulary", () => {
    const files = [
      "pages/workspace/WorkspaceCampaignFlowBuilderPage.tsx",
      "components/campaign-flow/StepList.tsx",
      "components/campaign-flow/StepEditor.tsx",
      "components/campaign-flow/RuleBuilder.tsx",
      "components/campaign-flow/OutputMappings.tsx",
      "components/campaign-flow/PreviewRunner.tsx",
      "lib/campaign-flow/schema.ts",
      "lib/campaign-flow/evaluate.ts",
      "types/campaign-flow.ts",
      "hooks/useCampaignFlow.ts",
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(/law firm|attorney|practice area|legal advice/i.test(src), `${rel} leaks legal vocab`).toBe(false);
    }
  });

  it("legal vocabulary is confined to campaign-flow templates.ts", () => {
    const src = read("lib/campaign-flow/templates.ts");
    expect(src.toLowerCase()).toMatch(/practice area|attorney|conflict/);
  });
});

describe("Phase 5 · output mappings", () => {
  it("templates include captured-field destination mappings", () => {
    const g = buildGenericIntakeTemplate();
    expect(g.mappings.length).toBeGreaterThan(0);
    for (const m of g.mappings) {
      expect(m.sourceKey).toBeTruthy();
      expect(m.destinationKey).toBeTruthy();
    }
  });
});
