import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkle, ThumbsUp, ThumbsDown } from "lucide-react";
import { matchHotkey, HOTKEYS } from "@/lib/call-runner/hotkeys";
import type { CopilotFeedbackVerdict, CopilotResult, CopilotSuggestion } from "@/types/call-runner";

interface Props {
  copilot: CopilotResult;
  feedback: Record<string, CopilotFeedbackVerdict>;
  onRate: (id: string, verdict: CopilotFeedbackVerdict) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

const KIND_LABEL: Record<CopilotSuggestion["kind"], string> = {
  suggested_answer: "Suggested answer",
  next_best_question: "Next-best question",
  draft_summary: "Draft summary",
  likely_outcome: "Likely outcome",
  notification_target: "Notification target",
};

/**
 * Phase 6 · Right panel — AI copilot.
 *
 * Additive only — never blocks the agent. Backed by `useCallCopilot`, whose
 * default implementation is deterministic heuristics; Phase 7+ can swap an LLM
 * backend behind the same hook without UI changes.
 */
export function CopilotPanel({ copilot, feedback, onRate, notes, onNotesChange }: Props) {
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

  return (
    <Card className="h-full flex flex-col" data-testid="runner-copilot-panel">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkle className="h-3.5 w-3.5" /> Call copilot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 overflow-y-auto">
        {copilot.empty ? (
          <div
            className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-center space-y-1"
            data-testid="copilot-empty"
          >
            <Sparkle className="h-4 w-4 mx-auto text-primary animate-pulse" />
            <p className="text-xs font-medium">Copilot is listening…</p>
            <p className="text-[11px] text-muted-foreground">
              Suggestions appear as the call progresses.
            </p>
          </div>
        ) : (
          copilot.suggestions.map((s) => (
            <SuggestionRow
              key={s.id}
              suggestion={s}
              verdict={feedback[s.id]}
              onRate={(v) => onRate(s.id, v)}
            />
          ))
        )}

        <div className="space-y-1 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Call notes
            </Label>
            <kbd className="inline-flex items-center justify-center h-4 px-1 rounded border border-border bg-muted text-[9px] font-mono text-muted-foreground">
              Alt+N
            </kbd>
          </div>
          <Textarea
            ref={notesRef}
            rows={4}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Free-form notes (autosaved)…"
            data-testid="runner-notes"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SuggestionRow({
  suggestion,
  verdict,
  onRate,
}: {
  suggestion: CopilotSuggestion;
  verdict: CopilotFeedbackVerdict | undefined;
  onRate: (v: CopilotFeedbackVerdict) => void;
}) {
  return (
    <div
      className="rounded-md border border-border bg-card p-2.5 space-y-1.5"
      data-testid={`copilot-suggestion-${suggestion.kind}`}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[10px]">
          {KIND_LABEL[suggestion.kind]}
        </Badge>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant={verdict === "helpful" ? "default" : "ghost"}
            className="h-6 w-6"
            onClick={() => onRate("helpful")}
            data-testid={`copilot-helpful-${suggestion.id}`}
            aria-label="Mark helpful"
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={verdict === "not_helpful" ? "destructive" : "ghost"}
            className="h-6 w-6"
            onClick={() => onRate("not_helpful")}
            data-testid={`copilot-nothelpful-${suggestion.id}`}
            aria-label="Mark not helpful"
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <p className="text-xs font-medium">{suggestion.title}</p>
      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{suggestion.body}</p>
      {suggestion.source && (
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {suggestion.source}
        </p>
      )}
      {suggestion.rationale && (
        <p className="text-[10px] text-muted-foreground italic">{suggestion.rationale}</p>
      )}
    </div>
  );
}
