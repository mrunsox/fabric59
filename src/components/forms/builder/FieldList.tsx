import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FIELD_TYPE_REGISTRY,
  FIELD_TYPE_BY_KEY,
  FIELD_TYPE_GROUPS,
} from "@/config/formFieldTypes";
import type { FormField, FormFieldType, FormSection } from "@/types/form-schema";
import { cn } from "@/lib/utils";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface FieldListProps {
  section: FormSection;
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onAddField: (type: FormFieldType) => void;
  onRemoveField: (id: string) => void;
  onMoveField: (id: string, direction: -1 | 1) => void;
}

/**
 * Center-pane field list. Power-user surface — keyboard-friendly add menu,
 * inline reorder, single-click select that drives the right inspector.
 */
export function FieldList({
  section,
  selectedFieldId,
  onSelectField,
  onAddField,
  onRemoveField,
  onMoveField,
}: FieldListProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">
          {section.title || "Untitled section"}
        </h3>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" data-testid="add-field-trigger">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add field
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-[420px] overflow-y-auto">
            {FIELD_TYPE_GROUPS.map((g) => {
              const items = FIELD_TYPE_REGISTRY.filter((m) => m.group === g.key);
              return (
                <div key={g.key}>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {g.label}
                  </DropdownMenuLabel>
                  {items.map((m) => {
                    const Icon = m.icon;
                    return (
                      <DropdownMenuItem
                        key={m.type}
                        onClick={() => {
                          onAddField(m.type);
                          setOpen(false);
                        }}
                        data-testid={`add-field-${m.type}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{m.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {section.fields.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          No fields yet. Use <span className="font-medium text-foreground">Add field</span>.
        </div>
      ) : (
        <ul className="space-y-2" data-testid="field-list">
          {section.fields.map((f, idx) => {
            const meta = FIELD_TYPE_BY_KEY[f.type];
            const Icon = meta?.icon;
            const selected = f.id === selectedFieldId;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onSelectField(f.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-left transition-colors",
                    selected
                      ? "border-primary/50 bg-primary/5 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]"
                      : "border-border/60 bg-background hover:bg-muted/40",
                  )}
                  data-testid={`field-row-${f.id}`}
                >
                  {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{f.label || "Untitled"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {meta?.label} · {f.key}
                      {f.required ? " · required" : ""}
                    </p>
                  </div>
                  <span className="flex items-center gap-0.5 opacity-60">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveField(f.id, -1);
                      }}
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={idx === section.fields.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveField(f.id, 1);
                      }}
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive/70 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveField(f.id);
                      }}
                      aria-label="Delete field"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default FieldList;
