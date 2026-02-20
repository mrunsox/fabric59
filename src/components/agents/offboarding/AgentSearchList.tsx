import { useState } from "react";
import { Search, UserMinus, X, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/agents/shared/StatusBadge";
import { ProvisioningHistory } from "@/types/provisioning";
import { cn } from "@/lib/utils";

interface AgentSearchListProps {
  agents: ProvisioningHistory[];
  onOffboard: (agent: ProvisioningHistory) => void;
  onCancel: (agent: ProvisioningHistory) => void;
  onRestore: (agent: ProvisioningHistory) => void;
  onBatchOffboard?: (agents: ProvisioningHistory[]) => void;
}

export function AgentSearchList({ agents, onOffboard, onCancel, onRestore, onBatchOffboard }: AgentSearchListProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = agents.filter(a =>
    `${a.agentName} ${a.email} ${a.role} ${a.extension}`.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedAgents = agents.filter(a => selected.has(a.id));

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      {/* Batch action bar */}
      {selected.size >= 2 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-warning/10 border-b border-warning/20">
          <span className="text-sm font-medium text-warning">{selected.size} agents selected</span>
          <Button size="sm" variant="destructive" onClick={() => {
            onBatchOffboard?.(selectedAgents);
            setSelected(new Set());
          }}>
            <UserMinus className="h-3.5 w-3.5 mr-1.5" /> Offboard Selected
          </Button>
        </div>
      )}

      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      <div className="overflow-y-auto max-h-96">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground text-xs">No agents found.</div>
        )}
        {filtered.map(agent => (
          <div
            key={agent.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/20 transition-colors",
              selected.has(agent.id) && "bg-primary/5"
            )}
          >
            <Checkbox
              checked={selected.has(agent.id)}
              onCheckedChange={() => toggleSelect(agent.id)}
              className="flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground">{agent.agentName}</p>
                <StatusBadge status={agent.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{agent.role} · Ext {agent.extension} · {agent.email}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {agent.status === 'active' && (
                <Button size="sm" variant="destructive" onClick={() => onOffboard(agent)} className="h-7 text-xs px-2">
                  <UserMinus className="h-3 w-3 mr-1" /> Offboard
                </Button>
              )}
              {agent.status === 'pending_deletion' && (
                <Button size="sm" variant="outline" onClick={() => onCancel(agent)} className="h-7 text-xs px-2">
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
              )}
              {agent.status === 'under_review' && (
                <Button size="sm" variant="outline" onClick={() => onRestore(agent)} className="h-7 text-xs px-2">
                  <RotateCcw className="h-3 w-3 mr-1" /> Restore
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
