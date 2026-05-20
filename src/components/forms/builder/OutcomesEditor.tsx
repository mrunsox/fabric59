import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, X } from "lucide-react";
import { useDispositions } from "@/hooks/useDispositions";
import type { FormSchemaV1, OutcomeRef } from "@/types/form-schema";

interface OutcomesEditorProps {
  schema: FormSchemaV1;
  onChange: (next: FormSchemaV1) => void;
}

const NONE = "__none__";

/**
 * Outcomes tab. CRUD on schema.outcomes (OutcomeRef[]). Each outcome carries
 * a slug `key`, agent-facing `label`, optional `description`, a
 * canonical `dispositionKey` chosen from workspace dispositions, and a chip
 * list of `notificationEmails` that the runtime fires on completion.
 */
export function OutcomesEditor({ schema, onChange }: OutcomesEditorProps) {
  const { data: dispositions = [] } = useDispositions();
  const update = (outcomes: OutcomeRef[]) => onChange({ ...schema, outcomes });

  const addOutcome = () => {
    const n = schema.outcomes.length + 1;
    update([
      ...schema.outcomes,
      { key: `outcome_${n}`, label: `Outcome ${n}`, notificationEmails: [] },
    ]);
  };

  const patch = (idx: number, p: Partial<OutcomeRef>) => {
    const next = [...schema.outcomes];
    next[idx] = { ...next[idx], ...p };
    update(next);
  };

  const remove = (idx: number) => update(schema.outcomes.filter((_, i) => i !== idx));

  const keyDuplicates = new Set(
    schema.outcomes
      .map((o) => o.key)
      .filter((k, i, arr) => arr.indexOf(k) !== i),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Outcomes are the terminal states a call can reach. Logic rules end with an outcome
            and (optionally) fire its notification emails.
          </p>
        </div>
        <Button size="sm" onClick={addOutcome} data-testid="add-outcome">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add outcome
        </Button>
      </div>

      {schema.outcomes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 p-8 text-sm text-center text-muted-foreground">
          No outcomes yet.
        </div>
      ) : (
        schema.outcomes.map((o, idx) => (
          <Card key={idx} data-testid={`outcome-${idx}`}>
            <CardContent className="pt-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Key
                  </label>
                  <Input
                    value={o.key}
                    onChange={(e) =>
                      patch(idx, {
                        key: e.target.value.replace(/\s+/g, "_").toLowerCase(),
                      })
                    }
                    data-testid={`outcome-key-${idx}`}
                  />
                  {keyDuplicates.has(o.key) && (
                    <p className="text-xs text-destructive">Duplicate key.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Label
                  </label>
                  <Input
                    value={o.label}
                    onChange={(e) => patch(idx, { label: e.target.value })}
                    data-testid={`outcome-label-${idx}`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Agent guidance
                </label>
                <Textarea
                  value={o.description ?? ""}
                  onChange={(e) => patch(idx, { description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Canonical disposition
                  </label>
                  <Select
                    value={o.dispositionKey ?? NONE}
                    onValueChange={(v) =>
                      patch(idx, { dispositionKey: v === NONE ? undefined : v })
                    }
                  >
                    <SelectTrigger data-testid={`outcome-disposition-${idx}`}>
                      <SelectValue placeholder="Select disposition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— None —</SelectItem>
                      {dispositions.map((d) => (
                        <SelectItem key={d.id} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Notification emails
                  </label>
                  <EmailChips
                    value={o.notificationEmails ?? []}
                    onChange={(emails) => patch(idx, { notificationEmails: emails })}
                    testId={`outcome-emails-${idx}`}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive/70 hover:text-destructive"
                  onClick={() => remove(idx)}
                  data-testid={`remove-outcome-${idx}`}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function EmailChips({
  value,
  onChange,
  testId,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  testId?: string;
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const t = draft.trim();
    if (!t) return;
    if (value.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {value.map((email) => (
          <Badge key={email} variant="secondary" className="gap-1">
            {email}
            <button
              type="button"
              aria-label={`Remove ${email}`}
              onClick={() => onChange(value.filter((e) => e !== email))}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder="name@company.com, press Enter"
        data-testid={testId}
      />
    </div>
  );
}

export default OutcomesEditor;
