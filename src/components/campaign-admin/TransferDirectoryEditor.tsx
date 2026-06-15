/**
 * Transfer directory editor — entries + rules + simulator on one surface.
 *
 * Designed to be embedded inside the canonical campaign detail page. Reads
 * and writes go through useTransferDirectoryConfig / useUpdate...
 *
 * Editor philosophy: structured, declarative, deterministic. Avoid raw JSON
 * editing for the common cases (entries, simple rules) so configuration stays
 * within the typed model.
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Trash2, Phone, GitBranch, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import {
  useTransferDirectoryConfig,
  useUpdateTransferDirectoryConfig,
} from "@/hooks/useTransferDirectoryConfig";
import {
  generateEntryId,
  generateRuleId,
  normalizeTransferDirectory,
} from "@/lib/transfer-directory/normalize";
import { evaluateTransferRules } from "@/lib/transfer-directory/evaluateRules";
import type {
  ConditionOperator,
  ContextFieldKey,
  HoursBehavior,
  RuleAction,
  TransferDirectoryConfig,
  TransferEntry,
  TransferRule,
  TransferType,
  Urgency,
} from "@/lib/transfer-directory/types";
import { TransferDirectoryPanel } from "@/components/transfer-directory/TransferDirectoryPanel";

const TRANSFER_TYPES: TransferType[] = ["warm", "cold", "conference", "instructions_only"];
const HOURS_OPTIONS: HoursBehavior[] = ["always", "business_hours", "after_hours"];
const URGENCIES: Urgency[] = ["low", "normal", "high", "critical"];
const FIELDS: ContextFieldKey[] = [
  "issueType",
  "category",
  "specialty",
  "urgency",
  "stepId",
  "branch",
  "disposition",
  "timeMode",
  "transferGroup",
];
const OPS: ConditionOperator[] = [
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

interface Props {
  campaignId: string;
}

export function TransferDirectoryEditor({ campaignId }: Props) {
  const { data, isLoading } = useTransferDirectoryConfig(campaignId);
  const update = useUpdateTransferDirectoryConfig(campaignId);
  const [draft, setDraft] = useState<TransferDirectoryConfig | null>(null);

  const config = draft ?? data ?? null;

  if (isLoading || !config) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Transfer directory</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  const setConfig = (next: TransferDirectoryConfig) => setDraft(next);
  const dirty = draft !== null;

  const save = async () => {
    if (!draft) return;
    await update.mutateAsync(normalizeTransferDirectory(draft));
    setDraft(null);
  };

  return (
    <Card data-testid="transfer-directory-editor">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" /> Transfer directory
        </CardTitle>
        <div className="flex items-center gap-2">
          {dirty && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDraft(null)}
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={save}
                disabled={update.isPending}
                data-testid="save-transfer-config"
              >
                Save changes
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="entries">
          <TabsList>
            <TabsTrigger value="entries">Entries ({config.entries.length})</TabsTrigger>
            <TabsTrigger value="rules">
              <GitBranch className="h-3.5 w-3.5 mr-1.5" /> Rules ({config.rules.length})
            </TabsTrigger>
            <TabsTrigger value="simulator">
              <FlaskConical className="h-3.5 w-3.5 mr-1.5" /> Simulator
            </TabsTrigger>
          </TabsList>
          <TabsContent value="entries" className="space-y-3 pt-3">
            <EntriesEditor config={config} setConfig={setConfig} />
          </TabsContent>
          <TabsContent value="rules" className="space-y-3 pt-3">
            <RulesEditor config={config} setConfig={setConfig} />
          </TabsContent>
          <TabsContent value="simulator" className="pt-3">
            <Simulator config={config} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function EntriesEditor({
  config,
  setConfig,
}: {
  config: TransferDirectoryConfig;
  setConfig: (n: TransferDirectoryConfig) => void;
}) {
  const addEntry = () => {
    const newEntry: TransferEntry = {
      id: generateEntryId(),
      displayName: "New transfer target",
      transferType: "warm",
      enabled: true,
      fallback: false,
      escalationLevel: 0,
      issueTags: [],
      specialtyTags: [],
      urgencyTags: [],
      hours: "always",
      sortOrder: config.entries.length,
    };
    setConfig({ ...config, entries: [...config.entries, newEntry] });
  };
  const update = (id: string, patch: Partial<TransferEntry>) =>
    setConfig({
      ...config,
      entries: config.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  const remove = (id: string) =>
    setConfig({ ...config, entries: config.entries.filter((e) => e.id !== id) });

  return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" onClick={addEntry} data-testid="add-entry-btn">
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add entry
      </Button>
      {config.entries.length === 0 && (
        <p className="text-xs text-muted-foreground">No transfer targets yet.</p>
      )}
      <div className="space-y-3">
        {config.entries.map((e) => (
          <div key={e.id} className="border rounded-md p-3 space-y-3" data-entry-id={e.id}>
            <div className="flex items-start justify-between gap-2">
              <Input
                value={e.displayName}
                onChange={(ev) => update(e.id, { displayName: ev.target.value })}
                className="font-medium"
                data-testid="entry-name"
              />
              <Button variant="ghost" size="icon" onClick={() => remove(e.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] uppercase">Team</Label>
                <Input
                  value={e.team ?? ""}
                  onChange={(ev) => update(e.id, { team: ev.target.value })}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase">Role</Label>
                <Input
                  value={e.role ?? ""}
                  onChange={(ev) => update(e.id, { role: ev.target.value })}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase">Phone</Label>
                <Input
                  value={e.phoneNumber ?? ""}
                  onChange={(ev) => update(e.id, { phoneNumber: ev.target.value })}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase">Extension</Label>
                <Input
                  value={e.extension ?? ""}
                  onChange={(ev) => update(e.id, { extension: ev.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <Label className="text-[10px] uppercase">Transfer type</Label>
                <Select
                  value={e.transferType}
                  onValueChange={(v) => update(e.id, { transferType: v as TransferType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSFER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase">Hours</Label>
                <Select
                  value={e.hours}
                  onValueChange={(v) => update(e.id, { hours: v as HoursBehavior })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS_OPTIONS.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase">Escalation level</Label>
                <Select
                  value={String(e.escalationLevel)}
                  onValueChange={(v) =>
                    update(e.id, {
                      escalationLevel: Number(v) as TransferEntry["escalationLevel"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n === 0 ? "None" : `Tier ${n}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-1.5 text-xs">
                  <Switch
                    checked={e.enabled}
                    onCheckedChange={(v) => update(e.id, { enabled: v })}
                  />
                  Enabled
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <Switch
                    checked={e.fallback}
                    onCheckedChange={(v) => update(e.id, { fallback: v })}
                  />
                  Fallback
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <TagsField
                label="Issue tags"
                value={e.issueTags}
                onChange={(v) => update(e.id, { issueTags: v })}
              />
              <TagsField
                label="Specialty tags"
                value={e.specialtyTags}
                onChange={(v) => update(e.id, { specialtyTags: v })}
              />
              <TagsField
                label="Urgency tags"
                value={e.urgencyTags}
                onChange={(v) => update(e.id, { urgencyTags: v as Urgency[] })}
                options={URGENCIES}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase">Instructions</Label>
              <Textarea
                value={e.instructions ?? ""}
                rows={2}
                onChange={(ev) => update(e.id, { instructions: ev.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
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
          placeholder="Add tag and press Enter"
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

function RulesEditor({
  config,
  setConfig,
}: {
  config: TransferDirectoryConfig;
  setConfig: (n: TransferDirectoryConfig) => void;
}) {
  const addRule = () => {
    const rule: TransferRule = {
      id: generateRuleId(),
      name: "New rule",
      enabled: true,
      priority: 100,
      when: { combinator: "all", conditions: [] },
      then: { kind: "include", targetIds: "*" },
    };
    setConfig({ ...config, rules: [...config.rules, rule] });
  };
  const update = (id: string, patch: Partial<TransferRule>) =>
    setConfig({
      ...config,
      rules: config.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  const remove = (id: string) =>
    setConfig({ ...config, rules: config.rules.filter((r) => r.id !== id) });

  return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" onClick={addRule} data-testid="add-rule-btn">
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add rule
      </Button>
      {config.rules.length === 0 && (
        <p className="text-xs text-muted-foreground">No rules yet.</p>
      )}
      {config.rules.map((r) => (
        <RuleEditor
          key={r.id}
          rule={r}
          entries={config.entries}
          onChange={(patch) => update(r.id, patch)}
          onRemove={() => remove(r.id)}
        />
      ))}
    </div>
  );
}

function RuleEditor({
  rule,
  entries,
  onChange,
  onRemove,
}: {
  rule: TransferRule;
  entries: TransferEntry[];
  onChange: (patch: Partial<TransferRule>) => void;
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
          <label className="flex items-center gap-1.5 text-xs">
            <Switch
              checked={rule.enabled}
              onCheckedChange={(v) => onChange({ enabled: v })}
            />
            Enabled
          </label>
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase">Priority</Label>
          <Input
            type="number"
            value={rule.priority}
            onChange={(e) => onChange({ priority: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase">When (combinator)</Label>
          <Select
            value={rule.when.combinator}
            onValueChange={(v) =>
              onChange({ when: { ...rule.when, combinator: v as "all" | "any" } })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All conditions match</SelectItem>
              <SelectItem value="any">Any condition matches</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] uppercase">Conditions</Label>
        {rule.when.conditions.map((c, idx) => {
          const cond = c as {
            field: ContextFieldKey;
            op: ConditionOperator;
            value?: string | number | boolean | string[];
          };
          const updateCond = (patch: Partial<typeof cond>) => {
            const next = [...rule.when.conditions];
            next[idx] = { ...cond, ...patch } as never;
            onChange({ when: { ...rule.when, conditions: next } });
          };
          const remove = () => {
            const next = rule.when.conditions.filter((_, i) => i !== idx);
            onChange({ when: { ...rule.when, conditions: next } });
          };
          return (
            <div key={idx} className="flex items-center gap-2">
              <Select
                value={cond.field}
                onValueChange={(v) => updateCond({ field: v as ContextFieldKey })}
              >
                <SelectTrigger className="w-[140px]">
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
                value={cond.op}
                onValueChange={(v) => updateCond({ op: v as ConditionOperator })}
              >
                <SelectTrigger className="w-[100px]">
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
              {!["exists", "missing"].includes(cond.op) && (
                <Input
                  className="flex-1"
                  value={String(cond.value ?? "")}
                  onChange={(e) => updateCond({ value: e.target.value })}
                  placeholder='Value (comma-separates "in"/"nin")'
                />
              )}
              <Button variant="ghost" size="icon" onClick={remove}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const next = [
              ...rule.when.conditions,
              { field: "issueType" as ContextFieldKey, op: "eq" as ConditionOperator, value: "" },
            ];
            onChange({ when: { ...rule.when, conditions: next } });
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add condition
        </Button>
      </div>
      <ActionEditor entries={entries} action={rule.then} onChange={(a) => onChange({ then: a })} />
    </div>
  );
}

function ActionEditor({
  entries,
  action,
  onChange,
}: {
  entries: TransferEntry[];
  action: RuleAction;
  onChange: (a: RuleAction) => void;
}) {
  return (
    <div className="space-y-2 border-t pt-2">
      <Label className="text-[10px] uppercase">Then</Label>
      <Select
        value={action.kind}
        onValueChange={(v) => {
          const kind = v as RuleAction["kind"];
          if (kind === "instructions_only") onChange({ kind, message: "" });
          else if (kind === "prioritize")
            onChange({ kind, targetIds: [], boost: 10 });
          else if (kind === "annotate")
            onChange({ kind, targetIds: "*", rationale: "" });
          else if (kind === "include" || kind === "exclude")
            onChange({ kind, targetIds: "*" });
          else onChange({ kind, targetIds: [] });
        }}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="include">Include targets</SelectItem>
          <SelectItem value="exclude">Exclude targets</SelectItem>
          <SelectItem value="prioritize">Prioritize targets</SelectItem>
          <SelectItem value="escalation_only">Mark escalation-only</SelectItem>
          <SelectItem value="fallback_only">Mark fallback-only</SelectItem>
          <SelectItem value="instructions_only">Suppress + show instructions</SelectItem>
          <SelectItem value="annotate">Annotate with rationale</SelectItem>
        </SelectContent>
      </Select>
      {action.kind === "instructions_only" ? (
        <Textarea
          value={action.message}
          onChange={(e) => onChange({ ...action, message: e.target.value })}
          placeholder="Instructions shown when transfer is blocked"
          rows={2}
        />
      ) : action.kind === "annotate" ? (
        <Input
          value={action.rationale}
          onChange={(e) => onChange({ ...action, rationale: e.target.value })}
          placeholder="Rationale shown to agents"
        />
      ) : (
        <TargetSelector
          entries={entries}
          allowWildcard={action.kind === "include" || action.kind === "exclude"}
          value={action.targetIds as string[] | "*"}
          onChange={(v) =>
            onChange({ ...action, targetIds: v } as RuleAction)
          }
        />
      )}
      {action.kind === "prioritize" && (
        <div>
          <Label className="text-[10px] uppercase">Boost</Label>
          <Input
            type="number"
            value={action.boost ?? 10}
            onChange={(e) =>
              onChange({ ...action, boost: Number(e.target.value) })
            }
          />
        </div>
      )}
    </div>
  );
}

function TargetSelector({
  entries,
  value,
  onChange,
  allowWildcard,
}: {
  entries: TransferEntry[];
  value: string[] | "*";
  onChange: (v: string[] | "*") => void;
  allowWildcard: boolean;
}) {
  const arr = value === "*" ? [] : value;
  const wildcardActive = value === "*";
  return (
    <div className="space-y-1.5">
      {allowWildcard && (
        <label className="flex items-center gap-1.5 text-xs">
          <Switch
            checked={wildcardActive}
            onCheckedChange={(v) => onChange(v ? "*" : [])}
          />
          All targets (wildcard)
        </label>
      )}
      {!wildcardActive && (
        <div className="space-y-1">
          {entries.length === 0 && (
            <p className="text-xs text-muted-foreground">Add entries first.</p>
          )}
          {entries.map((e) => (
            <label key={e.id} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={arr.includes(e.id)}
                onChange={(ev) => {
                  if (ev.target.checked) onChange([...arr, e.id]);
                  else onChange(arr.filter((x) => x !== e.id));
                }}
              />
              {e.displayName}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function Simulator({ config }: { config: TransferDirectoryConfig }) {
  const [ctx, setCtx] = useState<{
    issueType?: string;
    specialty?: string;
    urgency?: Urgency;
    timeMode?: HoursBehavior;
    branch?: string;
  }>({});
  const result = useMemo(
    () =>
      evaluateTransferRules(config, {
        issueType: ctx.issueType,
        specialty: ctx.specialty,
        urgency: ctx.urgency,
        timeMode: ctx.timeMode,
        branch: ctx.branch,
      }),
    [config, ctx],
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label className="text-[10px] uppercase">Issue type</Label>
        <Input
          value={ctx.issueType ?? ""}
          onChange={(e) => setCtx({ ...ctx, issueType: e.target.value })}
        />
        <Label className="text-[10px] uppercase">Specialty</Label>
        <Input
          value={ctx.specialty ?? ""}
          onChange={(e) => setCtx({ ...ctx, specialty: e.target.value })}
        />
        <Label className="text-[10px] uppercase">Urgency</Label>
        <Select
          value={ctx.urgency ?? ""}
          onValueChange={(v) => setCtx({ ...ctx, urgency: (v || undefined) as Urgency })}
        >
          <SelectTrigger>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {URGENCIES.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="text-[10px] uppercase">Time mode</Label>
        <Select
          value={ctx.timeMode ?? ""}
          onValueChange={(v) => setCtx({ ...ctx, timeMode: (v || undefined) as HoursBehavior })}
        >
          <SelectTrigger>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {HOURS_OPTIONS.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="text-[10px] uppercase">Branch</Label>
        <Input
          value={ctx.branch ?? ""}
          onChange={(e) => setCtx({ ...ctx, branch: e.target.value })}
        />
      </div>
      <div>
        <TransferDirectoryPanel result={result} compact />
      </div>
    </div>
  );
}

export { Simulator as TransferRuleSimulator };
