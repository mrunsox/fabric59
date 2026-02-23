import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { CampaignConnector } from "@/types/campaign";

interface ConnectorListProps {
  connectors: CampaignConnector[];
  onChange: (connectors: CampaignConnector[]) => void;
}

function generateId() {
  return `conn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const CONNECTOR_TYPES: { value: CampaignConnector["type"]; label: string }[] = [
  { value: "backend_doc", label: "Backend Document" },
  { value: "website", label: "Website" },
  { value: "script", label: "Script" },
  { value: "custom", label: "Custom" },
];

export function ConnectorList({ connectors, onChange }: ConnectorListProps) {
  const addConnector = () => {
    onChange([...connectors, { id: generateId(), type: "backend_doc", name: "", url: "" }]);
  };

  const updateConnector = (index: number, patch: Partial<CampaignConnector>) => {
    const updated = [...connectors];
    updated[index] = { ...updated[index], ...patch };
    onChange(updated);
  };

  const removeConnector = (index: number) => {
    onChange(connectors.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Add connectors to link external resources to this campaign for agent reference.
      </p>
      {connectors.map((conn, index) => (
        <div key={conn.id} className="flex flex-wrap gap-2 items-start p-3 border rounded-md bg-muted/30">
          <Select
            value={conn.type}
            onValueChange={(v) => updateConnector(index, { type: v as CampaignConnector["type"] })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONNECTOR_TYPES.map((ct) => (
                <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={conn.name}
            onChange={(e) => updateConnector(index, { name: e.target.value })}
            placeholder="Connector name"
            className="flex-1 min-w-[140px]"
          />
          <Input
            value={conn.url}
            onChange={(e) => updateConnector(index, { url: e.target.value })}
            placeholder="URL or reference"
            className="flex-1 min-w-[180px]"
          />
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => removeConnector(index)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addConnector} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add Connector
      </Button>
    </div>
  );
}
