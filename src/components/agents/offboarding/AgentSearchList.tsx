import { useState } from "react";
import { Search, UserMinus, X, RotateCcw, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { StatusBadge } from "@/components/agents/shared/StatusBadge";
import { ProvisioningHistory } from "@/types/provisioning";
import { cn } from "@/lib/utils";

interface AgentSearchListProps {
  agents: ProvisioningHistory[];
  onOffboard: (agent: ProvisioningHistory) => void;
  onCancel: (agent: ProvisioningHistory) => void;
  onRestore: (agent: ProvisioningHistory) => void;
  onBatchOffboard?: (agents: ProvisioningHistory[]) => void;
  onQuickOffboard?: (agent: ProvisioningHistory) => void;
}

export function AgentSearchList({ agents, onOffboard, onCancel, onRestore, onBatchOffboard, onQuickOffboard }: AgentSearchListProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quickOffboardOpen, setQuickOffboardOpen] = useState(false);

  const uniqueRoles = Array.from(new Set(agents.map(a => a.role).filter(Boolean)));
  const activeAgents = agents.filter(a => a.status === 'active');

  const filtered = agents.filter(a => {
    const matchesSearch = `${a.agentName} ${a.email} ${a.role} ${a.extension}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || a.role === roleFilter;
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedAgents = agents.filter(a => selected.has(a.id));

  const handleQuickOffboard = (agent: ProvisioningHistory) => {
    setQuickOffboardOpen(false);
    if (onQuickOffboard) {
      onQuickOffboard(agent);
    } else {
      onOffboard(agent);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      {/* Batch action bar */}
      {selected.size >= 2 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-warning/10 border-b border-warning/20">
          <span className="text-sm font-medium text-warning-foreground">{selected.size} agents selected</span>
          <Button size="sm" variant="destructive" onClick={() => {
            onBatchOffboard?.(selectedAgents);
            setSelected(new Set());
          }}>
            <UserMinus className="h-3.5 w-3.5 mr-1.5" /> Offboard Selected
          </Button>
        </div>
      )}

      <div className="px-4 py-3 border-b border-border space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {uniqueRoles.map(role => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending_deletion">Scheduled</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="deprovisioned">Removed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 text-xs gap-1.5 whitespace-nowrap"
            onClick={() => setQuickOffboardOpen(true)}
            disabled={activeAgents.length === 0}
          >
            <Zap className="h-3.5 w-3.5" /> Quick Offboard
          </Button>
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

      {/* Quick Offboard Dialog */}
      <Dialog open={quickOffboardOpen} onOpenChange={setQuickOffboardOpen}>
        <DialogContent className="sm:max-w-md dark">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-destructive" />
              Quick Offboard
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">Search and select an agent to immediately offboard with no grace period.</p>
          <Command className="rounded-lg border border-border">
            <CommandInput placeholder="Type agent name..." />
            <CommandList>
              <CommandEmpty>No active agents found.</CommandEmpty>
              <CommandGroup>
                {activeAgents.map(agent => (
                  <CommandItem
                    key={agent.id}
                    value={agent.agentName}
                    onSelect={() => handleQuickOffboard(agent)}
                    className="cursor-pointer"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{agent.agentName}</p>
                      <p className="text-xs text-muted-foreground">{agent.role} · Ext {agent.extension} · {agent.email}</p>
                    </div>
                    <UserMinus className="h-3.5 w-3.5 text-destructive shrink-0" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
