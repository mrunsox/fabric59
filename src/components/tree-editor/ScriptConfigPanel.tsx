import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, X, Save, Mail, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEmailTemplates, EmailTemplate } from '@/hooks/useEmailTemplates';
import { Separator } from '@/components/ui/separator';

interface ScriptConfigPanelProps {
  callTimeLimit: number;
  emailTemplateId?: string;
  onUpdate: (callTimeLimit: number, emailTemplateId?: string) => void;
  onClose: () => void;
}

export function ScriptConfigPanel({ 
  callTimeLimit, 
  emailTemplateId,
  onUpdate, 
  onClose 
}: ScriptConfigPanelProps) {
  const [minutes, setMinutes] = useState(Math.floor(callTimeLimit / 60));
  const [seconds, setSeconds] = useState(callTimeLimit % 60);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(emailTemplateId || 'none');
  
  const { data: emailTemplates = [], isLoading: templatesLoading } = useEmailTemplates();

  const handleSave = () => {
    const totalSeconds = minutes * 60 + seconds;
    onUpdate(totalSeconds, selectedTemplateId === 'none' ? undefined : selectedTemplateId);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Script Configuration</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Call Time Limit */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Call Time Limit
          </Label>
          <p className="text-xs text-muted-foreground">
            Set the maximum duration for calls using this script. The timer will flash red at 60 seconds remaining.
          </p>
          
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Minutes</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={minutes}
                onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className="bg-background"
              />
            </div>
            <span className="text-2xl font-bold text-muted-foreground mt-5">:</span>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Seconds</Label>
              <Input
                type="number"
                min={0}
                max={59}
                value={seconds}
                onChange={(e) => setSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                className="bg-background"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-foreground">
              Total: <span className="font-mono font-bold">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
            </p>
          </div>
        </div>

        <Separator />

        {/* Email Template Mapping */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Template
          </Label>
          <p className="text-xs text-muted-foreground">
            Select an email template to use for post-call summary emails from this script.
          </p>
          
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select email template..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No template selected</SelectItem>
              {emailTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{template.name}</span>
                    {template.is_default && (
                      <span className="text-xs text-muted-foreground">(Default)</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {emailTemplates.length === 0 && !templatesLoading && (
            <p className="text-xs text-amber-600">
              No email templates created yet. Create one in the Email Templates page.
            </p>
          )}
        </div>

        <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground">
          <Save className="w-4 h-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </motion.div>
  );
}
