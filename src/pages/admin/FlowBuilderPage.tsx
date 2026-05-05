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
import { TestStep } from "@/components/flows/TestStep";
import { FlowSummary } from "@/components/flows/FlowSummary";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getTemplateByKeySync, type FlowDefinition, type FlowTemplate } from "@/lib/flow-templates/adapter";

// Re-export for legacy imports
export type { FlowDefinition };

const STEPS = ["Trigger", "Filters", "Mapping", "Action", "Failure", "Test", "Review"] as const;

const EMPTY_DEF: FlowDefinition = {
  trigger: { type: "call_end" },
  filters: [],
  mappings: [],
  action: null,
  failure: { retries: 0 },
};

export default function FlowBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("draft");
  const [definition, setDefinition] = useState<FlowDefinition>(EMPTY_DEF);
  const [template, setTemplate] = useState<FlowTemplate | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    supabase.from("flows").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) {
        setName(data.name);
        setStatus(data.status);
        setDefinition((data.definition ?? EMPTY_DEF) as unknown as FlowDefinition);
        setTemplate(getTemplateByKeySync(data.template_type));
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
          {template && <p className="text-xs text-muted-foreground mt-1">Template: {template.name}</p>}
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
          {stepIdx === 0 && <TriggerStep definition={definition} update={setDefinition} template={template} />}
          {stepIdx === 1 && <FilterStep definition={definition} update={setDefinition} template={template} />}
          {stepIdx === 2 && <MappingStep definition={definition} update={setDefinition} />}
          {stepIdx === 3 && <ActionStep definition={definition} update={setDefinition} template={template} />}
          {stepIdx === 4 && <FailureStep definition={definition} update={setDefinition} />}
          {stepIdx === 5 && id && <TestStep flowId={id} definition={definition} />}
          {stepIdx === 6 && <FlowSummary definition={definition} status={status} setStatus={setStatus} template={template} />}
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
