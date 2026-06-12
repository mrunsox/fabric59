import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkspaceGuideSection, WorkspaceGuideSectionKind } from "@/types/workspace-guide";
import { DEFAULT_SECTION_LABELS } from "@/lib/workspace-guide/templates";

interface SectionListProps {
  sections: WorkspaceGuideSection[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  onAdd: (kind: WorkspaceGuideSectionKind) => void;
}

export function SectionList({
  sections,
  activeId,
  onSelect,
  onMove,
  onRemove,
  onAdd,
}: SectionListProps) {
  return (
    <div className="space-y-3" data-testid="section-list">
      <div className="space-y-1.5">
        {sections.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No sections yet. Add a section to start building this guide.
          </p>
        )}
        {sections.map((s, i) => {
          const isActive = s.id === activeId;
          return (
            <div
              key={s.id}
              data-testid={`section-row-${s.id}`}
              className={cn(
                "group flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm",
                isActive
                  ? "border-primary/60 bg-primary/5"
                  : "border-border bg-background hover:border-border/80",
                !s.enabled && "opacity-60",
              )}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <button
                type="button"
                className="flex-1 min-w-0 text-left truncate"
                onClick={() => onSelect(s.id)}
              >
                <span className="font-medium truncate">{s.label}</span>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {s.visibility === "internal" ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] gap-1 px-1.5"
                    title="Internal-only — not shown to agents"
                  >
                    <EyeOff className="h-3 w-3" /> Internal
                  </Badge>
                ) : (
                  <Eye className="h-3 w-3 text-muted-foreground" aria-label="Agent-visible" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => onMove(s.id, -1)}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label="Move down"
                  disabled={i === sections.length - 1}
                  onClick={() => onMove(s.id, 1)}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  aria-label="Delete section"
                  onClick={() => onRemove(s.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-md border border-dashed border-border p-2">
        <p className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1 mb-1.5">
          <Plus className="h-3 w-3" /> Add section
        </p>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(DEFAULT_SECTION_LABELS) as WorkspaceGuideSectionKind[]).map((k) => (
            <Button
              key={k}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onAdd(k)}
              data-testid={`add-section-${k}`}
            >
              {DEFAULT_SECTION_LABELS[k]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SectionList;
