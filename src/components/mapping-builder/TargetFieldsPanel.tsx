import { useState } from "react";
import { Search, ChevronDown, ChevronRight, GripVertical, Scale, Wrench, Cloud, Webhook } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { crmSchemas, type CRMSchema, type CRMField } from "@/lib/crm-schemas";

interface TargetFieldsPanelProps {
  selectedCRM: string;
  onCRMChange: (crm: string) => void;
  onFieldSelect: (field: CRMField) => void;
}

const crmIcons: Record<string, React.ReactNode> = {
  clio: <Scale className="h-4 w-4" />,
  workiz: <Wrench className="h-4 w-4" />,
  salesforce: <Cloud className="h-4 w-4" />,
  webhook: <Webhook className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  contact: "bg-blue-500/20 text-blue-400",
  matter: "bg-indigo-500/20 text-indigo-400",
  client: "bg-blue-500/20 text-blue-400",
  job: "bg-amber-500/20 text-amber-400",
  lead: "bg-green-500/20 text-green-400",
  account: "bg-purple-500/20 text-purple-400",
  opportunity: "bg-pink-500/20 text-pink-400",
  call: "bg-green-500/20 text-green-400",
  custom: "bg-gray-500/20 text-gray-400",
};

export function TargetFieldsPanel({
  selectedCRM,
  onCRMChange,
  onFieldSelect,
}: TargetFieldsPanelProps) {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const schema: CRMSchema | undefined = crmSchemas[selectedCRM];

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // Group fields by category
  const groupedFields = schema?.fields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, CRMField[]>) || {};

  // Filter by search
  const filteredFields = Object.entries(groupedFields).reduce(
    (acc, [category, fields]) => {
      const filtered = fields.filter(
        (f) =>
          f.label.toLowerCase().includes(search.toLowerCase()) ||
          f.path.toLowerCase().includes(search.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as Record<string, CRMField[]>
  );

  // Auto-expand first category
  if (expandedCategories.length === 0 && schema?.categories.length) {
    setExpandedCategories([schema.categories[0]]);
  }

  return (
    <div className="flex flex-col h-full border-l border-border bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="mb-3">
          <label className="text-xs font-medium text-foreground mb-1.5 block">
            Target CRM
          </label>
          <Select value={selectedCRM} onValueChange={onCRMChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select CRM" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(crmSchemas).map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  <span className="flex items-center gap-2">
                    {crmIcons[s.name]}
                    {s.displayName}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          {!schema ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Select a CRM to view fields
            </div>
          ) : Object.keys(filteredFields).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {search ? "No matching fields" : "No fields available"}
            </div>
          ) : (
            schema.categories.map((category) => {
              const fields = filteredFields[category];
              if (!fields) return null;
              
              return (
                <Collapsible
                  key={category}
                  open={expandedCategories.includes(category)}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-lg text-sm font-medium capitalize">
                    <span className="flex items-center gap-2">
                      {expandedCategories.includes(category) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {category}
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
                            <p className="text-sm font-medium truncate text-foreground">
                              {field.label}
                              {field.required && (
                                <span className="text-destructive ml-1">*</span>
                              )}
                            </p>
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
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
