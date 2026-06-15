/**
 * ExternalResourcesEditor — admin surface for `metadata.externalResources`.
 *
 * Three tabs:
 *   - Resources : structured editor for each resource (label, kind, URL,
 *                 open mode, tags, param injection toggle, notes template,
 *                 width preference, confirmation flag).
 *   - Rules     : structured rule builder (conditions + action) with the
 *                 same shape as TransferDirectoryEditor's rules tab.
 *   - Simulator : pick a mock context and see ranked resources with reasons,
 *                 resolved URLs, and matched rule ids.
 *
 * No textarea-only editing for the common cases — config stays inside the
 * typed model. Token allow-list is surfaced inline so admins know what works.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Sparkles, GitBranch, FlaskConical } from "lucide-react";
import {
  useExternalResourcesConfig,
  useUpdateExternalResourcesConfig,
} from "@/hooks/useExternalResourcesConfig";
import {
  generateResourceId,
  generateResourceRuleId,
  normalizeExternalResources,
} from "@/lib/external-resources/normalize";
import { evaluateResources } from "@/lib/external-resources/evaluateResources";
import { resolveLaunchMode } from "@/lib/external-resources/resolveLaunchMode";
import { SUPPORTED_TOKENS } from "@/lib/external-resources/resolveParams";
import type {
  ExternalResource,
  ExternalResourceRule,
  ExternalResourcesConfig,
  ResourceConditionOperator,
  ResourceContextFieldKey,
  ResourceEvaluationContext,
  ResourceKind,
  ResourceOpenMode,
  ResourceRuleAction,
  ResourceUrgency,
  ResourceWidth,
} from "@/lib/external-resources/types";

const KINDS: ResourceKind[] = ["calendar", "website", "document", "form", "portal", "custom"];
const OPEN_MODES: ResourceOpenMode[] = ["auto", "iframe", "drawer", "replace_center", "new_tab"];
const WIDTHS: ResourceWidth[] = ["sm", "md", "lg", "full"];
const URGENCIES: ResourceUrgency[] = ["low", "normal", "high", "critical"];
const FIELDS: ResourceContextFieldKey[] = [
  "issueType",
  "category",
  "specialty",
  "urgency",
  "stepId",
  "branch",
  "disposition",
  "transferGroup",
  "embedMode",
  "timeMode",
];
const OPS: ResourceConditionOperator[] = [
  "eq",
  "neq",
  "in",
  "nin",
  "contains",
  "gte",
  "lte",
  "exists",
  "missing",
];
const ACTION_KINDS: ResourceRuleAction["kind"][] = [
  "show",
  "hide",
  "prioritize",
  "suggest",
  "auto_open_if_safe",
  "annotate",
];

interface Props {
  campaignId: string;
}

export function ExternalResourcesEditor({ campaignId }: Props) {
  const { data, isLoading } = useExternalResourcesConfig(campaignId);
  const update = useUpdateExternalResourcesConfig(campaignId);
  const [draft, setDraft] = useState<ExternalResourcesConfig | null>(null);
  const config = draft ?? data ?? null;

  if (isLoading || !config) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">External resources</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  const dirty = draft !== null;
  const setConfig = (next: ExternalResourcesConfig) => setDraft(next);
  const save = async () => {
    if (!draft) return;
    await update.mutateAsync(normalizeExternalResources(draft));
    setDraft(null);
  };

  return (
    <Card data-testid="external-resources-editor">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> External resources
        </CardTitle>
        {dirty && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              Discard
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={update.isPending}
              data-testid="save-external-resources"
            >
              Save changes
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="resources">
          <TabsList>
            <TabsTrigger value="resources">Resources ({config.resources.length})</TabsTrigger>
            <TabsTrigger value="rules">
              <GitBranch className="h-3.5 w-3.5 mr-1.5" /> Rules ({config.rules.length})
            </TabsTrigger>
            <TabsTrigger value="simulator">
              <FlaskConical className="h-3.5 w-3.5 mr-1.5" /> Simulator
            </TabsTrigger>
          </TabsList>
          <TabsContent value="resources" className="space-y-3 pt-3">
            <ResourcesTab config={config} setConfig={setConfig} />
          </TabsContent>
          <TabsContent value="rules" className="space-y-3 pt-3">
            <RulesTab config={config} setConfig={setConfig} />
          </TabsContent>
          <TabsContent value="simulator" className="pt-3">
            <SimulatorTab config={config} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/* ------------------------- Resources tab ------------------------ */

