import { useState } from "react";
import { Search, RefreshCw, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { Five9Schema, FieldDefinition } from "@/types/mapping";

interface SourceFieldsPanelProps {
  schema: Five9Schema | null;
  isLoading: boolean;
  onRefresh: () => void;
  onFieldSelect: (field: FieldDefinition & { path: string }) => void;
}

const categoryLabels: Record<string, string> = {
  contact: "Contact Fields",
  call: "Call Variables",
  disposition: "Dispositions",
  campaign: "Campaigns",
};

const categoryColors: Record<string, string> = {
  contact: "bg-blue-500/20 text-blue-400",
  call: "bg-green-500/20 text-green-400",
  disposition: "bg-purple-500/20 text-purple-400",
  campaign: "bg-orange-500/20 text-orange-400",
};

export function SourceFieldsPanel({
  schema,
  isLoading,
  onRefresh,
  onFieldSelect,
}: SourceFieldsPanelProps) {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["contact", "call"]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const groupedFields: Record<string, (FieldDefinition & { path: string })[]> = {
    contact: (schema?.contactFields || []).map((f) => ({ ...f, path: `contact.${f.name}` })),
    call: (schema?.callVariables || []).map((f) => ({ ...f, path: `call.${f.name}` })),
    disposition: (schema?.dispositions || []).map((f) => ({ ...f, path: `disposition.${f.name}` })),
    campaign: (schema?.campaigns || []).map((f) => ({ ...f, path: `campaign.${f.name}` })),
  };

  const filteredFields = Object.entries(groupedFields).reduce(
    (acc, [category, fields]) => {
      const filtered = fields.filter(
        (f) =>
          f.label.toLowerCase().includes(search.toLowerCase()) ||
          f.name.toLowerCase().includes(search.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as Record<string, (FieldDefinition & { path: string })[]>
  );

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Five9 Fields</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Fields List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Loading fields...
            </div>
          ) : Object.keys(filteredFields).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {search ? "No matching fields" : "No fields available"}
            </div>
          ) : (
            Object.entries(filteredFields).map(([category, fields]) => (
              <Collapsible
                key={category}
                open={expandedCategories.includes(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-lg text-sm font-medium">
                  <span className="flex items-center gap-2">
                    {expandedCategories.includes(category) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    {categoryLabels[category] || category}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {fields.length}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-2 space-y-1 mt-1">
                    {fields.map((field) => (
                      <div
                        key={field.path}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-grab active:cursor-grabbing group transition-colors"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/json", JSON.stringify(field));
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => onFieldSelect(field)}
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{field.label}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {field.path}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", categoryColors[category])}
                        >
                          {field.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
