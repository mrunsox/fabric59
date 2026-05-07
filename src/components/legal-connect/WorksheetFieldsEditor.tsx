import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ClipboardList, GripVertical } from "lucide-react";
import {
  useWorksheetFields,
  useUpsertWorksheetField,
  useDeleteWorksheetField,
  type WorksheetFieldDef,
} from "@/hooks/useWorksheets";

interface Props {
  clientId: string;
  campaignId?: string | null;
}

const FIELD_TYPES: WorksheetFieldDef["field_type"][] = [
  "text",
  "textarea",
  "number",
  "date",
  "phone",
  "email",
  "select",
  "boolean",
];

const PRESETS = [
  { field_key: "case_type", label: "Case Type", category: "Intake" },
  { field_key: "incident_date", label: "Date of Incident", field_type: "date", category: "Intake" },
  { field_key: "county", label: "County / Jurisdiction", category: "Intake" },
  { field_key: "injury_type", label: "Injury Type", category: "Intake" },
  { field_key: "opposing_party", label: "Opposing Party", category: "Intake" },
  { field_key: "prior_attorney", label: "Prior Attorney", category: "Intake" },
  { field_key: "urgency", label: "Urgency", field_type: "select", category: "Triage" },
  { field_key: "referral_source_detail", label: "Referral Detail", category: "Marketing" },
];

const empty = {
  field_key: "",
  label: "",
  field_type: "text" as WorksheetFieldDef["field_type"],
  required: false,
  category: "",
  description: "",
  position: 0,
  is_active: true,
};

export default function WorksheetFieldsEditor({ clientId, campaignId = null }: Props) {
  const { data, isLoading } = useWorksheetFields(clientId, campaignId);
  const upsert = useUpsertWorksheetField();
  const remove = useDeleteWorksheetField();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);

  const save = () => {
    upsert.mutate(
      {
        ...form,
        client_id: clientId,
        campaign_id: campaignId,
        position: data?.length ?? 0,
      } as any,
      { onSuccess: () => { setOpen(false); setForm(empty); } },
    );
  };

  const seedPreset = (p: (typeof PRESETS)[number]) => {
    setForm({
      ...empty,
      field_key: p.field_key,
      label: p.label,
      field_type: (p.field_type as any) ?? "text",
      category: p.category ?? "",
    });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Worksheet fields
            </CardTitle>
            <CardDescription className="text-xs">
              Structured intake questions captured during ACW / post-call. These keys can be used
              as mapping sources (source = <code className="px-1 bg-muted rounded">worksheet</code>).
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add field
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (data?.length ?? 0) === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              No worksheet fields defined yet. Pick a preset or add a custom field.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <Button
                  key={p.field_key}
                  size="sm"
                  variant="outline"
                  className="text-[11px] h-7"
                  onClick={() => seedPreset(p)}
                >
                  + {p.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {data!.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2 rounded-md border border-border/60 p-2 text-xs"
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{f.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {f.field_key}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {f.field_type}
                    </Badge>
                    {f.required && (
                      <Badge variant="outline" className="text-[10px] border-warning/30 text-warning">
                        required
                      </Badge>
                    )}
                    {f.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {f.category}
                      </Badge>
                    )}
                  </div>
                  {f.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{f.description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => remove.mutate(f.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Worksheet field</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Date of Incident"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Field key</Label>
                <Input
                  value={form.field_key}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, field_key: e.target.value.replace(/\s+/g, "_") }))
                  }
                  placeholder="incident_date"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={form.field_type}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, field_type: v as any }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input
                    value={form.category ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="Intake"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What this field captures"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Required</Label>
                <Switch
                  checked={form.required}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, required: v }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                onClick={save}
                disabled={upsert.isPending || !form.label || !form.field_key}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
