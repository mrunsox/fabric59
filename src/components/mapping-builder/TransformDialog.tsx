import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldMapping, TransformRule, TransformType } from "@/types/mapping";
import { transformConfigs } from "@/types/mapping";

interface TransformDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping: FieldMapping | null;
  onSave: (mapping: FieldMapping) => void;
}

export function TransformDialog({
  open,
  onOpenChange,
  mapping,
  onSave,
}: TransformDialogProps) {
  const [transformType, setTransformType] = useState<TransformType>("none");
  const [params, setParams] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (mapping?.transform) {
      setTransformType(mapping.transform.type);
      setParams(mapping.transform.params || {});
    } else {
      setTransformType("none");
      setParams({});
    }
  }, [mapping]);

  const selectedConfig = transformConfigs.find((c) => c.type === transformType);

  const handleSave = () => {
    if (!mapping) return;

    const transform: TransformRule | null =
      transformType === "none"
        ? null
        : {
            type: transformType,
            params: Object.keys(params).length > 0 ? params : undefined,
          };

    onSave({
      ...mapping,
      transform,
    });
    onOpenChange(false);
  };

  const updateParam = (name: string, value: unknown) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  if (!mapping) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Transform</DialogTitle>
          <DialogDescription>
            Add a transformation to modify the field value before mapping.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source → Target display */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm">
            <span className="font-medium">{mapping.sourceField.label}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-medium">{mapping.targetField.label}</span>
          </div>

          {/* Transform type selection */}
          <div className="space-y-2">
            <Label>Transform Type</Label>
            <Select
              value={transformType}
              onValueChange={(v) => {
                setTransformType(v as TransformType);
                setParams({});
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {transformConfigs.map((config) => (
                  <SelectItem key={config.type} value={config.type}>
                    <div className="flex flex-col">
                      <span>{config.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {config.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transform parameters */}
          {selectedConfig?.params?.map((param) => (
            <div key={param.name} className="space-y-2">
              <Label>
                {param.label}
                {param.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {param.type === "select" && param.options ? (
                <Select
                  value={(params[param.name] as string) || ""}
                  onValueChange={(v) => updateParam(param.name, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${param.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {param.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={param.type === "number" ? "number" : "text"}
                  value={(params[param.name] as string) || ""}
                  onChange={(e) =>
                    updateParam(
                      param.name,
                      param.type === "number"
                        ? Number(e.target.value)
                        : e.target.value
                    )
                  }
                  placeholder={`Enter ${param.label.toLowerCase()}`}
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Transform</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
