import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { newFlowId } from "@/lib/campaign-flow/schema";
import { RuleBuilder } from "./RuleBuilder";
import type {
  FlowFieldType,
  FlowOption,
  FlowStep,
  QuestionBranchConfig,
  InformationDisplayConfig,
  FieldCaptureConfig,
  OutcomeDispositionConfig,
  EscalationTriggerConfig,
  NotificationTriggerConfig,
  EndFlowConfig,
} from "@/types/campaign-flow";

const FIELD_TYPES: { value: FlowFieldType; label: string }[] = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "single_select", label: "Single select" },
  { value: "multi_select", label: "Multi select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "datetime", label: "Date / time" },
  { value: "numeric", label: "Numeric" },
  { value: "address", label: "Address" },
  { value: "disposition_selector", label: "Disposition selector" },
  { value: "urgency_selector", label: "Urgency selector" },
  { value: "notification_target", label: "Notification target" },
  { value: "ai_summary", label: "AI summary" },
  { value: "hidden", label: "Hidden / system" },
];

interface Props {
  step: FlowStep;
  allSteps: FlowStep[];
  onChange: (next: FlowStep) => void;
}

export function StepEditor({ step, allSteps, onChange }: Props) {
  const patch = (p: Partial<FlowStep>) => onChange({ ...step, ...p });
  const patchConfig = <T,>(c: Partial<T>) => patch({ config: { ...(step.config as T), ...c } as never });

  return (
    <div className="space-y-5" data-testid="step-editor">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Title</Label>
          <Input value={step.title} onChange={(e) => patch({ title: e.target.value })} aria-label="Step title" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Description (optional)</Label>
          <Input value={step.description ?? ""} onChange={(e) => patch({ description: e.target.value || undefined })}
            placeholder="Author notes / helper text" aria-label="Step description" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-muted/30 px-3 py-2">
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={step.enabled} onCheckedChange={(v) => patch({ enabled: v })} aria-label="Enabled" /> Enabled
        </label>
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={step.required} onCheckedChange={(v) => patch({ required: v })} aria-label="Required" /> Required
        </label>
        <Badge variant="outline" className="text-[10px]">{step.type}</Badge>
      </div>

      {step.type === "question_branch" && (
        <QuestionEditor cfg={step.config as QuestionBranchConfig} allSteps={allSteps}
          onChange={(c) => patchConfig<QuestionBranchConfig>(c)} />
      )}
      {step.type === "information_display" && (
        <InformationEditor cfg={step.config as InformationDisplayConfig}
          onChange={(c) => patchConfig<InformationDisplayConfig>(c)} />
      )}
      {step.type === "field_capture" && (
        <FieldCaptureEditor cfg={step.config as FieldCaptureConfig}
          onChange={(c) => patchConfig<FieldCaptureConfig>(c)} />
      )}
      {step.type === "outcome_disposition" && (
        <OutcomeEditor cfg={step.config as OutcomeDispositionConfig}
          onChange={(c) => patchConfig<OutcomeDispositionConfig>(c)} />
      )}
      {step.type === "escalation_trigger" && (
        <EscalationEditor cfg={step.config as EscalationTriggerConfig}
          onChange={(c) => patchConfig<EscalationTriggerConfig>(c)} />
      )}
      {step.type === "notification_trigger" && (
        <NotificationEditor cfg={step.config as NotificationTriggerConfig}
          onChange={(c) => patchConfig<NotificationTriggerConfig>(c)} />
      )}
      {step.type === "end_flow" && (
        <EndFlowEditor cfg={step.config as EndFlowConfig}
          onChange={(c) => patchConfig<EndFlowConfig>(c)} />
      )}

      <div className="space-y-1">
        <Label className="text-xs">Default next step (optional)</Label>
        <Select
          value={step.nextStepId ?? "__none__"}
          onValueChange={(v) => patch({ nextStepId: v === "__none__" ? null : v })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sequential (next in list)</SelectItem>
            {allSteps.filter((s) => s.id !== step.id).map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <RuleBuilder
        rules={step.rules}
        allSteps={allSteps}
        onChange={(rules) => patch({ rules })}
      />
    </div>
  );
}

function QuestionEditor({ cfg, allSteps, onChange }: { cfg: QuestionBranchConfig; allSteps: FlowStep[]; onChange: (c: Partial<QuestionBranchConfig>) => void }) {
  const options = cfg.options ?? [];
  const addOption = () => onChange({ options: [...options, { id: newFlowId("opt"), label: "New option", goto: null }] });
  const setOption = (id: string, p: Partial<FlowOption>) =>
    onChange({ options: options.map((o) => (o.id === id ? { ...o, ...p } : o)) });
  const removeOption = (id: string) => onChange({ options: options.filter((o) => o.id !== id) });
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Prompt</Label>
        <Textarea value={cfg.prompt ?? ""} rows={2} onChange={(e) => onChange({ prompt: e.target.value })} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Options</p>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addOption}>
            <Plus className="h-3 w-3 mr-1" /> Add option
          </Button>
        </div>
        {options.map((o) => (
          <div key={o.id} className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
            <Input className="h-8 text-sm" value={o.label} onChange={(e) => setOption(o.id, { label: e.target.value })} aria-label="Option label" />
            <Select value={o.goto ?? "__none__"} onValueChange={(v) => setOption(o.id, { goto: v === "__none__" ? null : v })}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Jump to…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— default next —</SelectItem>
                {allSteps.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
              aria-label="Delete option" onClick={() => removeOption(o.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function InformationEditor({ cfg, onChange }: { cfg: InformationDisplayConfig; onChange: (c: Partial<InformationDisplayConfig>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Body</Label>
        <Textarea value={cfg.body ?? ""} rows={4} onChange={(e) => onChange({ body: e.target.value })}
          placeholder="Instructions, disclaimer, or policy snippet…" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Acknowledgement text (optional)</Label>
        <Input value={cfg.acknowledgement ?? ""} onChange={(e) => onChange({ acknowledgement: e.target.value || undefined })}
          placeholder='e.g. "I understand"' />
      </div>
    </div>
  );
}

function FieldCaptureEditor({ cfg, onChange }: { cfg: FieldCaptureConfig; onChange: (c: Partial<FieldCaptureConfig>) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Field key</Label>
          <Input value={cfg.fieldKey ?? ""} onChange={(e) => onChange({ fieldKey: e.target.value })} placeholder="caller_phone" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Field type</Label>
          <Select value={cfg.fieldType ?? "short_text"} onValueChange={(v) => onChange({ fieldType: v as FlowFieldType })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Placeholder</Label>
          <Input value={cfg.placeholder ?? ""} onChange={(e) => onChange({ placeholder: e.target.value || undefined })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Helper</Label>
          <Input value={cfg.helper ?? ""} onChange={(e) => onChange({ helper: e.target.value || undefined })} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Destination key</Label>
          <Input value={cfg.destinationKey ?? ""} onChange={(e) => onChange({ destinationKey: e.target.value || undefined })}
            placeholder="contact.phone" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Destination provider (optional)</Label>
          <Input value={cfg.destinationProvider ?? ""} onChange={(e) => onChange({ destinationProvider: e.target.value || undefined })}
            placeholder="clio / mycase / webhook" />
        </div>
      </div>
    </div>
  );
}

function OutcomeEditor({ cfg, onChange }: { cfg: OutcomeDispositionConfig; onChange: (c: Partial<OutcomeDispositionConfig>) => void }) {
  const outcomes = cfg.allowedOutcomes ?? [];
  const setOutcome = (i: number, p: Partial<(typeof outcomes)[number]>) =>
    onChange({ allowedOutcomes: outcomes.map((o, idx) => (idx === i ? { ...o, ...p } : o)) });
  const add = () => onChange({ allowedOutcomes: [...outcomes, { code: "new_code", label: "New outcome", urgency: "normal" }] });
  const remove = (i: number) => onChange({ allowedOutcomes: outcomes.filter((_, idx) => idx !== i) });
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Destination key</Label>
        <Input value={cfg.destinationKey ?? ""} onChange={(e) => onChange({ destinationKey: e.target.value || undefined })}
          placeholder="outcome.code" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Allowed outcomes</p>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={add}>
            <Plus className="h-3 w-3 mr-1" /> Add outcome
          </Button>
        </div>
        {outcomes.map((o, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_120px_32px] gap-2 items-center">
            <Input className="h-8 text-sm" placeholder="code" value={o.code} onChange={(e) => setOutcome(i, { code: e.target.value })} />
            <Input className="h-8 text-sm" placeholder="label" value={o.label} onChange={(e) => setOutcome(i, { label: e.target.value })} />
            <Select value={o.urgency ?? "normal"} onValueChange={(v) => setOutcome(i, { urgency: v as "low" | "normal" | "high" })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">low</SelectItem>
                <SelectItem value="normal">normal</SelectItem>
                <SelectItem value="high">high</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
              aria-label="Delete outcome" onClick={() => remove(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EscalationEditor({ cfg, onChange }: { cfg: EscalationTriggerConfig; onChange: (c: Partial<EscalationTriggerConfig>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Target role</Label>
        <Input value={cfg.targetRole ?? ""} onChange={(e) => onChange({ targetRole: e.target.value })}
          placeholder="on_call_supervisor" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Reason</Label>
        <Input value={cfg.reason ?? ""} onChange={(e) => onChange({ reason: e.target.value || undefined })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Textarea rows={2} value={cfg.notes ?? ""} onChange={(e) => onChange({ notes: e.target.value || undefined })} />
      </div>
    </div>
  );
}

function NotificationEditor({ cfg, onChange }: { cfg: NotificationTriggerConfig; onChange: (c: Partial<NotificationTriggerConfig>) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Channel</Label>
          <Select value={cfg.channel ?? "email"} onValueChange={(v) => onChange({ channel: v as NotificationTriggerConfig["channel"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="slack">Slack</SelectItem>
              <SelectItem value="webhook">Webhook</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Target</Label>
          <Input value={cfg.target ?? ""} onChange={(e) => onChange({ target: e.target.value })}
            placeholder="address / channel / url" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Payload summary</Label>
        <Textarea
          rows={2}
          value={typeof cfg.payloadSummary === "string" ? cfg.payloadSummary : JSON.stringify(cfg.payloadSummary ?? "", null, 2)}
          onChange={(e) => onChange({ payloadSummary: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}

function EndFlowEditor({ cfg, onChange }: { cfg: EndFlowConfig; onChange: (c: Partial<EndFlowConfig>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Completion label</Label>
        <Input value={cfg.label ?? ""} onChange={(e) => onChange({ label: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Next-state summary</Label>
        <Textarea rows={2} value={cfg.nextStateSummary ?? ""} onChange={(e) => onChange({ nextStateSummary: e.target.value || undefined })} />
      </div>
    </div>
  );
}
