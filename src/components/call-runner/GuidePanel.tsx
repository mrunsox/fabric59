import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  EyeOff,
  ClipboardCopy,
  Check,
  Sparkle,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatusPill, RunnerSurface } from "./primitives";
import { matchHotkey, HOTKEYS } from "@/lib/call-runner/hotkeys";
import type {
  WorkspaceGuideContentV2,
  WorkspaceGuideSection,
  WorkspaceGuideSectionKind,
} from "@/types/workspace-guide";

interface Props {
  guide: WorkspaceGuideContentV2 | null;
  isLoading: boolean;
  /** Optional sink for the "copy to notes" action. */
  onAppendToNotes?: (text: string) => void;
  /**
   * Optional hint about the active step. Used to pin a "Relevant to this step"
   * section so the guide rail behaves like an at-call reference, not a wall of
   * text. Best-effort heuristic — no schema dependency.
   */
  currentStepHint?: {
    type?: string;
    title?: string;
  } | null;
}

/**
 * Left panel — read-only published workspace guide as scan-first reference.
 *
 * Improvements over the original rail:
 *   - Sections collapsed by default. Less ink, more signal.
 *   - "Relevant to this step" pin when the active step has a section match.
 *   - Quick-jump chips for high-value sections.
 *   - Search input always present so Alt+F has a visible target.
 */
