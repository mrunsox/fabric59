import { useState } from "react";
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
import { toast } from "sonner";
import { Save, RotateCcw, Copy, FileJson, ArrowRight, Workflow, Trash2, Edit } from "lucide-react";

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
};

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

  // Fetch visual mappings for selected domain
  const { data: visualMappings = [] } = useFieldMappings(selectedDomain || null);
  const deleteMapping = useDeleteFieldMapping();

  const selectedTenantData = tenants.find((t) => t.id === selectedTenant);

  const handleDomainChange = (domainId: string) => {
    setSelectedDomain(domainId);
  };

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Field Mappings</h1>
          <p className="text-muted-foreground">
            Configure how unified fields map to CRM-specific fields
          </p>
        </div>
        <Button onClick={() => navigate("/admin/mappings/builder")}>
          <Workflow className="mr-2 h-4 w-4" />
          Visual Mapping Builder
        </Button>
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
                <CardDescription>
                  Drag-and-drop mappings created with the visual builder
                </CardDescription>
              </div>
              <Select value={selectedDomain} onValueChange={handleDomainChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Five9 Domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedDomain ? (
              <div className="text-center py-8 text-muted-foreground">
                Select a Five9 domain to view visual mappings
              </div>
            ) : visualMappings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-3">No visual mappings created yet</p>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/admin/mappings/builder?domain=${selectedDomain}`)}
                >
                  <Workflow className="mr-2 h-4 w-4" />
                  Create Visual Mapping
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {visualMappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium">{mapping.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {mapping.mappings.length} field mappings → {mapping.destination_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={mapping.is_active ? "active" : "inactive"} dot>
                        {mapping.is_active ? "Active" : "Inactive"}
                      </StatusBadge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/mappings/builder/${mapping.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Delete this mapping?")) {
                            deleteMapping.mutate(mapping.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
            <CardHeader>
              <CardTitle className="text-base">Select Tenant</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTenant} onValueChange={handleTenantChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      <span className="flex items-center gap-2">
                        {tenant.name}
                        <StatusBadge
                          variant={tenant.crm_type as "clio" | "workiz" | "other"}
                        >
                          {tenant.crm_type}
                        </StatusBadge>
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
              <CardDescription>
                Standard unified field names
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Contact Fields
                </p>
                <div className="flex flex-wrap gap-1">
                  {["unified.name", "unified.phone", "unified.email"].map((f) => (
                    <code
                      key={f}
                      className="text-xs bg-muted px-1.5 py-0.5 rounded"
                    >
                      {f}
                    </code>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Intake Fields
                </p>
                <div className="flex flex-wrap gap-1">
                  {[
                    "unified.intake.type",
                    "unified.intake.service",
                    "unified.intake.urgency",
                    "unified.intake.notes",
                  ].map((f) => (
                    <code
                      key={f}
                      className="text-xs bg-muted px-1.5 py-0.5 rounded"
                    >
                      {f}
                    </code>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedTenantData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">CRM Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <StatusBadge
                    variant={selectedTenantData.crm_type as "clio" | "workiz"}
                  >
                    {selectedTenantData.crm_type}
                  </StatusBadge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">API URL:</span>
                  <span className="font-mono text-xs truncate max-w-[120px]">
                    {selectedTenantData.crm_api_url
                      ? new URL(selectedTenantData.crm_api_url).host
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <StatusBadge variant={selectedTenantData.status as "active"} dot>
                    {selectedTenantData.status}
                  </StatusBadge>
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
                  {isDirty && (
                    <span className="text-xs text-warning">(unsaved)</span>
                  )}
                </CardTitle>
                <CardDescription>
                  Map unified payload fields to CRM-specific field paths
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={!selectedTenant}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
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
                    <Textarea
                      value={mappings}
                      onChange={(e) => handleMappingsChange(e.target.value)}
                      className="font-mono text-sm min-h-[400px]"
                      placeholder="{}"
                    />
                  </TabsContent>
                  <TabsContent value="preview" className="mt-4">
                    <div className="space-y-2">
                      {Object.entries(
                        JSON.parse(mappings || "{}") as Record<
                          string,
                          Record<string, string>
                        >
                      ).map(([entity, fields]) => (
                        <div key={entity} className="rounded-lg border p-4">
                          <h4 className="font-medium mb-3 capitalize">{entity}</h4>
                          <div className="space-y-2">
                            {Object.entries(fields).map(([from, to]) => (
                              <div
                                key={from}
                                className="flex items-center gap-3 text-sm"
                              >
                                <code className="bg-muted px-2 py-1 rounded text-xs">
                                  {from}
                                </code>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <code className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                                  {to}
                                </code>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleReset}>
                    Reset to Default
                  </Button>
                  <Button onClick={handleSave} disabled={!isDirty}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Mappings
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                Select a tenant to configure field mappings
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
