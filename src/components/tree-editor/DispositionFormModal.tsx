import { useState, useEffect } from 'react';
import { Loader2, Mail, Users, Tag, Save, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateDisposition, Disposition } from '@/hooks/useDispositions';
import { useScripts } from '@/hooks/useScripts';

import { toast } from 'sonner';

interface DispositionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetScriptId?: string;
  onCreated?: (disposition: Disposition) => void;
}

export function DispositionFormModal({
  isOpen,
  onClose,
  presetScriptId,
  onCreated,
}: DispositionFormModalProps) {
  const { data: scripts = [] } = useScripts();
  const createDisposition = useCreateDisposition();

  const [name, setName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [recipientEmails, setRecipientEmails] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [scriptId, setScriptId] = useState<string>('none');

  // Reset form when opened with preset
  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmailSubject('');
      setRecipientEmails('');
      setIsActive(true);
      setScriptId(presetScriptId || 'none');
    }
  }, [isOpen, presetScriptId]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Disposition name is required');
      return;
    }

    const emails = recipientEmails
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    const dispositionData = {
      name,
      email_subject: emailSubject || null,
      recipient_emails: emails,
      is_active: isActive,
      sort_order: 0,
      script_id: scriptId === 'none' ? null : scriptId,
      email_template_id: null,
      auto_send_email: false,
      auto_send_sms: false,
      sms_template: null,
      callback_delay_minutes: null,
    };

    const result = await createDisposition.mutateAsync(dispositionData);
    onCreated?.(result as unknown as Disposition);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Create New Disposition
          </DialogTitle>
          <DialogDescription>
            Configure the disposition name, email subject, and recipients. This disposition will be available for selection in End Nodes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Business/Script</Label>
            <Select value={scriptId} onValueChange={setScriptId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select a script (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Script (Unassigned)</SelectItem>
                {scripts.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5" />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Link to a script so it appears in that script's End Node configuration
            </p>
          </div>

          <div className="space-y-2">
            <Label>Disposition Name *</Label>
            <Input
              placeholder="e.g., Hot Lead, Callback Requested, Not Interested"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Subject Line
            </Label>
            <Input
              placeholder="e.g., Hot Lead - {{client_name}} requires follow-up"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              This subject line will be used for post-call summary emails. Supports variables like {'{{client_name}}'}.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Recipient Emails
            </Label>
            <Input
              placeholder="sales@company.com, manager@company.com"
              value={recipientEmails}
              onChange={(e) => setRecipientEmails(e.target.value)}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple emails with commas. These recipients will receive call summaries for this disposition.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div>
              <Label className="text-sm font-medium">Active</Label>
              <p className="text-xs text-muted-foreground">Show this disposition in end call options</p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="gradient-primary text-primary-foreground"
            disabled={createDisposition.isPending}
          >
            {createDisposition.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Create Disposition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
