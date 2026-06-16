import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AscSidePanel() {
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
        <TabsContent
          value="unresolved"
          className="p-4 text-xs text-muted-foreground"
        >
          <p>
            Gaps and recommendations from the assistant will appear here.
            Slice 1 ships the empty state; the gap-finder lands with the
            orchestration in a later slice.
          </p>
        </TabsContent>
        <TabsContent
          value="preview"
          className="p-4 text-xs text-muted-foreground"
        >
          <p>
            Agent experience preview will mount the real call-runner
            primitives here in a later slice. No separate interpretation.
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
