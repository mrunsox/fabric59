/**
 * Phase 5 — InCallAssistPanel
 *
 * Self-contained AI assist rail for the workspace Agent Cockpit. Wraps
 * `useCallCopilot` and feeds it the resolved Knowledge Bin so every
 * non-missing suggestion carries explicit "why this answer" attribution:
 * source type, scope, precedence, and conflict-selection reason when
 * applicable.
 *
 * Stays calm/operational — small cards, collapsible details, no chrome
 * inflation. Source chips are rendered inline via InCallSourceChip.
 */
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  FileText,
  Info,
  Lightbulb,
  Sparkle,
  Target,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallCopilot } from "@/hooks/useCallCopilot";
import { InCallSourceChip } from "./InCallSourceChip";
import {
  CALL_RUNNER_SESSION_SCHEMA_VERSION,
  type CallSessionState,
  type CopilotSuggestion,
} from "@/types/call-runner";
import type { KnowledgeBin } from "@/lib/workspace/cockpit/knowledgeBin";

export interface InCallAssistPanelProps {
  bin: KnowledgeBin | null;
  workspaceId: string;
  workspaceName: string;
  campaignId: string;
  campaignName: string;
  ani: string | null;
  capturedValues: Record<string, unknown>;
  notes: string;
  startedAt: string;
}

interface KindMeta {
  label: string;
  icon: LucideIcon;
}
const KIND_META: Record<CopilotSuggestion["kind"], KindMeta> = {
  suggested_answer: { label: "Say this", icon: Lightbulb },
  next_best_question: { label: "Ask next", icon: ArrowRight },
  draft_summary: { label: "Draft summary", icon: FileText },
  likely_outcome: { label: "Likely outcome", icon: Target },
  notification_target: { label: "Notify", icon: Bell },
  missing_knowledge: { label: "Missing knowledge", icon: Info },
};

export function InCallAssistPanel({
  bin,
  workspaceId,
  workspaceName,
  campaignId,
  campaignName,
  ani,
  capturedValues,
  notes,
  startedAt,
}: InCallAssistPanelProps) {
  // Synthesize the minimal CallSessionState the copilot heuristic expects.
  const session = useMemo<CallSessionState>(
    () => ({
      schemaVersion: CALL_RUNNER_SESSION_SCHEMA_VERSION,
      meta: {
        workspaceId,
        workspaceName,
        campaignId,
        campaignName,
        ani: ani ?? null,
        callId: null,
        startedAt,
      },
      currentStepId: null,
      completedStepIds: [],
      values: capturedValues,
      notes,
      updatedAt: new Date().toISOString(),
      finalized: false,
    }),
    [
      workspaceId,
      workspaceName,
      campaignId,
      campaignName,
      ani,
      capturedValues,
      notes,
      startedAt,
    ],
  );

  const copilot = useCallCopilot({
    session,
    flow: null,
    guide: null,
    bin: bin ?? null,
  });

  return (
    <div
      className="rounded-md border bg-card overflow-hidden flex flex-col"
      data-testid="incall-assist-panel"
    >
      <header className="px-3 py-2 border-b border-border/60 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Sparkle className="h-3.5 w-3.5 text-primary" aria-hidden />
          AI assist
        </h2>
        <span className="text-[10px] text-muted-foreground font-mono">
          {copilot.suggestions.length} signal
          {copilot.suggestions.length === 1 ? "" : "s"}
        </span>
      </header>

      <div className="px-3 py-3 space-y-2 max-h-[480px] overflow-y-auto">
        {copilot.empty ? (
          <EmptyAssist hasBin={!!bin && bin.ordered.length > 0} />
        ) : (
          copilot.suggestions.map((s) => (
            <AssistCard key={s.id} suggestion={s} />
          ))
        )}
      </div>
    </div>
  );
}

function AssistCard({ suggestion }: { suggestion: CopilotSuggestion }) {
  const meta = KIND_META[suggestion.kind];
  const Icon = meta.icon;
  const isMissing = suggestion.kind === "missing_knowledge";
  const [whyOpen, setWhyOpen] = useState(false);
  const canExplain = !isMissing && (suggestion.sourceType || suggestion.source);

  return (
    <article
      className={cn(
        "rounded-md border p-2.5 space-y-1.5",
        isMissing
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-border bg-background",
      )}
      data-testid={`incall-assist-${suggestion.kind}`}
    >
      <header className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <Icon
            className={cn(
              "h-3 w-3",
              isMissing ? "text-amber-700" : "text-primary",
            )}
            aria-hidden
          />
          {meta.label}
        </span>
        {!isMissing && suggestion.sourceType && (
          <InCallSourceChip
            sourceType={suggestion.sourceType}
            precedence={suggestion.precedence}
            scope={suggestion.source}
            dense
          />
        )}
      </header>
      <p className="text-xs font-medium leading-snug">{suggestion.title}</p>
      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {suggestion.body}
      </p>
      {canExplain && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setWhyOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            data-testid={`incall-assist-why-${suggestion.kind}`}
            aria-expanded={whyOpen}
          >
            {whyOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            Why this answer
          </button>
          {whyOpen && (
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
              {suggestion.sourceType && (
                <>
                  <dt className="uppercase tracking-wider">Source</dt>
                  <dd className="font-medium">
                    {suggestion.sourceType.replace(/_/g, " ")}
                  </dd>
                </>
              )}
              {suggestion.source && (
                <>
                  <dt className="uppercase tracking-wider">Scope</dt>
                  <dd>{suggestion.source}</dd>
                </>
              )}
              {typeof suggestion.precedence === "number" &&
                Number.isFinite(suggestion.precedence) && (
                  <>
                    <dt className="uppercase tracking-wider">Precedence</dt>
                    <dd className="font-mono">p{suggestion.precedence}</dd>
                  </>
                )}
              {suggestion.conflictReason && (
                <>
                  <dt className="uppercase tracking-wider text-amber-700">
                    Conflict
                  </dt>
                  <dd className="text-amber-700">{suggestion.conflictReason}</dd>
                </>
              )}
            </dl>
          )}
        </div>
      )}
    </article>
  );
}

function EmptyAssist({ hasBin }: { hasBin: boolean }) {
  return (
    <div
      className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-center space-y-1.5"
      data-testid="incall-assist-empty"
    >
      <Sparkle className="h-4 w-4 mx-auto text-primary" aria-hidden />
      <p className="text-xs font-medium">
        {hasBin ? "Assist is listening…" : "Knowledge bin is empty."}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {hasBin
          ? "Suggestions appear as the call progresses. Assist will only surface answers it can attribute."
          : "Approve facts in Business Brain or publish the canonical guide to enable grounded suggestions."}
      </p>
    </div>
  );
}
