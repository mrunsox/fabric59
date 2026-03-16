import { useState, useMemo } from 'react';
import { ScriptNode, EndAction } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CheckCircle2, Plus, Trash2, Loader2, ChevronsUpDown, Check, Search } from 'lucide-react';
import { useDispositions, useDeleteDisposition, Disposition } from '@/hooks/useDispositions';
import { DispositionFormModal } from '@/components/tree-editor/DispositionFormModal';
import { cn } from '@/lib/utils';

interface EndNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
  scriptId?: string;
}

export function EndNodeConfig({ node, onUpdate, scriptId }: EndNodeConfigProps) {
  const endAction = node.endAction || { type: 'none' };
  const { data: dispositions = [], isLoading } = useDispositions(scriptId);
  const deleteDisposition = useDeleteDisposition();

  const [isAddingDisposition, setIsAddingDisposition] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const updateEndAction = (updates: Partial<EndAction>) => {
    onUpdate({
      endAction: { ...endAction, ...updates }
    });
  };

  const handleDeleteDisposition = async (id: string) => {
    await deleteDisposition.mutateAsync(id);
    setDeletingId(null);
    // Clear selection if deleted disposition was selected
    if (endAction.config?.disposition === id) {
      updateEndAction({ config: { ...endAction.config, disposition: undefined } });
    }
  };

  const activeDispositions = useMemo(() => 
    dispositions.filter(d => d.is_active),
    [dispositions]
  );

  const selectedDisposition = useMemo(() => 
    activeDispositions.find(d => d.id === endAction.config?.disposition),
    [activeDispositions, endAction.config?.disposition]
  );

  const handleDispositionSelect = (dispositionId: string) => {
    updateEndAction({ config: { ...endAction.config, disposition: dispositionId } });
    setComboboxOpen(false);
  };

  const handleDispositionCreated = (disposition: Disposition) => {
    // Auto-select the newly created disposition
    updateEndAction({ config: { ...endAction.config, disposition: disposition.id } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="End Call"
        />
      </div>

      <div className="space-y-2">
        <Label>Summary Text</Label>
        <Textarea
          value={node.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Thank you for calling. Is there anything else I can help with?"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Disposition (Required)</Label>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsAddingDisposition(true)}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add New
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : activeDispositions.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-border text-center">
            <p className="text-sm text-muted-foreground mb-2">
              No dispositions available for this script
            </p>
            <Button size="sm" variant="outline" onClick={() => setIsAddingDisposition(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create Disposition
            </Button>
          </div>
        ) : (
          <>
            {/* Searchable Combobox for Disposition Selection */}
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between bg-background hover:bg-accent"
                >
                  {selectedDisposition ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-node-end" />
                      <span>{selectedDisposition.name}</span>
                      {selectedDisposition.email_subject && (
                        <Badge variant="secondary" className="text-xs ml-2">
                          Email configured
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Search dispositions...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search dispositions..." />
                  <CommandList>
                    <CommandEmpty>
                      <div className="py-4 text-center">
                        <p className="text-sm text-muted-foreground mb-2">No disposition found.</p>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setComboboxOpen(false);
                            setIsAddingDisposition(true);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Create New
                        </Button>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {activeDispositions.map((disposition) => (
                        <CommandItem
                          key={disposition.id}
                          value={disposition.name}
                          onSelect={() => handleDispositionSelect(disposition.id)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              endAction.config?.disposition === disposition.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-node-end" />
                              <span className="font-medium">{disposition.name}</span>
                            </div>
                            {disposition.email_subject && (
                              <p className="text-xs text-muted-foreground ml-6 truncate">
                                Subject: {disposition.email_subject}
                              </p>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Manage dispositions inline */}
            <div className="space-y-1.5 mt-3">
              <Label className="text-xs text-muted-foreground">Manage Dispositions</Label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {activeDispositions.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/50 text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{d.name}</span>
                      {d.recipient_emails && d.recipient_emails.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({d.recipient_emails.length} recipients)
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setDeletingId(d.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Disposition is recorded as $disposition and determines email routing
        </p>
      </div>

      <div className="space-y-3">
        <Label>Final Actions</Label>
        
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium">Send Email Summary</p>
            <p className="text-xs text-muted-foreground">Email call summary to specified address</p>
          </div>
          <Switch
            checked={endAction.type === 'email'}
            onCheckedChange={(checked) => updateEndAction({ type: checked ? 'email' : 'none' })}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium">Update CRM</p>
            <p className="text-xs text-muted-foreground">Push data to connected CRM</p>
          </div>
          <Switch
            checked={endAction.type === 'crm'}
            onCheckedChange={(checked) => updateEndAction({ type: checked ? 'crm' : 'none' })}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium">Generate PDF</p>
            <p className="text-xs text-muted-foreground">Create PDF transcript of call</p>
          </div>
          <Switch
            checked={endAction.type === 'pdf'}
            onCheckedChange={(checked) => updateEndAction({ type: checked ? 'pdf' : 'none' })}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium">Trigger Webhook</p>
            <p className="text-xs text-muted-foreground">Call external API on completion</p>
          </div>
          <Switch
            checked={endAction.type === 'webhook'}
            onCheckedChange={(checked) => updateEndAction({ type: checked ? 'webhook' : 'none' })}
          />
        </div>
      </div>

      <div className="p-3 rounded-lg bg-node-end/20 border border-node-end/30">
        <p className="text-xs text-muted-foreground">
          Available variables at end: $disposition, $call_duration
        </p>
      </div>

      {/* Full Disposition Form Modal */}
      <DispositionFormModal
        isOpen={isAddingDisposition}
        onClose={() => setIsAddingDisposition(false)}
        presetScriptId={scriptId}
        onCreated={handleDispositionCreated}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Delete Disposition</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this disposition? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deletingId && handleDeleteDisposition(deletingId)}
              disabled={deleteDisposition.isPending}
            >
              {deleteDisposition.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
