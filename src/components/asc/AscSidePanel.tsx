/**
 * ASC side panel — recommendations + preview/why/history tabs.
 *
 * Slice 4 wires the Unresolved tab to the advisory gap-finder items for the
 * current step. Gap items are advisory only and never gate navigation.
 *
 * Phase 2 (Business Brain): adds a "Knowledge" tab that surfaces approved
 * Business Brain facts as read-only suggestions on Steps 3/4/6/7. Suggestions
 * only mutate the draft when the user clicks Use, via the parent-provided
 * `onApplyBbIntent` callback that dispatches existing ASC actions.
 */
import { useContext } from "react";
import { QueryClientContext } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BbStateBlock } from "@/components/business-brain/BbStateBlock";
import type { Dispatch } from "react";
import type { AscDraft } from "@/lib/asc/types";
import type { AscAction } from "@/lib/asc/actions";
import { AscGapItemsList } from "./AscGapItemsList";
import { BbSuggestionTray } from "./BbSuggestionTray";
import { useBusinessBrainSuggestions } from "@/hooks/useBusinessBrainSuggestions";
import { selectIsReadOnly } from "@/lib/asc/selectors";
import type { BbAscApplyIntent, BbAscSuggestion } from "@/lib/business-brain/selectors";

export interface AscSidePanelProps {
  draft: AscDraft;
  dispatch: Dispatch<AscAction>;
  workspaceId: string;
  organizationId?: string | null;
  /** Parent maps a BB intent → existing ASC reducer dispatch. */
  onApplyBbIntent: (intent: BbAscApplyIntent, suggestion: BbAscSuggestion) => void;
}

const BB_STEPS: ReadonlySet<number> = new Set([3, 4, 6, 7]);

/**
 * Internal: only mounted when a `QueryClientProvider` is in scope. Owns the
 * BB suggestions hook + tray rendering.
 */
function BbKnowledgePanel({
  draft,
  workspaceId,
  organizationId,
  isReadOnly,
  isBbStep,
  onApplyBbIntent,
}: {
  draft: AscDraft;
  workspaceId: string;
  organizationId: string | null;
  isReadOnly: boolean;
  isBbStep: boolean;
  onApplyBbIntent: (intent: BbAscApplyIntent, suggestion: BbAscSuggestion) => void;
}) {
  const callerReasonLabels = draft.input.callerReasons.map((r) => r.label);
  const notificationTriggers = (draft.input.notificationsDraftEdits ?? []).map(
    (n) => n.trigger,
  );
  const bb = useBusinessBrainSuggestions({
    workspaceId,
    step: draft.step,
    ascDraftId: draft.id,
    isReadOnly,
    existingCallerReasonLabels: callerReasonLabels,
    hasCallerReason: callerReasonLabels.length > 0,
    existingNotificationTriggers: notificationTriggers,
    hasDestination: Boolean(draft.input.destination),
  });
  if (!bb.enabled) {
    return (
      <p className="text-xs text-muted-foreground">
        Business Brain is not enabled for this workspace, or this step does
        not consume approved knowledge.
      </p>
    );
  }
  if (!isBbStep) {
    return (
      <p className="text-xs text-muted-foreground">
        Knowledge suggestions are surfaced on Steps 3, 4, 6, and 7.
      </p>
    );
  }
  if (bb.isLoading) {
    return <p className="text-xs text-muted-foreground">Loading…</p>;
  }
  return (
    <BbSuggestionTray
      workspaceId={workspaceId}
      ascDraftId={draft.id}
      organizationId={organizationId}
      step={draft.step}
      isReadOnly={isReadOnly}
      suggestions={bb.suggestions}
      onApply={onApplyBbIntent}
    />
  );
}

export function AscSidePanel({
  draft,
  dispatch,
  workspaceId,
  organizationId = null,
  onApplyBbIntent,
}: AscSidePanelProps) {
  const step = draft.step;
  const isGapStep = step === 3 || step === 4;
  const isBbStep = BB_STEPS.has(step);
  const isReadOnly = selectIsReadOnly(draft);
  // Defensive: tests that mount the side panel without a QueryClientProvider
  // should see the empty state, not a crash.
  const hasQueryClient = Boolean(useContext(QueryClientContext));

  return (
    <aside
      data-testid="asc-side-panel"
      className="flex h-full flex-col border-l border-bb-border-subtle bg-[hsl(var(--bb-surface-inset)/0.4)]"
    >
      <Tabs defaultValue="unresolved" className="flex flex-col">
        <TabsList className="m-2 grid grid-cols-5 bg-transparent p-0 gap-1 h-auto">
          <TabsTrigger
            value="unresolved"
            className="bb-focus-ring data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-bb-border-subtle border border-transparent text-xs"
          >
            Unresolved
          </TabsTrigger>
          <TabsTrigger
            value="knowledge"
            data-testid="asc-side-tab-knowledge"
            className="bb-focus-ring data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-bb-border-subtle border border-transparent text-xs"
          >
            Knowledge
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="bb-focus-ring data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-bb-border-subtle border border-transparent text-xs"
          >
            Preview
          </TabsTrigger>
          <TabsTrigger
            value="rationale"
            className="bb-focus-ring data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-bb-border-subtle border border-transparent text-xs"
          >
            Why
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="bb-focus-ring data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-bb-border-subtle border border-transparent text-xs"
          >
            History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="unresolved" className="p-4">
          {isGapStep ? (
            <AscGapItemsList
              draft={draft}
              step={step as 3 | 4}
              dispatch={dispatch}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Recommendations appear here on Steps 3–4. They are advisory and
              never block navigation.
            </p>
          )}
        </TabsContent>
        <TabsContent value="knowledge" className="p-4">
          {hasQueryClient ? (
            <BbKnowledgePanel
              draft={draft}
              workspaceId={workspaceId}
              organizationId={organizationId}
              isReadOnly={isReadOnly}
              isBbStep={isBbStep}
              onApplyBbIntent={onApplyBbIntent}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Knowledge suggestions are unavailable in this view.
            </p>
          )}
        </TabsContent>
        <TabsContent value="preview" className="p-4">
          <BbStateBlock
            kind="upcoming"
            dense
            data-testid="asc-side-preview-empty"
            title="Agent experience preview is coming in a later phase."
            description="In the meantime, open the live runner to see how this script behaves on a real call."
          />
        </TabsContent>
        <TabsContent value="rationale" className="p-4">
          <BbStateBlock
            kind="upcoming"
            dense
            data-testid="asc-side-rationale-empty"
            title="Why-it's-here explanations are coming in a later phase."
            description="Selecting a step or node won't surface rationale yet."
          />
        </TabsContent>
        <TabsContent value="history" className="p-4">
          <BbStateBlock
            kind="upcoming"
            dense
            data-testid="asc-side-history-empty"
            title="Assistant call history is coming in a later phase."
            description="Past AI suggestions and applied changes will appear here once shipped."
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

