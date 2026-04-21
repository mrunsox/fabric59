import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TriggerStep } from "@/components/flows/TriggerStep";
import { FilterStep } from "@/components/flows/FilterStep";
import { MappingStep } from "@/components/flows/MappingStep";
import { ActionStep } from "@/components/flows/ActionStep";
import { FailureStep } from "@/components/flows/FailureStep";
import { FlowSummary } from "@/components/flows/FlowSummary";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface FlowDefinition {
  trigger: { type: string; [k: string]: unknown };
  filters: Array<{ field: string; op: string; value: string }>;
  mappings: Array<{ source: string; target: string; transform?: string }>;
  action: { connector: string; action: string; config: Record<string, unknown> } | null;
  failure: { retries: number; fallback?: string };
}

const STEPS = ["Trigger", "Filters", "Mapping", "Action", "Failure", "Summary"] as const;

export default function FlowBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("draft");
  const [definition, setDefinition] = useState<FlowDefinition>({
    trigger: { type: "call_end" }, filters: [], mappings: [], action: null, failure: { retries: 0 },
  });
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from("flows").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) {
        setName(data.name);
        setStatus(data.status);
        setDefinition(data.definition as unknown as FlowDefinition);
      }
      setLoading(false);
    });
  }, [id]);

  const save = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("flows").update({
      name, status, definition: definition as never, trigger_type: definition.trigger.type,
    }).eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Flow name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="text-2xl font-semibold mt-1 max-w-md" />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status === "active" ? "default" : "secondary"}>{status}</Badge>
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" />Save</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStepIdx(i)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${i === stepIdx ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-muted-foreground hover:bg-secondary"}`}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{STEPS[stepIdx]}</CardTitle></CardHeader>
        <CardContent>
          {stepIdx === 0 && <TriggerStep definition={definition} update={setDefinition} />}
          {stepIdx === 1 && <FilterStep definition={definition} update={setDefinition} />}
          {stepIdx === 2 && <MappingStep definition={definition} update={setDefinition} />}
          {stepIdx === 3 && <ActionStep definition={definition} update={setDefinition} />}
          {stepIdx === 4 && <FailureStep definition={definition} update={setDefinition} />}
          {stepIdx === 5 && <FlowSummary definition={definition} status={status} setStatus={setStatus} />}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStepIdx(Math.max(0, stepIdx - 1))} disabled={stepIdx === 0}>Back</Button>
        <Button onClick={() => stepIdx < STEPS.length - 1 ? setStepIdx(stepIdx + 1) : navigate("/admin/flows")}>
          {stepIdx < STEPS.length - 1 ? "Next" : "Done"}
        </Button>
      </div>
    </div>
  );
}
