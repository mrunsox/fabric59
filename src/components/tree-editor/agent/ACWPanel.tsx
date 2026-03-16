// ACWPanel - After Call Work panel stub for Fabric59
// Simplified from source project to remove incompatible imports
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Send, CheckCircle, Mail, Clock, Loader2 } from 'lucide-react';
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
import { toast } from 'sonner';

interface ACWPanelProps {
  scriptId?: string;
  callData?: {
    ani?: string;
    dnis?: string;
    duration?: number;
    agentNotes?: string;
    capturedData?: Record<string, string>;
  };
  onComplete?: () => void;
  onDispositionSelect?: (dispositionId: string) => void;
}

export function ACWPanel({ scriptId, callData, onComplete, onDispositionSelect }: ACWPanelProps) {
  const [selectedDisposition, setSelectedDisposition] = useState('');
  const [notes, setNotes] = useState(callData?.agentNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedDisposition) {
      toast.error('Please select a disposition');
      return;
    }
    setIsSubmitting(true);
    try {
      onDispositionSelect?.(selectedDisposition);
      toast.success('After-call work submitted');
      onComplete?.();
    } catch (error) {
      toast.error('Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            After Call Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Call Summary */}
          {callData && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {callData.ani && (
                <div>
                  <span className="text-muted-foreground">ANI:</span>{' '}
                  <span className="font-medium">{callData.ani}</span>
                </div>
              )}
              {callData.duration && (
                <div>
                  <span className="text-muted-foreground">Duration:</span>{' '}
                  <span className="font-medium">{Math.floor(callData.duration / 60)}:{(callData.duration % 60).toString().padStart(2, '0')}</span>
                </div>
              )}
            </div>
          )}

          {/* Disposition Selection */}
          <div>
            <Label>Disposition</Label>
            <Select value={selectedDisposition} onValueChange={setSelectedDisposition}>
              <SelectTrigger>
                <SelectValue placeholder="Select disposition..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="callback">Callback Requested</SelectItem>
                <SelectItem value="no-answer">No Answer</SelectItem>
                <SelectItem value="voicemail">Voicemail</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add call notes..."
              rows={4}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedDisposition}
            className="w-full"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit ACW
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
