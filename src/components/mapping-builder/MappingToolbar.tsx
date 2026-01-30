import { Save, RotateCcw, Copy, Download, Play, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface MappingToolbarProps {
  mappingName: string;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
  onTest: () => void;
  onExport: () => void;
}

export function MappingToolbar({
  mappingName,
  isDirty,
  isSaving,
  onSave,
  onReset,
  onTest,
  onExport,
}: MappingToolbarProps) {
  const handleCopy = () => {
    // This would copy the current mapping config to clipboard
    toast.success("Mapping configuration copied to clipboard");
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-sm">
          {mappingName || "Untitled Mapping"}
          {isDirty && <span className="text-warning ml-2">(unsaved)</span>}
        </h2>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onTest}>
              <Play className="h-4 w-4 mr-1" />
              Test
            </Button>
          </TooltipTrigger>
          <TooltipContent>Test mapping with sample data</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy to clipboard</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onExport}>
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export as JSON</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
              <History className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Version history (coming soon)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onReset} disabled={!isDirty}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </TooltipTrigger>
          <TooltipContent>Discard changes</TooltipContent>
        </Tooltip>

        <Button size="sm" onClick={onSave} disabled={!isDirty || isSaving}>
          <Save className="h-4 w-4 mr-1" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
