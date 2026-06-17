/**
 * ASC side panel — recommendations + preview/why/history tabs.
 *
 * Slice 4 wires the Unresolved tab to the advisory gap-finder items for the
 * current step. Gap items are advisory only and never gate navigation.
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Dispatch } from "react";
import type { AscDraft } from "@/lib/asc/types";
import type { AscAction } from "@/lib/asc/actions";
import { AscGapItemsList } from "./AscGapItemsList";

export interface AscSidePanelProps {
  draft: AscDraft;
  dispatch: Dispatch<AscAction>;
}

export function AscSidePanel({ draft, dispatch }: AscSidePanelProps) {
  const step = draft.step;
  const isGapStep = step === 3 || step === 4;
  return (
    <aside
      data-testid="asc-side-panel"
      className="flex h-full flex-col border-l bg-card/40"
    >
      <Tabs defaultValue="unresolved" className="flex flex-col">
        <TabsList className="m-2 grid grid-cols-4">
          <TabsTrigger value="unresolved">Unresolved</TabsTrigger>
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
