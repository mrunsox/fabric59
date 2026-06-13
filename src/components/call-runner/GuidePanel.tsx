import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Search, ChevronDown, ChevronRight, EyeOff, ClipboardCopy, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { matchHotkey, HOTKEYS } from "@/lib/call-runner/hotkeys";
import type { WorkspaceGuideContentV2, WorkspaceGuideSection } from "@/types/workspace-guide";

interface Props {
  guide: WorkspaceGuideContentV2 | null;
  isLoading: boolean;
  /** Optional sink for the "copy to notes" action (Zingtree-style Instant Notes). */
  onAppendToNotes?: (text: string) => void;
}

/**
 * Phase 6 · Left panel — read-only published workspace guide.
 * Collapsible sections, in-panel filter, internal sections badged but not hidden
 * from the agent (per spec — internal = not surfaced externally).
 */
export function GuidePanel({ guide, isLoading, onAppendToNotes }: Props) {
  const [filter, setFilter] = useState("");
  const [showInternal, setShowInternal] = useState(false);
  const filterRef = useRef<HTMLInputElement | null>(null);

  // Global Alt+F focuses the in-panel filter without stealing other inputs.
  useEffect(() => {
    const def = HOTKEYS.find((h) => h.id === "focus_guide_search")!;
    function onKey(e: KeyboardEvent) {
      if (matchHotkey(e, def)) {
        e.preventDefault();
        filterRef.current?.focus();
        filterRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sections = useMemo<WorkspaceGuideSection[]>(() => {
    if (!guide) return [];
    let enabled = guide.sections.filter((s) => s.enabled);
    if (!showInternal) enabled = enabled.filter((s) => s.visibility !== "internal");
    if (!filter.trim()) return enabled;
    const q = filter.toLowerCase();
    return enabled.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.fields.some((f) => f.label.toLowerCase().includes(q) || f.value.toLowerCase().includes(q)),
    );
  }, [guide, filter, showInternal]);

  const internalCount = useMemo(
    () => (guide?.sections ?? []).filter((s) => s.enabled && s.visibility === "internal").length,
    [guide],
  );

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
                ref={filterRef}
                className="h-8 pl-7 pr-12 text-xs"
                placeholder="Filter sections…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                data-testid="runner-guide-filter"
              />
              <kbd className="absolute right-2 top-2 inline-flex items-center justify-center h-4 px-1 rounded border border-border bg-muted text-[9px] font-mono text-muted-foreground">
                Alt+F
              </kbd>
            </div>
            {internalCount > 0 && (
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{internalCount} internal section{internalCount === 1 ? "" : "s"}</span>
                <button
                  type="button"
                  onClick={() => setShowInternal((v) => !v)}
                  className="underline-offset-2 hover:underline"
                  data-testid="runner-guide-toggle-internal"
                >
                  {showInternal ? "Hide internal" : "Show internal"}
                </button>
              </div>
            )}
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
                <GuideSectionRow
                  key={s.id}
                  section={s}
                  onAppendToNotes={onAppendToNotes}
                  defaultOpen={s.visibility !== "internal"}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function GuideSectionRow({
  section,
  onAppendToNotes,
  defaultOpen = true,
}: {
  section: WorkspaceGuideSection;
  onAppendToNotes?: (text: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
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
                <GuideField key={f.id} label={f.label} value={f.value} onAppendToNotes={onAppendToNotes} />
              ))
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function GuideField({
  label,
  value,
  onAppendToNotes,
}: {
  label: string;
  value: string;
  onAppendToNotes?: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = `${label}: ${value}`;
    if (onAppendToNotes) {
      onAppendToNotes(text);
      toast.success("Appended to call notes");
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Copied");
      } catch {
        toast.error("Could not copy");
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="group relative space-y-0.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs whitespace-pre-wrap pr-6">{value}</p>
      <button
        type="button"
        onClick={copy}
        aria-label={onAppendToNotes ? "Append to call notes" : "Copy to clipboard"}
        title={onAppendToNotes ? "Append to call notes" : "Copy to clipboard"}
        className="absolute right-0 top-0 h-5 w-5 rounded inline-flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-accent/20 transition-opacity"
        data-testid="runner-guide-copy"
      >
        {copied ? <Check className="h-3 w-3 text-primary" /> : <ClipboardCopy className="h-3 w-3" />}
      </button>
    </div>
  );
}
