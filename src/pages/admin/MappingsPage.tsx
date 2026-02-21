import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTenants } from "@/hooks/useTenants";
import { useDomains } from "@/hooks/useDomains";
import { useFieldMappings, useDeleteFieldMapping } from "@/hooks/useFieldMappings";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Save, RotateCcw, Copy, FileJson, ArrowRight, Workflow, Trash2, Edit, Download, Upload, ChevronDown, Phone, Headphones, PhoneOff, Play, FlaskConical } from "lucide-react";

const defaultMappings = {
  clio: {
    contact: {
      "unified.name": "Contact.name",
      "unified.phone": "Contact.phone_numbers[0].number",
      "unified.email": "Contact.email_addresses[0].address",
    },
    matter: {
      "unified.intake.type": "Matter.practice_area.name",
      "unified.intake.urgency": "Matter.custom_field_values.priority",
      "unified.intake.notes": "Matter.description",
    },
  },
  workiz: {
    contact: {
      "unified.name": "Client.name",
      "unified.phone": "Client.phone",
      "unified.email": "Client.email",
    },
    job: {
      "unified.intake.service": "Job.service_type",
      "unified.intake.urgency": "Job.priority",
      "unified.intake.custom.gate_code": "Job.custom_fields.gate_code",
      "unified.intake.notes": "Job.notes",
    },
  },
  salesforce: {
    contact: {
      "unified.name": "Lead.Name",
      "unified.phone": "Lead.Phone",
      "unified.email": "Lead.Email",
    },
    lead: {
      "unified.intake.type": "Lead.LeadSource",
      "unified.intake.urgency": "Lead.Priority",
      "unified.intake.notes": "Lead.Description",
    },
  },
};

const preCallLookupFields = [
  { key: "phone", label: "Phone Number", enabled: true },
  { key: "email", label: "Email Address", enabled: true },
  { key: "case_id", label: "Case / Matter ID", enabled: false },
  { key: "account_number", label: "Account Number", enabled: false },
];

const screenPopFields = [
  { key: "name", label: "Contact Name", enabled: true },
  { key: "phone", label: "Phone", enabled: true },
  { key: "email", label: "Email", enabled: true },
  { key: "crm_id", label: "CRM Record ID", enabled: true },
  { key: "open_matters", label: "Open Matters / Jobs", enabled: false },
  { key: "last_interaction", label: "Last Interaction", enabled: false },
];

const duringCallVariables = [
  { five9Var: "Call.DNIS", unified: "call.dnis", enabled: true },
  { five9Var: "Call.ANI", unified: "call.ani", enabled: true },
  { five9Var: "Call.disposition", unified: "call.disposition", enabled: true },
  { five9Var: "Call.campaign_name", unified: "call.campaign", enabled: true },
  { five9Var: "Call.agent_name", unified: "call.agent", enabled: false },
  { five9Var: "Call.duration", unified: "call.duration_seconds", enabled: false },
  { five9Var: "Call.custom_1", unified: "call.notes", enabled: false },
];

