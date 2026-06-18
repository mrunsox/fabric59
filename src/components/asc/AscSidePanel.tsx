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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Dispatch } from "react";
import type { AscDraft } from "@/lib/asc/types";
import type { AscAction } from "@/lib/asc/actions";
import { AscGapItemsList } from "./AscGapItemsList";
import { BbSuggestionTray } from "./BbSuggestionTray";
import { useBusinessBrainSuggestions } from "@/hooks/useBusinessBrainSuggestions";
import { useAuth } from "@/contexts/AuthContext";
import { selectIsReadOnly } from "@/lib/asc/selectors";
import type { BbAscApplyIntent, BbAscSuggestion } from "@/lib/business-brain/selectors";

export interface AscSidePanelProps {
  draft: AscDraft;
  dispatch: Dispatch<AscAction>;
  workspaceId: string;
  /** Parent maps a BB intent → existing ASC reducer dispatch. */
  onApplyBbIntent: (intent: BbAscApplyIntent, suggestion: BbAscSuggestion) => void;
}

const BB_STEPS: ReadonlySet<number> = new Set([3, 4, 6, 7]);

export function AscSidePanel({
  draft,
  dispatch,
  workspaceId,
  onApplyBbIntent,
}: AscSidePanelProps) {
  const step = draft.step;
  const isGapStep = step === 3 || step === 4;
  const isBbStep = BB_STEPS.has(step);
  const isReadOnly = selectIsReadOnly(draft);
  const { organization } = useAuth();

  const callerReasonLabels = draft.input.callerReasons.map((r) => r.label);
  const notificationTriggers = (draft.input.notificationsDraftEdits ?? []).map(
    (n) => n.trigger,
  );

  const bb = useBusinessBrainSuggestions({
    workspaceId,
    step,
    ascDraftId: draft.id,
    isReadOnly,
    existingCallerReasonLabels: callerReasonLabels,
    hasCallerReason: callerReasonLabels.length > 0,
    existingNotificationTriggers: notificationTriggers,
    hasDestination: Boolean(draft.input.destination),
  });

  return (
    <aside
      data-testid="asc-side-panel"
      className="flex h-full flex-col border-l bg-card/40"
    >
      <Tabs defaultValue="unresolved" className="flex flex-col">
        <TabsList className="m-2 grid grid-cols-5">
          <TabsTrigger value="unresolved">Unresolved</TabsTrigger>
          <TabsTrigger value="knowledge" data-testid="asc-side-tab-knowledge">
            Knowledge
          </TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="rationale">Why</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
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
          {!bb.enabled ? (
            <p className="text-xs text-muted-foreground">
              Business Brain is not enabled for this workspace, or this step
              does not consume approved knowledge.
            </p>
          ) : !isBbStep ? (
            <p className="text-xs text-muted-foreground">
              Knowledge suggestions are surfaced on Steps 3, 4, 6, and 7.
            </p>
          ) : bb.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (
            <BbSuggestionTray
              workspaceId={workspaceId}
              ascDraftId={draft.id}
              organizationId={organization?.id ?? null}
              step={step}
              isReadOnly={isReadOnly}
              suggestions={bb.suggestions}
              onApply={onApplyBbIntent}
            />
          )}
        </TabsContent>
        <TabsContent
          value="preview"
          className="p-4 text-xs text-muted-foreground"
        >
          <p>
            Agent experience preview will mount the real call-runner
            primitives here in a later slice.
          </p>
        </TabsContent>
        <TabsContent
          value="rationale"
          className="p-4 text-xs text-muted-foreground"
        >
          <p>Hover or click an element to see why it's here.</p>
        </TabsContent>
        <TabsContent
          value="history"
          className="p-4 text-xs text-muted-foreground"
        >
          <p>Assistant call history will appear here.</p>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
