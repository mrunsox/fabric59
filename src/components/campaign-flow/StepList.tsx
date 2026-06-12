import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DEFAULT_STEP_TITLES } from "@/lib/campaign-flow/templates";
import type { FlowStep, FlowStepType } from "@/types/campaign-flow";

const STEP_TYPES: FlowStepType[] = [
  "question_branch",
  "information_display",
  "field_capture",
  "outcome_disposition",
  "escalation_trigger",
  "notification_trigger",
  "end_flow",
];

interface Props {
  steps: FlowStep[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAdd: (type: FlowStepType) => void;
}

export function StepList({ steps, activeId, onSelect, onMove, onRemove, onDuplicate, onAdd }: Props) {
  return (
    <div className="space-y-2" data-testid="step-list">
      <div className="space-y-1">
        {steps.map((s, idx) => (
          <div
            key={s.id}
            data-testid={`step-row-${s.id}`}
            onClick={() => onSelect(s.id)}
            className={cn(
              "group flex items-center gap-1.5 rounded-md border px-2 py-1.5 cursor-pointer transition",
              activeId === s.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent/10",
            )}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium truncate">{s.title}</span>
                {!s.enabled && <Badge variant="outline" className="text-[10px]">off</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{DEFAULT_STEP_TITLES[s.type]}</p>
            </div>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
              <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Move up"
                onClick={(e) => { e.stopPropagation(); onMove(s.id, -1); }} disabled={idx === 0}>
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Move down"
                onClick={(e) => { e.stopPropagation(); onMove(s.id, 1); }} disabled={idx === steps.length - 1}>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Duplicate step"
                onClick={(e) => { e.stopPropagation(); onDuplicate(s.id); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                aria-label="Delete step"
                onClick={(e) => { e.stopPropagation(); onRemove(s.id); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {steps.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No steps yet. Add one below or apply a template.</p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-full gap-1.5" data-testid="add-step">
            <Plus className="h-3.5 w-3.5" /> Add step
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {STEP_TYPES.map((t) => (
            <DropdownMenuItem key={t} onSelect={() => onAdd(t)} data-testid={`add-step-${t}`}>
              {DEFAULT_STEP_TITLES[t]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
