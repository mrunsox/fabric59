import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDomains } from "@/hooks/useDomains";
import { useFive9Schema } from "@/hooks/useFive9Schema";
import {
  useFieldMappings,
  useFieldMapping,
  useCreateFieldMapping,
  useUpdateFieldMapping,
} from "@/hooks/useFieldMappings";
import { SourceFieldsPanel } from "@/components/mapping-builder/SourceFieldsPanel";
import { TargetFieldsPanel } from "@/components/mapping-builder/TargetFieldsPanel";
import { MappingCanvas } from "@/components/mapping-builder/MappingCanvas";
import { MappingToolbar } from "@/components/mapping-builder/MappingToolbar";
import { TransformDialog } from "@/components/mapping-builder/TransformDialog";
import type { FieldMapping, FieldDefinition } from "@/types/mapping";
import type { CRMField } from "@/lib/crm-schemas";
import { toast } from "sonner";

export default function MappingBuilderPage() {
  const navigate = useNavigate();
  const { id: mappingId } = useParams();
  const [searchParams] = useSearchParams();
  const domainIdFromUrl = searchParams.get("domain");

  // State
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(domainIdFromUrl);
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(mappingId || null);
  const [selectedCRM, setSelectedCRM] = useState<string>("clio");
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [mappingName, setMappingName] = useState("New Mapping");
  const [isDirty, setIsDirty] = useState(false);
  const [selectedSourceField, setSelectedSourceField] = useState<(FieldDefinition & { path: string }) | null>(null);
  const [selectedTargetField, setSelectedTargetField] = useState<CRMField | null>(null);
  const [transformDialogOpen, setTransformDialogOpen] = useState(false);
  const [selectedMappingForTransform, setSelectedMappingForTransform] = useState<FieldMapping | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newMappingName, setNewMappingName] = useState("");

  // Data fetching
  const { data: domains = [] } = useDomains();
  const { data: schemaData, isLoading: schemaLoading, refetch: refetchSchema } = useFive9Schema(selectedDomainId);
  const { data: existingMappings = [] } = useFieldMappings(selectedDomainId);
  const { data: loadedMapping } = useFieldMapping(selectedMappingId);
  const createMapping = useCreateFieldMapping();
  const updateMapping = useUpdateFieldMapping();

  // Load existing mapping when selected
  useEffect(() => {
    if (loadedMapping) {
      setMappings(loadedMapping.mappings);
      setMappingName(loadedMapping.name);
      setSelectedCRM(loadedMapping.destination_type);
      setIsDirty(false);
    }
  }, [loadedMapping]);

  // Auto-create mapping when both source and target are selected
  useEffect(() => {
    if (selectedSourceField && selectedTargetField) {
      const newMapping: FieldMapping = {
        id: `map_${Date.now()}`,
        sourceField: {
          path: selectedSourceField.path,
          label: selectedSourceField.label,
          type: selectedSourceField.type,
          category: selectedSourceField.category,
        },
        targetField: {
          path: selectedTargetField.path,
          label: selectedTargetField.label,
          type: selectedTargetField.type,
          category: selectedTargetField.category,
        },
        transform: null,
      };

      setMappings((prev) => [...prev, newMapping]);
      setIsDirty(true);
      setSelectedSourceField(null);
      setSelectedTargetField(null);
      toast.success(`Mapped ${selectedSourceField.label} → ${selectedTargetField.label}`);
    }
  }, [selectedSourceField, selectedTargetField]);

  const handleMappingsChange = useCallback((newMappings: FieldMapping[]) => {
    setMappings(newMappings);
    setIsDirty(true);
  }, []);

  const handleEdgeClick = useCallback((mapping: FieldMapping) => {
    setSelectedMappingForTransform(mapping);
    setTransformDialogOpen(true);
  }, []);

  const handleTransformSave = useCallback((updatedMapping: FieldMapping) => {
    setMappings((prev) =>
      prev.map((m) => (m.id === updatedMapping.id ? updatedMapping : m))
    );
    setIsDirty(true);
  }, []);

  const handleSave = async () => {
    if (!selectedDomainId) {
      toast.error("Please select a Five9 domain");
      return;
    }

    try {
      if (selectedMappingId) {
        await updateMapping.mutateAsync({
          id: selectedMappingId,
          name: mappingName,
          destination_type: selectedCRM,
          mappings,
        });
      } else {
        const result = await createMapping.mutateAsync({
          five9_domain_id: selectedDomainId,
          name: mappingName,
          destination_type: selectedCRM,
          mappings,
        });
        setSelectedMappingId(result.id);
      }
      setIsDirty(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleReset = () => {
    if (loadedMapping) {
      setMappings(loadedMapping.mappings);
      setMappingName(loadedMapping.name);
      setSelectedCRM(loadedMapping.destination_type);
    } else {
      setMappings([]);
    }
    setIsDirty(false);
  };

  const handleTest = () => {
    toast.info("Test feature coming soon - will validate mappings with sample data");
  };

  const handleExport = () => {
    const exportData = {
      name: mappingName,
      destination_type: selectedCRM,
      mappings,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mappingName.replace(/\s+/g, "-").toLowerCase()}-mapping.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Mapping exported");
  };

  const handleCreateNew = () => {
    if (!selectedDomainId) {
      toast.error("Please select a Five9 domain first");
      return;
    }
    setCreateDialogOpen(true);
  };

  const handleConfirmCreate = async () => {
    if (!newMappingName.trim()) {
      toast.error("Please enter a mapping name");
      return;
    }

    try {
      const result = await createMapping.mutateAsync({
        five9_domain_id: selectedDomainId!,
        name: newMappingName,
        destination_type: selectedCRM,
        mappings: [],
      });
      setSelectedMappingId(result.id);
      setMappingName(newMappingName);
      setMappings([]);
      setIsDirty(false);
      setCreateDialogOpen(false);
      setNewMappingName("");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -mx-6 -mt-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/mappings")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs font-medium text-foreground">Five9 Domain</label>
            <Select
              value={selectedDomainId || ""}
              onValueChange={(v) => {
                setSelectedDomainId(v);
                setSelectedMappingId(null);
                setMappings([]);
              }}
            >
              <SelectTrigger className="w-[200px] h-8">
                <SelectValue placeholder="Select domain" />
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

          <div>
            <label className="text-xs font-medium text-foreground">Mapping</label>
            <div className="flex items-center gap-2">
              <Select
                value={selectedMappingId || ""}
                onValueChange={(v) => setSelectedMappingId(v)}
                disabled={!selectedDomainId}
              >
                <SelectTrigger className="w-[200px] h-8">
                  <SelectValue placeholder="Select mapping" />
                </SelectTrigger>
                <SelectContent>
                  {existingMappings.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleCreateNew}
                disabled={!selectedDomainId}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <MappingToolbar
        mappingName={mappingName}
        isDirty={isDirty}
        isSaving={createMapping.isPending || updateMapping.isPending}
        onSave={handleSave}
        onReset={handleReset}
        onTest={handleTest}
        onExport={handleExport}
      />

      {/* Main content */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Source panel */}
        <div className="w-72 flex-shrink-0">
          <SourceFieldsPanel
            schema={schemaData?.schema || null}
            isLoading={schemaLoading}
            onRefresh={() => refetchSchema()}
            onFieldSelect={setSelectedSourceField}
          />
        </div>

        {/* Canvas */}
        <ReactFlowProvider>
          <MappingCanvas
            mappings={mappings}
            onMappingsChange={handleMappingsChange}
            onEdgeClick={handleEdgeClick}
          />
        </ReactFlowProvider>

        {/* Target panel */}
        <div className="w-72 flex-shrink-0">
          <TargetFieldsPanel
            selectedCRM={selectedCRM}
            onCRMChange={setSelectedCRM}
            onFieldSelect={setSelectedTargetField}
          />
        </div>
      </div>

      {/* Transform dialog */}
      <TransformDialog
        open={transformDialogOpen}
        onOpenChange={setTransformDialogOpen}
        mapping={selectedMappingForTransform}
        onSave={handleTransformSave}
      />

      {/* Create new mapping dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Mapping</DialogTitle>
            <DialogDescription>
              Enter a name for your new field mapping configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Mapping Name</Label>
            <Input
              value={newMappingName}
              onChange={(e) => setNewMappingName(e.target.value)}
              placeholder="e.g., Clio Contact Sync"
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreate} disabled={createMapping.isPending}>
              {createMapping.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
