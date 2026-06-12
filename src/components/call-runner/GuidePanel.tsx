import { useMemo, useState } from "react";
import { BookOpen, Search, ChevronDown, ChevronRight, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { WorkspaceGuideContentV2, WorkspaceGuideSection } from "@/types/workspace-guide";

interface Props {
  guide: WorkspaceGuideContentV2 | null;
  isLoading: boolean;
}

/**
 * Phase 6 · Left panel — read-only published workspace guide.
 * Collapsible sections, in-panel filter, internal sections badged but not hidden
 * from the agent (per spec — internal = not surfaced externally).
 */
export function GuidePanel({ guide, isLoading }: Props) {
  const [filter, setFilter] = useState("");

  const sections = useMemo<WorkspaceGuideSection[]>(() => {
    if (!guide) return [];
    const enabled = guide.sections.filter((s) => s.enabled);
    if (!filter.trim()) return enabled;
    const q = filter.toLowerCase();
    return enabled.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.fields.some((f) => f.label.toLowerCase().includes(q) || f.value.toLowerCase().includes(q)),
    );
  }, [guide, filter]);

  return (
    <Card className="h-full flex flex-col" data-testid="runner-guide-panel">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5" /> Workspace guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading guide…</p>
        ) : !guide || guide.sections.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">No published workspace guide yet</p>
            <p>Contact an admin to publish a workspace guide for this campaign.</p>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                className="h-8 pl-7 text-xs"
                placeholder="Filter sections…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                data-testid="runner-guide-filter"
              />
            </div>
            <nav className="flex flex-wrap gap-1.5" aria-label="Guide sections">
              {sections.map((s) => (
                <a
                  key={`nav-${s.id}`}
                  href={`#guide-section-${s.id}`}
                  className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border rounded px-1.5 py-0.5"
                >
                  {s.label}
                </a>
              ))}
            </nav>
            <div className="space-y-2">
              {sections.map((s) => (
                <GuideSectionRow key={s.id} section={s} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function GuideSectionRow({ section }: { section: WorkspaceGuideSection }) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div id={`guide-section-${section.id}`} className="rounded-md border border-border bg-card">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between h-auto py-2 px-2.5 text-left"
            data-testid={`runner-guide-section-${section.id}`}
          >
            <span className="flex items-center gap-1.5 text-xs font-medium">
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {section.label}
              {section.visibility === "internal" && (
                <Badge variant="outline" className="text-[9px] gap-1 px-1 h-4">
                  <EyeOff className="h-2.5 w-2.5" /> Internal
                </Badge>
              )}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-2.5 pb-2 space-y-2">
            {section.description && (
              <p className="text-[11px] text-muted-foreground">{section.description}</p>
            )}
            {section.fields.length === 0 ? (
              <p className="text-[11px] italic text-muted-foreground">No content</p>
            ) : (
              section.fields.map((f) => (
                <div key={f.id} className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</p>
                  <p className="text-xs whitespace-pre-wrap">{f.value}</p>
                </div>
              ))
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