export function GuidePanel({ guide, isLoading, onAppendToNotes, currentStepHint }: Props) {
  const [filter, setFilter] = useState("");
  const [showInternal, setShowInternal] = useState(false);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
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
        s.fields.some(
          (f) => f.label.toLowerCase().includes(q) || f.value.toLowerCase().includes(q),
        ),
    );
  }, [guide, filter, showInternal]);

  const internalCount = useMemo(
    () => (guide?.sections ?? []).filter((s) => s.enabled && s.visibility === "internal").length,
    [guide],
  );

  // Heuristic: pick the most relevant section for the current step (if any).
  // Order of preference is small and intentional so this stays predictable.
  const relevantSection = useMemo<WorkspaceGuideSection | null>(() => {
    if (!guide || !currentStepHint) return null;
    const type = currentStepHint.type ?? "";
    const title = (currentStepHint.title ?? "").toLowerCase();
    const lookup = (kinds: WorkspaceGuideSectionKind[]) =>
      guide.sections.find((s) => s.enabled && kinds.includes(s.kind));
    if (type === "information_display") return lookup(["greeting", "business_overview"]) ?? null;
    if (type === "question_branch") return lookup(["faqs", "service_descriptions"]) ?? null;
    if (type === "field_capture") return lookup(["special_handling", "callback_policy"]) ?? null;
    if (type === "outcome_disposition") return lookup(["escalation_contacts", "callback_policy"]) ?? null;
    if (type === "escalation_trigger") return lookup(["escalation_contacts"]) ?? null;
    if (title) {
      const byTitle = guide.sections.find(
        (s) => s.enabled && s.label.toLowerCase().includes(title.split(" ")[0]),
      );
      if (byTitle) return byTitle;
    }
    return null;
  }, [guide, currentStepHint]);

  // Quick-jump chips: stable, high-value section kinds first; truncate to 5.
  const quickJumpKinds: WorkspaceGuideSectionKind[] = [
    "greeting",
    "hours",
    "escalation_contacts",
    "callback_policy",
    "faqs",
    "special_handling",
  ];
  const quickJumpSections = useMemo(() => {
    if (!guide) return [];
    const map = new Map(guide.sections.filter((s) => s.enabled).map((s) => [s.kind, s] as const));
    return quickJumpKinds
      .map((k) => map.get(k))
      .filter((s): s is WorkspaceGuideSection => Boolean(s))
      .slice(0, 5);
  }, [guide]);

  const scrollTo = (id: string) => {
    setOpenIds((m) => ({ ...m, [id]: true }));
    requestAnimationFrame(() => {
      document.getElementById(`guide-section-${id}`)?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  };

  return (
    <RunnerSurface tone="muted" className="overflow-hidden" data-testid="runner-guide-panel">
      <div className="px-3 pt-3 pb-2 border-b border-[hsl(var(--border-subtle))] flex items-center justify-between gap-2 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" /> Workspace guide
        </h2>
        {guide && (
          <span className="text-[10px] text-muted-foreground">
            {sections.length} of {guide.sections.filter((s) => s.enabled).length}
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {isLoading ? (
          <GuideSkeleton />
        ) : !guide || guide.sections.length === 0 ? (
          <GuideEmpty />
        ) : (
          <>
            <div className="relative">
              <Search
                className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground"
                aria-hidden
              />
              <label htmlFor="runner-guide-filter-input" className="sr-only">
                Filter guide sections
              </label>
              <Input
                id="runner-guide-filter-input"
                ref={filterRef}
                className="h-8 pl-7 pr-12 text-xs"
                placeholder="Filter sections…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                data-testid="runner-guide-filter"
              />
              <kbd
                className="absolute right-2 top-2 inline-flex items-center justify-center h-4 px-1 rounded border border-border bg-muted text-[9px] font-mono text-muted-foreground"
                aria-hidden
              >
                Alt+F
              </kbd>
            </div>

            {quickJumpSections.length > 0 && (
              <nav aria-label="Quick jump to guide sections" className="flex flex-wrap gap-1.5">
                {quickJumpSections.map((s) => (
                  <button
                    key={`qj-${s.id}`}
                    type="button"
                    onClick={() => scrollTo(s.id)}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border rounded-md px-1.5 py-0.5 hover:bg-accent/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  >
                    {s.label}
                  </button>
                ))}
              </nav>
            )}

            {internalCount > 0 && (
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  {internalCount} internal section{internalCount === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowInternal((v) => !v)}
                  className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
                  data-testid="runner-guide-toggle-internal"
                >
                  {showInternal ? "Hide internal" : "Show internal"}
                </button>
              </div>
            )}

            {relevantSection && (
              <div
                className="rounded-md border border-primary/30 bg-primary/5 p-2.5 space-y-1.5"
                data-testid="runner-guide-relevant"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary">
                    <Sparkle className="h-3 w-3" aria-hidden /> Relevant to this step
                  </span>
                  <button
                    type="button"
                    onClick={() => scrollTo(relevantSection.id)}
                    className="text-[10px] underline-offset-2 hover:underline text-primary"
                  >
                    Open
                  </button>
                </div>
                <p className="text-xs font-medium leading-snug">{relevantSection.label}</p>
                {relevantSection.fields[0] && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {relevantSection.fields[0].value}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              {sections.length === 0 ? (
                <p className="text-xs italic text-muted-foreground px-1">
                  No sections match the current filter.
                </p>
              ) : (
                sections.map((s) => (
                  <GuideSectionRow
                    key={s.id}
                    section={s}
                    open={openIds[s.id] ?? false}
                    onOpenChange={(o) => setOpenIds((m) => ({ ...m, [s.id]: o }))}
                    onAppendToNotes={onAppendToNotes}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </RunnerSurface>
  );
}

function GuideSectionRow({
  section,
  open,
  onOpenChange,
  onAppendToNotes,
}: {
  section: WorkspaceGuideSection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAppendToNotes?: (text: string) => void;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div
        id={`guide-section-${section.id}`}
        className="rounded-md border bg-card transition-colors hover:border-border/80"
      >
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between h-auto py-2 px-2.5 text-left rounded-md"
            data-testid={`runner-guide-section-${section.id}`}
          >
            <span className="flex items-center gap-1.5 text-xs font-medium min-w-0">
              {open ? (
                <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
              )}
              <span className="truncate">{section.label}</span>
              {section.visibility === "internal" && (
                <StatusPill tone="muted" icon={EyeOff} dense className="ml-1">
                  Internal
                </StatusPill>
              )}
            </span>
            {section.fields.length > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {section.fields.length}
              </span>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-2.5 pb-2.5 space-y-2 border-t pt-2">
            {section.description && (
              <p className="text-[11px] text-muted-foreground">{section.description}</p>
            )}
            {section.fields.length === 0 ? (
              <p className="text-[11px] italic text-muted-foreground">No content</p>
            ) : (
              section.fields.map((f) => (
                <GuideField
                  key={f.id}
                  label={f.label}
                  value={f.value}
                  onAppendToNotes={onAppendToNotes}
                />
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
      <p className="text-xs whitespace-pre-wrap pr-6 leading-relaxed">{value}</p>
      <button
        type="button"
        onClick={copy}
        aria-label={onAppendToNotes ? "Append to call notes" : "Copy to clipboard"}
        title={onAppendToNotes ? "Append to call notes" : "Copy to clipboard"}
        className="absolute right-0 top-0 h-5 w-5 rounded inline-flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent/20 transition-opacity"
        data-testid="runner-guide-copy"
      >
        {copied ? <Check className="h-3 w-3 text-primary" /> : <ClipboardCopy className="h-3 w-3" />}
      </button>
    </div>
  );
}

function GuideSkeleton() {
  return (
    <div className="space-y-2" data-testid="runner-guide-loading" aria-busy="true">
      <div className="h-8 rounded-md bg-muted/40 animate-pulse" />
      <div className="h-12 rounded-md bg-muted/40 animate-pulse" />
      <div className="h-12 rounded-md bg-muted/30 animate-pulse" />
      <div className="h-12 rounded-md bg-muted/20 animate-pulse" />
    </div>
  );
}

function GuideEmpty() {
  return (
    <div
      className="rounded-md border border-dashed bg-muted/20 p-4 text-center space-y-1.5"
      data-testid="runner-guide-empty"
    >
      <BookOpen className="h-5 w-5 mx-auto text-muted-foreground" aria-hidden />
      <p className="text-xs font-medium">No published workspace guide</p>
      <p className="text-[11px] text-muted-foreground">
        Ask an admin to publish a workspace guide so this rail shows reference content.
      </p>
    </div>
  );
}