function ResourcesTab({
  config,
  setConfig,
}: {
  config: ExternalResourcesConfig;
  setConfig: (n: ExternalResourcesConfig) => void;
}) {
  const add = () => {
    const r: ExternalResource = {
      id: generateResourceId(),
      label: "New resource",
      kind: "website",
      url: "https://",
      enabled: true,
      openMode: "auto",
      sortOrder: config.resources.length,
      tags: [],
      issueTags: [],
      specialtyTags: [],
      dispositionTags: [],
      urgencyTags: [],
      allowParamInjection: false,
    };
    setConfig({ ...config, resources: [...config.resources, r] });
  };
  const upd = (id: string, patch: Partial<ExternalResource>) =>
    setConfig({
      ...config,
      resources: config.resources.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  const rm = (id: string) =>
    setConfig({ ...config, resources: config.resources.filter((r) => r.id !== id) });

  return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" onClick={add} data-testid="add-resource-btn">
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add resource
      </Button>
      {config.resources.length === 0 && (
        <p className="text-xs text-muted-foreground">No resources yet.</p>
      )}
      {config.resources.map((r) => (
        <ResourceRow key={r.id} resource={r} onChange={(p) => upd(r.id, p)} onRemove={() => rm(r.id)} />
      ))}
    </div>
  );
}

function ResourceRow({
  resource,
  onChange,
  onRemove,
}: {
  resource: ExternalResource;
  onChange: (patch: Partial<ExternalResource>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border rounded-md p-3 space-y-3" data-resource-id={resource.id}>
      <div className="flex items-start justify-between gap-2">
        <Input
          value={resource.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="font-medium"
          data-testid="resource-label"
        />
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove resource">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase">URL</Label>
          <Input
            value={resource.url}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://example.com/path?x={{ani}}"
            data-testid="resource-url"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase">Description</Label>
          <Input
            value={resource.description ?? ""}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <Label className="text-[10px] uppercase">Kind</Label>
          <Select value={resource.kind} onValueChange={(v) => onChange({ kind: v as ResourceKind })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase">Open mode</Label>
          <Select
            value={resource.openMode}
            onValueChange={(v) => onChange({ openMode: v as ResourceOpenMode })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPEN_MODES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase">Width</Label>
          <Select
            value={resource.preferredWidth ?? "auto"}
            onValueChange={(v) =>
              onChange({ preferredWidth: v === "auto" ? undefined : (v as ResourceWidth) })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">auto</SelectItem>
              {WIDTHS.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-1.5 text-xs">
            <Switch checked={resource.enabled} onCheckedChange={(v) => onChange({ enabled: v })} />
            Enabled
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <Switch
              checked={!!resource.requiresConfirmation}
              onCheckedChange={(v) =>
                onChange({ requiresConfirmation: v ? true : undefined })
              }
            />
            Confirm
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <TagsField
          label="Tags"
          value={resource.tags}
          onChange={(v) => onChange({ tags: v })}
        />
        <TagsField
          label="Issue tags"
          value={resource.issueTags}
          onChange={(v) => onChange({ issueTags: v })}
        />
        <TagsField
          label="Urgency tags"
          value={resource.urgencyTags}
          onChange={(v) => onChange({ urgencyTags: v as ResourceUrgency[] })}
          options={URGENCIES}
        />
      </div>

      <div className="space-y-2 rounded-md border border-dashed p-2">
        <label className="flex items-center gap-2 text-xs">
          <Switch
            checked={resource.allowParamInjection}
            onCheckedChange={(v) =>
              onChange({ allowParamInjection: v, paramTemplate: v ? resource.paramTemplate ?? {} : undefined })
            }
          />
          Inject runtime values into the URL
        </label>
        {resource.allowParamInjection && (
          <ParamTemplateEditor
            value={resource.paramTemplate ?? {}}
            onChange={(t) => onChange({ paramTemplate: t })}
          />
        )}
      </div>

      <div>
        <Label className="text-[10px] uppercase">Notes template</Label>
        <Textarea
          rows={2}
          value={resource.notesTemplate ?? ""}
          placeholder="Optional text appended to call notes when the agent uses Insert note."
          onChange={(e) => onChange({ notesTemplate: e.target.value })}
        />
      </div>
    </div>
  );
}

function ParamTemplateEditor({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const [k, setK] = useState("");
  const [v, setV] = useState("");
  const add = () => {
    if (!k.trim()) return;
    onChange({ ...value, [k.trim()]: v.trim() });
    setK("");
    setV("");
  };
  const rm = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };
  return (
    <div className="space-y-2" data-testid="param-template-editor">
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(value).map(([key, tpl]) => (
          <div key={key} className="flex items-center gap-1.5">
            <Input value={key} disabled className="font-mono text-xs flex-1" />
            <Input
              value={tpl}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              className="font-mono text-xs flex-[2]"
            />
            <Button variant="ghost" size="icon" onClick={() => rm(key)} aria-label="Remove">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          value={k}
          placeholder="param-key"
          onChange={(e) => setK(e.target.value)}
          className="font-mono text-xs"
        />
        <Input
          value={v}
          placeholder="{{ani}}"
          onChange={(e) => setV(e.target.value)}
          className="font-mono text-xs"
        />
        <Button size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <details className="text-[11px] text-muted-foreground">
        <summary className="cursor-pointer">Supported tokens</summary>
        <p className="mt-1">
          Use <code className="font-mono">{`{{token}}`}</code> with one of:{" "}
          {SUPPORTED_TOKENS.map((t) => (
            <code key={t} className="font-mono mx-0.5">
              {t}
            </code>
          ))}
          , or <code className="font-mono">{`{{field.<key>}}`}</code> for captured fields. Unknown
          tokens are dropped silently and values are URL-encoded.
        </p>
      </details>
    </div>
  );
}

function TagsField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  options?: readonly string[];
}) {
  const [input, setInput] = useState("");
  const add = (v: string) => {
    const t = v.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setInput("");
  };
  return (
    <div>
      <Label className="text-[10px] uppercase">{label}</Label>
      <div className="flex flex-wrap gap-1 mb-1">
        {value.map((v) => (
          <Badge key={v} variant="secondary" className="text-[10px]">
            {v}
            <button
              type="button"
              className="ml-1 text-muted-foreground"
              onClick={() => onChange(value.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </Badge>
        ))}
      </div>
      {options ? (
        <Select value="" onValueChange={(v) => add(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Add…" />
          </SelectTrigger>
          <SelectContent>
            {options
              .filter((o) => !value.includes(o))
              .map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={input}
          placeholder="Add and press Enter"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(input);
            }
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------- Rules tab --------------------------- */

function RulesTab({
  config,
  setConfig,
}: {
  config: ExternalResourcesConfig;
  setConfig: (n: ExternalResourcesConfig) => void;
}) {
  const add = () => {
    const r: ExternalResourceRule = {
      id: generateResourceRuleId(),
      name: "New rule",
      enabled: true,
      priority: 100,
      when: { combinator: "all", conditions: [] },
      then: { kind: "show", targetIds: "*" },
    };
    setConfig({ ...config, rules: [...config.rules, r] });
  };
  const upd = (id: string, patch: Partial<ExternalResourceRule>) =>
    setConfig({
      ...config,
      rules: config.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  const rm = (id: string) =>
    setConfig({ ...config, rules: config.rules.filter((r) => r.id !== id) });

  return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" onClick={add} data-testid="add-resource-rule-btn">
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add rule
      </Button>
      {config.rules.length === 0 && (
        <p className="text-xs text-muted-foreground">No rules yet.</p>
      )}
      {config.rules.map((r) => (
        <RuleRow
          key={r.id}
          rule={r}
          resources={config.resources}
          onChange={(p) => upd(r.id, p)}
          onRemove={() => rm(r.id)}
        />
      ))}
    </div>
  );
}

function RuleRow({
  rule,
  resources,
  onChange,
  onRemove,
}: {
  rule: ExternalResourceRule;
  resources: ExternalResource[];
  onChange: (p: Partial<ExternalResourceRule>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border rounded-md p-3 space-y-3" data-rule-id={rule.id}>
      <div className="flex items-start justify-between gap-2">
        <Input
          value={rule.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="font-medium"
        />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="w-20"
            value={rule.priority}
            onChange={(e) => onChange({ priority: Number(e.target.value) || 0 })}
            aria-label="Priority"
          />
          <Switch
            checked={rule.enabled}
            onCheckedChange={(v) => onChange({ enabled: v })}
            aria-label="Enabled"
          />
          <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove rule">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <ConditionGroupEditor
        group={rule.when}
        onChange={(g) => onChange({ when: g })}
      />
      <ActionEditor action={rule.then} resources={resources} onChange={(a) => onChange({ then: a })} />
    </div>
  );
}

function ConditionGroupEditor({
  group,
  onChange,
}: {
  group: ExternalResourceRule["when"];
  onChange: (g: ExternalResourceRule["when"]) => void;
}) {
  const addCondition = () =>
    onChange({
      ...group,
      conditions: [...group.conditions, { field: "issueType", op: "eq", value: "" }],
    });
  const updateCondition = (i: number, patch: Partial<{ field: ResourceContextFieldKey; key?: string; op: ResourceConditionOperator; value: string }>) => {
    const next = [...group.conditions];
    const cur = next[i];
    if ("conditions" in cur) return;
    next[i] = { ...cur, ...patch };
    onChange({ ...group, conditions: next });
  };
  const removeCondition = (i: number) => {
    const next = [...group.conditions];
    next.splice(i, 1);
    onChange({ ...group, conditions: next });
  };
  return (
    <div className="space-y-1.5 rounded-md border border-dashed p-2">
      <div className="flex items-center gap-2">
        <Label className="text-[10px] uppercase">Match</Label>
        <Select
          value={group.combinator}
          onValueChange={(v) => onChange({ ...group, combinator: v as "all" | "any" })}
        >
          <SelectTrigger className="h-7 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">all</SelectItem>
            <SelectItem value="any">any</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={addCondition}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Condition
        </Button>
      </div>
      {group.conditions.map((c, i) => {
        if ("conditions" in c) return null;
        return (
          <div key={i} className="flex items-center gap-1.5">
            <Select
              value={c.field}
              onValueChange={(v) => updateCondition(i, { field: v as ResourceContextFieldKey })}
            >
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELDS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={c.op}
              onValueChange={(v) => updateCondition(i, { op: v as ResourceConditionOperator })}
            >
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-7 text-xs flex-1"
              value={typeof c.value === "string" ? c.value : ""}
              onChange={(e) => updateCondition(i, { value: e.target.value })}
              placeholder="value"
            />
            <Button size="icon" variant="ghost" onClick={() => removeCondition(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function ActionEditor({
  action,
  resources,
  onChange,
}: {
  action: ResourceRuleAction;
  resources: ExternalResource[];
  onChange: (a: ResourceRuleAction) => void;
}) {
  const setKind = (kind: ResourceRuleAction["kind"]) => {
    switch (kind) {
      case "show":
      case "hide":
        onChange({ kind, targetIds: "*" });
        break;
      case "prioritize":
        onChange({ kind, targetIds: [], boost: 10 });
        break;
      case "suggest":
        onChange({ kind, targetIds: [], message: "" });
        break;
      case "auto_open_if_safe":
        onChange({ kind, targetId: resources[0]?.id ?? "" });
        break;
      case "annotate":
        onChange({ kind, targetIds: "*", rationale: "" });
        break;
    }
  };
  return (
    <div className="space-y-1.5 rounded-md border p-2">
      <div className="flex items-center gap-2">
        <Label className="text-[10px] uppercase">Then</Label>
        <Select value={action.kind} onValueChange={(v) => setKind(v as ResourceRuleAction["kind"])}>
          <SelectTrigger className="h-7 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {k.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {(action.kind === "prioritize" || action.kind === "suggest") && (
        <TargetMultiSelect
          value={action.targetIds}
          onChange={(ids) => onChange({ ...action, targetIds: ids } as ResourceRuleAction)}
          resources={resources}
        />
      )}
      {action.kind === "auto_open_if_safe" && (
        <Select
          value={action.targetId}
          onValueChange={(v) => onChange({ kind: "auto_open_if_safe", targetId: v })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Pick a resource" />
          </SelectTrigger>
          <SelectContent>
            {resources.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {action.kind === "suggest" && (
        <Input
          placeholder="Suggestion message"
          value={action.message ?? ""}
          onChange={(e) => onChange({ ...action, message: e.target.value })}
        />
      )}
      {action.kind === "annotate" && (
        <Input
          placeholder="Rationale shown as a chip"
          value={action.rationale}
          onChange={(e) => onChange({ ...action, rationale: e.target.value })}
        />
      )}
      {action.kind === "prioritize" && (
        <div className="flex items-center gap-1.5">
          <Label className="text-[10px] uppercase">Boost</Label>
          <Input
            type="number"
            className="h-7 w-20"
            value={action.boost ?? 10}
            onChange={(e) => onChange({ ...action, boost: Number(e.target.value) || 0 })}
          />
        </div>
      )}
    </div>
  );
}

function TargetMultiSelect({
  value,
  onChange,
  resources,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  resources: ExternalResource[];
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {resources.map((r) => {
        const on = value.includes(r.id);
        return (
          <Badge
            key={r.id}
            variant={on ? "default" : "outline"}
            className="cursor-pointer text-[10px]"
            onClick={() =>
              onChange(on ? value.filter((x) => x !== r.id) : [...value, r.id])
            }
          >
            {r.label}
          </Badge>
        );
      })}
    </div>
  );
}

/* ---------------------------- Simulator --------------------------- */

function SimulatorTab({ config }: { config: ExternalResourcesConfig }) {
  const [ctx, setCtx] = useState<ResourceEvaluationContext>({
    issueType: "",
    urgency: "normal",
    embedMode: "internal",
    capturedFields: {},
  });
  const result = useMemo(() => evaluateResources(config, ctx), [config, ctx]);
  return (
    <div className="grid gap-3 md:grid-cols-2" data-testid="external-resources-simulator">
      <div className="space-y-2 border rounded-md p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Context</p>
        <ContextField label="issueType" value={ctx.issueType ?? ""} onChange={(v) => setCtx({ ...ctx, issueType: v })} />
        <ContextField label="branch" value={ctx.branch ?? ""} onChange={(v) => setCtx({ ...ctx, branch: v })} />
        <ContextField label="disposition" value={ctx.disposition ?? ""} onChange={(v) => setCtx({ ...ctx, disposition: v })} />
        <ContextField label="stepId" value={ctx.stepId ?? ""} onChange={(v) => setCtx({ ...ctx, stepId: v })} />
        <div>
          <Label className="text-[10px] uppercase">urgency</Label>
          <Select
            value={ctx.urgency ?? "normal"}
            onValueChange={(v) => setCtx({ ...ctx, urgency: v as ResourceUrgency })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {URGENCIES.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase">embedMode</Label>
          <Select
            value={ctx.embedMode ?? "internal"}
            onValueChange={(v) =>
              setCtx({ ...ctx, embedMode: v as ResourceEvaluationContext["embedMode"] })
            }
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">internal</SelectItem>
              <SelectItem value="embed">embed</SelectItem>
              <SelectItem value="preview">preview</SelectItem>
              <SelectItem value="kiosk">kiosk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2 border rounded-md p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Result</p>
        <SimulatorBucket label="Recommended" items={result.recommended} ctx={ctx} />
        <SimulatorBucket label="Available" items={result.available} ctx={ctx} />
        <SimulatorBucket label="Hidden" items={result.hidden} ctx={ctx} muted />
        {result.autoOpenCandidate && (
          <p className="text-[11px]">
            Auto-open candidate:{" "}
            <span className="font-medium">{result.autoOpenCandidate.resource.label}</span>
          </p>
        )}
        <details className="text-[11px] text-muted-foreground">
          <summary>Matched rules ({result.matchedRuleIds.length})</summary>
          <pre className="font-mono whitespace-pre-wrap">{result.matchedRuleIds.join(", ") || "(none)"}</pre>
        </details>
      </div>
    </div>
  );
}

function SimulatorBucket({
  label,
  items,
  ctx,
  muted,
}: {
  label: string;
  items: ReturnType<typeof evaluateResources>["recommended"];
  ctx: ResourceEvaluationContext;
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={`text-[10px] uppercase tracking-wide ${muted ? "text-muted-foreground" : ""}`}>
        {label}
      </p>
      <ul className="space-y-0.5">
        {items.map((it) => {
          const r = resolveLaunchMode({ resource: it.resource, context: ctx });
          return (
            <li key={it.resource.id} className="text-xs">
              <span className="font-medium">{it.resource.label}</span>{" "}
              <span className="text-muted-foreground">→ {r.mode}</span>
              {it.reasons[0] && (
                <span className="text-muted-foreground"> · {it.reasons[0]}</span>
              )}
              <div className="font-mono text-[10px] text-muted-foreground truncate">{r.resolvedUrl}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ContextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-[10px] uppercase">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-7 text-xs" />
    </div>
  );
}