export default function MappingsPage() {
  const navigate = useNavigate();
  const { data: tenants = [] } = useTenants();
  const { data: domains = [] } = useDomains();
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [mappings, setMappings] = useState<string>(
    JSON.stringify(defaultMappings.clio, null, 2)
  );
  const [isDirty, setIsDirty] = useState(false);
  const [callPhase, setCallPhase] = useState("post-call");
  const [validationInput, setValidationInput] = useState('{\n  "name": "John Doe",\n  "phone": "416-555-1234",\n  "email": "john@example.com"\n}');
  const [validationOutput, setValidationOutput] = useState<string | null>(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: visualMappings = [] } = useFieldMappings(selectedDomain || null);
  const deleteMapping = useDeleteFieldMapping();

  const selectedTenantData = tenants.find((t) => t.id === selectedTenant);

  const handleDomainChange = (domainId: string) => setSelectedDomain(domainId);

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenant(tenantId);
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      const defaultMapping =
        defaultMappings[tenant.crm_type as keyof typeof defaultMappings] ||
        defaultMappings.clio;
      setMappings(JSON.stringify(defaultMapping, null, 2));
      setIsDirty(false);
    }
  };

  const handleMappingsChange = (value: string) => {
    setMappings(value);
    setIsDirty(true);
  };

  const handleSave = () => {
    try {
      JSON.parse(mappings);
      toast.success("Field mappings saved successfully");
      setIsDirty(false);
    } catch {
      toast.error("Invalid JSON format");
    }
  };

  const handleReset = () => {
    if (selectedTenantData) {
      const defaultMapping =
        defaultMappings[selectedTenantData.crm_type as keyof typeof defaultMappings] ||
        defaultMappings.clio;
      setMappings(JSON.stringify(defaultMapping, null, 2));
      setIsDirty(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(mappings);
    toast.success("Copied to clipboard");
  };

  const handleExport = () => {
    const blob = new Blob([mappings], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mappings-${selectedTenantData?.name || "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Mappings exported");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        JSON.parse(content);
        setMappings(content);
        setIsDirty(true);
        toast.success("Mappings imported");
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLoadTemplate = (template: keyof typeof defaultMappings) => {
    setMappings(JSON.stringify(defaultMappings[template], null, 2));
    setIsDirty(true);
    toast.success(`Loaded ${template} template`);
  };

  const handleTestMapping = () => {
    try {
      const input = JSON.parse(validationInput);
      const mappingConfig = JSON.parse(mappings);
      const result: Record<string, Record<string, unknown>> = {};
      for (const [entity, fields] of Object.entries(mappingConfig as Record<string, Record<string, string>>)) {
        result[entity] = {};
        for (const [from, to] of Object.entries(fields)) {
          const keys = from.replace("unified.", "").split(".");
          let val: unknown = input;
          for (const k of keys) { val = (val as Record<string, unknown>)?.[k]; }
          if (val !== undefined) result[entity][to] = val;
        }
      }
      setValidationOutput(JSON.stringify(result, null, 2));
    } catch {
      setValidationOutput("Error: invalid JSON input or mapping config");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Field Mappings</h1>
          <p className="text-muted-foreground">
            Configure how data flows across each call phase
          </p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => navigate("/admin/mappings/builder")}>
            <Workflow className="mr-2 h-4 w-4" />
            Visual Builder
          </Button>
        </div>
      </div>

      {/* Call Phase Tabs */}
      <Tabs value={callPhase} onValueChange={setCallPhase}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pre-call" className="gap-2"><Phone className="h-4 w-4" />Pre-Call</TabsTrigger>
          <TabsTrigger value="during-call" className="gap-2"><Headphones className="h-4 w-4" />During Call</TabsTrigger>
          <TabsTrigger value="post-call" className="gap-2"><PhoneOff className="h-4 w-4" />Post-Call</TabsTrigger>
        </TabsList>

        {/* Pre-Call Tab */}
        <TabsContent value="pre-call" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Lookup Rules</CardTitle>
                <CardDescription>Fields used to search for existing contacts when a call arrives</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {preCallLookupFields.map((f) => (
                  <div key={f.key} className="flex items-center justify-between">
                    <Label className="text-sm">{f.label}</Label>
                    <Switch defaultChecked={f.enabled} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Screen Pop Fields</CardTitle>
                <CardDescription>CRM data pulled back and displayed to the agent on incoming call</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {screenPopFields.map((f) => (
                  <div key={f.key} className="flex items-center justify-between">
                    <Label className="text-sm">{f.label}</Label>
                    <Switch defaultChecked={f.enabled} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* During Call Tab */}
        <TabsContent value="during-call" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Call Variable Sync</CardTitle>
              <CardDescription>Map Five9 call variables to unified fields for real-time data capture</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Five9 Variable</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Unified Field</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Enabled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {duringCallVariables.map((v) => (
                      <tr key={v.five9Var} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{v.five9Var}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <code className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{v.unified}</code>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Switch defaultChecked={v.enabled} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Post-Call Tab (existing content) */}
        <TabsContent value="post-call" className="mt-6 space-y-6">
          {/* Templates */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Quick-start:</span>
            <Button variant="outline" size="sm" onClick={() => handleLoadTemplate("clio")}>Clio Legal Intake</Button>
            <Button variant="outline" size="sm" onClick={() => handleLoadTemplate("workiz")}>Workiz Job Dispatch</Button>
            <Button variant="outline" size="sm" onClick={() => handleLoadTemplate("salesforce")}>Salesforce Lead</Button>
          </div>

          {/* Visual Mappings Section */}
          {domains.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Workflow className="h-5 w-5 text-primary" />
                      Visual Field Mappings
                    </CardTitle>
                    <CardDescription>Drag-and-drop mappings created with the visual builder</CardDescription>
                  </div>
                  <Select value={selectedDomain} onValueChange={handleDomainChange}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select Five9 Domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((domain) => (
                        <SelectItem key={domain.id} value={domain.id}>{domain.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {!selectedDomain ? (
                  <div className="text-center py-8 text-muted-foreground">Select a Five9 domain to view visual mappings</div>
                ) : visualMappings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-3">No visual mappings created yet</p>
                    <Button variant="outline" onClick={() => navigate(`/admin/mappings/builder?domain=${selectedDomain}`)}>
                      <Workflow className="mr-2 h-4 w-4" />Create Visual Mapping
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visualMappings.map((mapping) => (
                      <div key={mapping.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <div>
                          <h4 className="font-medium">{mapping.name}</h4>
                          <p className="text-sm text-muted-foreground">{mapping.mappings.length} field mappings → {mapping.destination_type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge variant={mapping.is_active ? "active" : "inactive"} dot>{mapping.is_active ? "Active" : "Inactive"}</StatusBadge>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/mappings/builder/${mapping.id}`)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this mapping?")) deleteMapping.mutate(mapping.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Tenant Selection & Quick Reference */}
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Select Tenant</CardTitle></CardHeader>
                <CardContent>
                  <Select value={selectedTenant} onValueChange={handleTenantChange}>
                    <SelectTrigger><SelectValue placeholder="Choose a tenant" /></SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          <span className="flex items-center gap-2">
                            {tenant.name}
                            <StatusBadge variant={tenant.crm_type as "clio" | "workiz" | "other"}>{tenant.crm_type}</StatusBadge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Mapping Reference</CardTitle>
                  <CardDescription>Standard unified field names</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Contact Fields</p>
                    <div className="flex flex-wrap gap-1">
                      {["unified.name", "unified.phone", "unified.email"].map((f) => (
                        <code key={f} className="text-xs bg-muted px-1.5 py-0.5 rounded">{f}</code>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Intake Fields</p>
                    <div className="flex flex-wrap gap-1">
                      {["unified.intake.type", "unified.intake.service", "unified.intake.urgency", "unified.intake.notes"].map((f) => (
                        <code key={f} className="text-xs bg-muted px-1.5 py-0.5 rounded">{f}</code>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedTenantData && (
                <Card>
                  <CardHeader><CardTitle className="text-base">CRM Details</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <StatusBadge variant={selectedTenantData.crm_type as "clio" | "workiz"}>{selectedTenantData.crm_type}</StatusBadge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">API URL:</span>
                      <span className="font-mono text-xs truncate max-w-[120px]">
                        {selectedTenantData.crm_api_url ? new URL(selectedTenantData.crm_api_url).host : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <StatusBadge variant={selectedTenantData.status as "active"} dot>{selectedTenantData.status}</StatusBadge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* JSON Editor */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileJson className="h-5 w-5 text-primary" />
                      Field Mappings
                      {isDirty && <span className="text-xs text-warning">(unsaved)</span>}
                    </CardTitle>
                    <CardDescription>Map unified payload fields to CRM-specific field paths</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCopy}><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={handleReset} disabled={!selectedTenant}><RotateCcw className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTenant ? (
                  <>
                    <Tabs defaultValue="editor">
                      <TabsList>
                        <TabsTrigger value="editor">Editor</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                      </TabsList>
                      <TabsContent value="editor" className="mt-4">
                        <Textarea value={mappings} onChange={(e) => handleMappingsChange(e.target.value)} className="font-mono text-sm min-h-[400px]" placeholder="{}" />
                      </TabsContent>
                      <TabsContent value="preview" className="mt-4">
                        <div className="space-y-2">
                          {Object.entries(JSON.parse(mappings || "{}") as Record<string, Record<string, string>>).map(([entity, fields]) => (
                            <div key={entity} className="rounded-lg border p-4">
                              <h4 className="font-medium mb-3 capitalize">{entity}</h4>
                              <div className="space-y-2">
                                {Object.entries(fields).map(([from, to]) => (
                                  <div key={from} className="flex items-center gap-3 text-sm">
                                    <code className="bg-muted px-2 py-1 rounded text-xs">{from}</code>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    <code className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">{to}</code>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={handleReset}>Reset to Default</Button>
                      <Button onClick={handleSave} disabled={!isDirty}><Save className="mr-2 h-4 w-4" />Save Mappings</Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">Select a tenant to configure field mappings</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Validation Panel */}
          <Collapsible open={validationOpen} onOpenChange={setValidationOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FlaskConical className="h-5 w-5 text-primary" />
                      Mapping Validation
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${validationOpen ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Sample Input Payload</Label>
                      <Textarea value={validationInput} onChange={(e) => setValidationInput(e.target.value)} className="font-mono text-sm min-h-[150px]" />
                    </div>
                    <div className="space-y-2">
                      <Label>Transformed Output</Label>
                      <pre className="rounded-lg bg-muted p-4 text-xs font-mono overflow-auto min-h-[150px]">
                        {validationOutput || "Click 'Test Mapping' to see output"}
                      </pre>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button onClick={handleTestMapping} variant="outline" className="gap-2">
                      <Play className="h-4 w-4" />Test Mapping
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>
      </Tabs>
    </div>
  );
}
