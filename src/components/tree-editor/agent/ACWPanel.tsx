import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Send, 
  CheckCircle, 
  Mail, 
  User, 
  Clock,
  Loader2,
  X,
  Eye,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDispositions, Disposition } from '@/hooks/useDispositions';
import { useEmailTemplates, EmailTemplate } from '@/hooks/useEmailTemplates';
import { usePostCallAutomation } from '@/hooks/usePostCallAutomation';
import { EmailPreview } from '@/components/email/EmailPreview';
import { toast } from 'sonner';

interface ACWPanelProps {
  scriptId: string;
  sessionVariables: Record<string, string>;
  callDuration?: number;
  onComplete?: (data: ACWData) => void;
  onCancel?: () => void;
}

interface ACWData {
  dispositionId: string;
  notes: string;
  emailSent: boolean;
  emailContent?: string;
}

export function ACWPanel({
  scriptId,
  sessionVariables,
  callDuration = 0,
  onComplete,
  onCancel,
}: ACWPanelProps) {
  const { data: dispositions = [] } = useDispositions(scriptId);
  const { data: emailTemplates = [] } = useEmailTemplates();
  const postCallAutomation = usePostCallAutomation();

  const [selectedDisposition, setSelectedDisposition] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the selected disposition object
  const currentDisposition = useMemo(() => 
    dispositions.find(d => d.id === selectedDisposition),
    [dispositions, selectedDisposition]
  );
  
  // Check if disposition has automation enabled
  const hasAutomation = useMemo(() => {
    if (!currentDisposition) return false;
    return currentDisposition.auto_send_email || currentDisposition.auto_send_sms || 
           (currentDisposition.callback_delay_minutes && currentDisposition.callback_delay_minutes > 0);
  }, [currentDisposition]);

  // Get the associated email template
  const linkedTemplate = useMemo(() => {
    if (!currentDisposition) return null;
    const templateId = (currentDisposition as any).email_template_id;
    if (!templateId) return null;
    return emailTemplates.find(t => t.id === templateId);
  }, [currentDisposition, emailTemplates]);

  // Auto-populate email when disposition changes
  const handleDispositionChange = (dispositionId: string) => {
    setSelectedDisposition(dispositionId);

    const disposition = dispositions.find(d => d.id === dispositionId);
    if (!disposition) return;

    // Set email subject from disposition
    if (disposition.email_subject) {
      setEmailSubject(interpolateVariables(disposition.email_subject));
    }

    // Auto-populate email template content
    const templateId = (disposition as any).email_template_id;
    if (templateId) {
      const template = emailTemplates.find(t => t.id === templateId);
      if (template) {
        setEmailBody(interpolateVariables(template.body_content));
        if (!disposition.email_subject && template.subject) {
          setEmailSubject(interpolateVariables(template.subject));
        }
      }
    } else {
      setEmailBody('');
    }
  };

  const interpolateVariables = (content: string) => {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return sessionVariables[key] || `{{${key}}}`;
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!selectedDisposition) {
      toast.error('Please select a disposition');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate sending email if content exists
      const emailSent = emailBody.trim().length > 0 && recipientEmail.trim().length > 0;

      onComplete?.({
        dispositionId: selectedDisposition,
        notes,
        emailSent,
        emailContent: emailBody,
      });

      toast.success('After call work completed');
    } catch (error) {
      toast.error('Failed to submit ACW');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            After Call Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Call Summary */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Duration:</span>
              <span className="font-medium">{formatDuration(callDuration)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Caller:</span>
              <span className="font-medium">
                {sessionVariables.firstName || sessionVariables.name || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Disposition Selection */}
          <div className="space-y-2">
            <Label>Call Disposition *</Label>
            <Select value={selectedDisposition} onValueChange={handleDispositionChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select call outcome" />
              </SelectTrigger>
              <SelectContent>
                {dispositions.filter(d => d.is_active).map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    <div className="flex items-center gap-2">
                      {d.name}
                      {(d as any).email_template_id && (
                        <Badge variant="outline" className="text-xs ml-2">
                          <Mail className="w-3 h-3 mr-1" />
                          Template
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Call Notes</Label>
            <Textarea
              placeholder="Add notes about this call..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Email Section - Only show if disposition has email settings */}
          {currentDisposition && (emailBody || linkedTemplate || currentDisposition.email_subject) && (
            <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <Label className="text-base font-medium">Post-Call Email</Label>
                  {linkedTemplate && (
                    <Badge variant="secondary" className="text-xs">
                      {linkedTemplate.name}
                    </Badge>
                  )}
                </div>
                {emailBody && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowEmailPreview(true)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Recipient Email</Label>
                  <Input
                    type="email"
                    placeholder="customer@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Email subject..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email Body</Label>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Email content..."
                    className="min-h-[150px] font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!selectedDisposition || isSubmitting}
              className="gradient-primary text-primary-foreground"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : emailBody && recipientEmail ? (
                <Send className="w-4 h-4 mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {emailBody && recipientEmail ? 'Complete & Send Email' : 'Complete'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <EmailPreview
            headerImageUrl={linkedTemplate?.header_image_url}
            subject={emailSubject}
            bodyContent={emailBody}
            footerNotes={(linkedTemplate as any)?.footer_notes}
            footerPromotions={(linkedTemplate as any)?.footer_promotions}
            footerLinks={linkedTemplate?.footer_links}
            variables={sessionVariables}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
