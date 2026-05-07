import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PremiumTable } from "@/components/ui/premium-table";
import { Badge } from "@/components/ui/badge";
import { Plus, Variable, Trash2, Lightbulb } from "lucide-react";
import {
  useLegalCallVariableMappings,
  useCreateLegalCallVariableMapping,
  useDeleteLegalCallVariableMapping,
} from "@/hooks/useLegalConnect";
import { useWorksheetFields } from "@/hooks/useWorksheets";

interface Props { clientId?: string; campaignId?: string; }

type SourceLocation =
  | "five9_call_variable"
  | "five9_disposition_field"
  | "five9_connector_param"
  | "derived"
  | "constant"
  | "worksheet";

const SOURCE_OPTIONS: { value: SourceLocation; label: string; help: string }[] = [
  { value: "five9_call_variable", label: "Five9 call variable", help: "Value from a Five9 call variable" },
  { value: "five9_disposition_field", label: "Five9 disposition field", help: "Disposition or notes" },
  { value: "five9_connector_param", label: "Five9 connector param", help: "Connector input parameter" },
  { value: "derived", label: "Derived", help: "Computed at runtime (ANI, etc.)" },
  { value: "constant", label: "Constant (static value)", help: "A fixed string set by admin" },
  { value: "worksheet", label: "Worksheet field", help: "Captured during ACW / post-call" },
];

const GROW_FIELD_HINTS = [
  "from_first",
  "from_last",
  "from_email",
  "from_phone",
  "from_message",
  "referring_url",
  "from_source",
];

const defaultForm = {
  variable_name: "",
  source_location: "five9_call_variable" as SourceLocation,
  pass_through_mode: "allow",
  target_entity: "contact",
  provider_field_path: "",
  default_value: "",
  required: false,
  sensitive: false,
};

export default function CallVariableMappingEditor({ clientId, campaignId }: Props) {
  const { data, isLoading } = useLegalCallVariableMappings(clientId, campaignId);
  const create = useCreateLegalCallVariableMapping();
  const del = useDeleteLegalCallVariableMapping();
  const { data: worksheetFields } = useWorksheetFields(clientId, campaignId ?? null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const isConstant = form.source_location === "constant";
  const isWorksheet = form.source_location === "worksheet";

  const handleAdd = () => {
    const payload: Record<string, any> = {
      variable_name: form.variable_name,
      source_location: form.source_location,
      pass_through_mode: form.pass_through_mode,
      target_entity: form.target_entity,
      provider_field_path: form.provider_field_path || null,
      default_value: form.default_value || null,
      required: form.required,
      sensitive: form.sensitive,
      client_id: clientId,
      campaign_id: campaignId,
    };
    create.mutate(payload, {
      onSuccess: () => {
        setAddOpen(false);
        setForm(defaultForm);
      },
    });
  };

  const sourceColor = (s: string) =>
    s === "constant"
      ? "border-primary/40 text-primary"
      : s === "worksheet"
        ? "border-success/40 text-success"
        : "";

  const columns = [
    {
      key: "var",
      header: "Field / Key",
      render: (r: any) => (
        <div className="flex flex-col">
          <span className="font-mono text-sm text-foreground">{r.variable_name}</span>
          {r.source_location === "constant" && r.default_value && (
            <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[260px]">
              = "{r.default_value}"
            </span>
          )}
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (r: any) => (
        <Badge variant="outline" className={`text-xs ${sourceColor(r.source_location)}`}>
          {r.source_location}
        </Badge>
      ),
    },
    {
      key: "target",
      header: "Target Entity",
      render: (r: any) => <span className="text-muted-foreground capitalize">{r.target_entity ?? "—"}</span>,
    },
    {
      key: "path",
      header: "Provider Field",
      render: (r: any) => (
        <span className="font-mono text-xs text-muted-foreground">{r.provider_field_path || "—"}</span>
      ),
    },
    {
      key: "required",
      header: "Required",
      className: "w-24",
      render: (r: any) =>
        r.required ? (
          <Badge variant="outline" className="text-xs border-warning/30 text-warning">
            Yes
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">No</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (r: any) => (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={() => del.mutate(r.id)}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      ),
    },
  ];

  const worksheetKeys = useMemo(
    () => (worksheetFields ?? []).map((f) => ({ key: f.field_key, label: f.label })),
    [worksheetFields],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} variable mappings</p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Mapping
        </Button>
      </div>
      <PremiumTable
        columns={columns}
        data={data ?? []}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyIcon={Variable}
        emptyTitle="No Variable Mappings"
        emptyDescription="Map Five9 call variables, constants, or worksheet fields to provider fields."
      />
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select
                value={form.source_location}
                onValueChange={(v: SourceLocation) =>
                  setForm((f) => ({ ...f, source_location: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {SOURCE_OPTIONS.find((o) => o.value === form.source_location)?.help}
              </p>
            </div>

            {!isConstant && (
              <div className="space-y-1.5">
                <Label>{isWorksheet ? "Worksheet field key" : "Variable / Field name"}</Label>
                {isWorksheet && worksheetKeys.length > 0 ? (
                  <Select
                    value={form.variable_name}
                    onValueChange={(v) => setForm((f) => ({ ...f, variable_name: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose worksheet field" />
                    </SelectTrigger>
                    <SelectContent>
                      {worksheetKeys.map((w) => (
                        <SelectItem key={w.key} value={w.key}>
                          {w.label} <span className="text-muted-foreground">({w.key})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.variable_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, variable_name: e.target.value }))
                    }
                    placeholder={
                      isWorksheet ? "e.g. case_type" : "e.g. CallerPhone"
                    }
                  />
                )}
                {isWorksheet && worksheetKeys.length === 0 && (
                  <p className="text-[11px] text-warning">
                    No worksheet fields defined yet for this client.
                  </p>
                )}
              </div>
            )}

            {isConstant && (
              <>
                <div className="space-y-1.5">
                  <Label>Field name (logical key)</Label>
                  <Input
                    value={form.variable_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, variable_name: e.target.value }))
                    }
                    placeholder="e.g. lead_source_label"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Constant value</Label>
                  <Input
                    value={form.default_value}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, default_value: e.target.value }))
                    }
                    placeholder='e.g. "Fabric59 / Five9 Inbound"'
                  />
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                    <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" />
                    Constants always resolve to this value, regardless of runtime data.
                  </p>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>Provider field path</Label>
              <Input
                value={form.provider_field_path}
                onChange={(e) =>
                  setForm((f) => ({ ...f, provider_field_path: e.target.value }))
                }
                placeholder="e.g. from_first"
                list="grow-fields-hints"
              />
              <datalist id="grow-fields-hints">
                {GROW_FIELD_HINTS.map((h) => (
                  <option key={h} value={h} />
                ))}
              </datalist>
              <p className="text-[11px] text-muted-foreground">
                For Clio Grow, use one of: {GROW_FIELD_HINTS.join(", ")}.
              </p>
            </div>

            {!isConstant && (
              <div className="space-y-1.5">
                <Label>Default value (fallback)</Label>
                <Input
                  value={form.default_value}
                  onChange={(e) => setForm((f) => ({ ...f, default_value: e.target.value }))}
                  placeholder="Optional fallback if source is empty"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between">
                <Label>Required</Label>
                <Switch
                  checked={form.required}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, required: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Sensitive</Label>
                <Switch
                  checked={form.sensitive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, sensitive: v }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={
                create.isPending ||
                (!isConstant && !form.variable_name) ||
                (isConstant && (!form.variable_name || !form.default_value))
              }
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
