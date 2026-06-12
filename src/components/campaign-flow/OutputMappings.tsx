import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { newFlowId } from "@/lib/campaign-flow/schema";
import type { CampaignFlowContent, FlowOutputMapping } from "@/types/campaign-flow";

interface Props {
  content: CampaignFlowContent;
  onChange: (next: CampaignFlowContent) => void;
}

/**
 * Output mapping editor. Captures source key → destination key with optional
 * provider hint. Phase 5 persists; Phase 7 executes.
 */
export function OutputMappings({ content, onChange }: Props) {
  const mappings = content.mappings ?? [];
  const setMappings = (next: FlowOutputMapping[]) => onChange({ ...content, mappings: next });
  const add = () => setMappings([...mappings, { id: newFlowId("map"), sourceKey: "", destinationKey: "" }]);
  const remove = (id: string) => setMappings(mappings.filter((m) => m.id !== id));
  const patch = (id: string, p: Partial<FlowOutputMapping>) =>
    setMappings(mappings.map((m) => (m.id === id ? { ...m, ...p } : m)));

  return (
    <Card data-testid="output-mappings">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Output mappings</CardTitle>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={add}>
          <Plus className="h-3 w-3 mr-1" /> Add mapping
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Map captured fields and outcomes to destination keys. Adapter execution happens later — Phase 5 persists the configuration.
        </p>
        {mappings.length === 0 && <p className="text-xs text-muted-foreground italic">No mappings yet.</p>}
        {mappings.map((m) => (
          <div key={m.id} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-center">
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Source key</Label>
              <Input className="h-8 text-sm" placeholder="caller_phone" value={m.sourceKey}
                onChange={(e) => patch(m.id, { sourceKey: e.target.value })} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Destination key</Label>
              <Input className="h-8 text-sm" placeholder="contact.phone" value={m.destinationKey}
                onChange={(e) => patch(m.id, { destinationKey: e.target.value })} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Provider (optional)</Label>
              <Input className="h-8 text-sm" placeholder="clio / mycase / webhook"
                value={m.destinationProvider ?? ""}
                onChange={(e) => patch(m.id, { destinationProvider: e.target.value || undefined })} />
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive self-end"
              aria-label="Delete mapping" onClick={() => remove(m.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
