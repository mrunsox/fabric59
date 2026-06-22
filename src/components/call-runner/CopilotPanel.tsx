import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sparkle,
  ThumbsUp,
  ThumbsDown,
  ClipboardCopy,
  PlusCircle,
  MessageSquareText,
  ArrowRight,
  FileText,
  Target,
  Bell,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RunnerSurface, StatusPill, AutosaveIndicator, type AutosaveState } from "./primitives";
import { matchHotkey, HOTKEYS } from "@/lib/call-runner/hotkeys";
import type { CopilotFeedbackVerdict, CopilotResult, CopilotSuggestion } from "@/types/call-runner";

interface Props {
  copilot: CopilotResult;
  feedback: Record<string, CopilotFeedbackVerdict>;
  onRate: (id: string, verdict: CopilotFeedbackVerdict) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onInsertIntoNotes?: (text: string) => void;
  /** Reuses the page-level autosave signal so the notes header reflects truth. */
  notesAutosave?: AutosaveState;
  notesSavedAt?: string | null;
}

interface KindMeta {
  label: string;
  icon: LucideIcon;
  intent: "speak" | "ask" | "summarize" | "decide" | "notify";
}

const KIND_META: Record<CopilotSuggestion["kind"], KindMeta> = {
  suggested_answer: { label: "Suggested answer", icon: Lightbulb, intent: "speak" },
  next_best_question: { label: "Next best question", icon: ArrowRight, intent: "ask" },
  draft_summary: { label: "Draft summary", icon: FileText, intent: "summarize" },
  likely_outcome: { label: "Likely outcome", icon: Target, intent: "decide" },
  notification_target: { label: "Notification target", icon: Bell, intent: "notify" },
  missing_knowledge: { label: "Missing knowledge", icon: Sparkle, intent: "summarize" },
};

/**
 * Right panel — AI copilot.
 *
 * Composition shift versus the original panel:
 *   - Suggestions are grouped by intent (speak / ask / summarize / decide /
 *     notify). Each suggestion is a CopilotCard with header, body, source,
 *     and an action row (Copy, Insert into notes, Helpful, Not helpful).
 *   - The notes area is visually attached to the call with an autosave dot
 *     and Alt+N affordance preserved.
 *   - Surface is intentionally calmer (muted background) so the center
 *     panel reads as primary.
 */
export function CopilotPanel({
  copilot,
  feedback,
  onRate,
  notes,
  onNotesChange,
  onInsertIntoNotes,
  notesAutosave = "idle",
  notesSavedAt,
}: Props) {
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const def = HOTKEYS.find((h) => h.id === "focus_notes")!;
    function onKey(e: KeyboardEvent) {
      if (matchHotkey(e, def)) {
        e.preventDefault();
        notesRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Stable, predictable ordering: speak → ask → decide → notify → summarize.
  const sortedSuggestions = [...copilot.suggestions].sort(
    (a, b) =>
      ORDER.indexOf(KIND_META[a.kind].intent) - ORDER.indexOf(KIND_META[b.kind].intent),
  );

  return (
    <RunnerSurface calm className="overflow-hidden" data-testid="runner-copilot-panel">
      <div className="px-3 pt-3 pb-2 border-b border-border/60 flex items-center justify-between shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Sparkle className="h-3.5 w-3.5 text-primary" /> Call copilot
        </h2>
        <StatusPill tone="muted" dense className="font-mono">
          {sortedSuggestions.length} signal{sortedSuggestions.length === 1 ? "" : "s"}
        </StatusPill>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2.5">
        {copilot.empty ? (
          <CopilotEmpty />
        ) : (
          sortedSuggestions.map((s) => (
            <CopilotCard
              key={s.id}
              suggestion={s}
              verdict={feedback[s.id]}
              onRate={(v) => onRate(s.id, v)}
              onInsert={onInsertIntoNotes}
            />
          ))
        )}
      </div>

      {/* Call notes — attached, autosaving */}
      <div className="border-t border-border/60 bg-card/40 px-3 py-2.5 space-y-1.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <Label
            htmlFor="runner-notes-textarea"
            className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1"
          >
            <MessageSquareText className="h-3 w-3" aria-hidden /> Call notes
          </Label>
          <div className="flex items-center gap-1.5">
            <AutosaveIndicator state={notesAutosave} savedAt={notesSavedAt} />
            <kbd
              className="inline-flex items-center justify-center h-4 px-1 rounded border border-border bg-muted text-[9px] font-mono text-muted-foreground"
              aria-hidden
            >
              Alt+N
            </kbd>
          </div>
        </div>
        <Textarea
          id="runner-notes-textarea"
          ref={notesRef}
          rows={4}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Free-form notes (autosaved)…"
          data-testid="runner-notes"
          className="resize-none text-sm"
        />
      </div>
    </RunnerSurface>
  );
}

const ORDER: KindMeta["intent"][] = ["speak", "ask", "decide", "notify", "summarize"];

function CopilotCard({
  suggestion,
  verdict,
  onRate,
  onInsert,
}: {
  suggestion: CopilotSuggestion;
  verdict: CopilotFeedbackVerdict | undefined;
  onRate: (v: CopilotFeedbackVerdict) => void;
  onInsert?: (text: string) => void;
}) {
  const meta = KIND_META[suggestion.kind];
  const Icon = meta.icon;

  const copy = async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(suggestion.body);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const insert = () => {
    if (!onInsert) return;
    onInsert(suggestion.body);
    toast.success("Inserted into notes");
  };

  return (
    <article
      className="rounded-md border bg-card p-2.5 space-y-1.5 transition-colors hover:border-border/80"
      data-testid={`copilot-suggestion-${suggestion.kind}`}
    >
      <header className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3 w-3 text-primary" aria-hidden />
          {meta.label}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={copy}
            aria-label="Copy suggestion to clipboard"
            title="Copy"
          >
            <ClipboardCopy className="h-3 w-3" />
          </Button>
          {onInsert && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={insert}
              aria-label="Insert suggestion into call notes"
              title="Insert into notes"
            >
              <PlusCircle className="h-3 w-3" />
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            variant={verdict === "helpful" ? "default" : "ghost"}
            className={cn("h-6 w-6", verdict === "helpful" && "")}
            onClick={() => onRate("helpful")}
            aria-label="Mark helpful"
            aria-pressed={verdict === "helpful"}
            data-testid={`copilot-helpful-${suggestion.id}`}
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={verdict === "not_helpful" ? "destructive" : "ghost"}
            className="h-6 w-6"
            onClick={() => onRate("not_helpful")}
            aria-label="Mark not helpful"
            aria-pressed={verdict === "not_helpful"}
            data-testid={`copilot-nothelpful-${suggestion.id}`}
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </div>
      </header>
      <p className="text-xs font-medium leading-snug">{suggestion.title}</p>
      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {suggestion.body}
      </p>
      {(suggestion.source || suggestion.rationale) && (
        <footer className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5">
          {suggestion.source && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {suggestion.source}
            </span>
          )}
          {suggestion.rationale && (
            <span className="text-[10px] text-muted-foreground italic">
              {suggestion.rationale}
            </span>
          )}
        </footer>
      )}
    </article>
  );
}

function CopilotEmpty() {
  return (
    <div
      className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-center space-y-1.5"
      data-testid="copilot-empty"
    >
      <Sparkle className="h-4 w-4 mx-auto text-primary animate-pulse" aria-hidden />
      <p className="text-xs font-medium">Copilot is listening…</p>
      <p className="text-[11px] text-muted-foreground">
        Suggestions appear as the call progresses. Keep working — the copilot is additive.
      </p>
    </div>
  );
}
