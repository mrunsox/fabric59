import { ScriptNode, CalendarConfig } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock } from 'lucide-react';

interface CalendarNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
}

export function CalendarNodeConfig({ node, onUpdate }: CalendarNodeConfigProps) {
  const config: CalendarConfig = node.calendarConfig || {
    providerId: '',
    bookingDuration: 30,
    bufferTime: 15,
    autoConfirm: false
  };

  const updateConfig = (updates: Partial<CalendarConfig>) => {
    onUpdate({ calendarConfig: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span className="text-sm">Configure calendar booking</span>
      </div>

      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Calendar node title"
        />
      </div>

      <div className="space-y-2">
        <Label>Calendar Provider</Label>
        <Select 
          value={config.providerId} 
          onValueChange={(v) => updateConfig({ providerId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select provider from Integrations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="google_calendar">Google Calendar</SelectItem>
            <SelectItem value="outlook">Microsoft Outlook</SelectItem>
            <SelectItem value="calendly">Calendly</SelectItem>
            <SelectItem value="acuity">Acuity Scheduling</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Configure providers in Settings → Integrations
        </p>
      </div>

      <div className="space-y-2">
        <Label>Availability Endpoint (Optional)</Label>
        <Input
          value={config.availabilityEndpoint || ''}
          onChange={(e) => updateConfig({ availabilityEndpoint: e.target.value })}
          placeholder="https://api.provider.com/availability"
        />
        <p className="text-xs text-muted-foreground">
          Custom endpoint for real-time availability lookup
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Booking Duration
          </Label>
          <Select 
            value={config.bookingDuration.toString()} 
            onValueChange={(v) => updateConfig({ bookingDuration: parseInt(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Buffer Time
          </Label>
          <Select 
            value={config.bufferTime.toString()} 
            onValueChange={(v) => updateConfig({ bufferTime: parseInt(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No buffer</SelectItem>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="10">10 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
        <div className="space-y-0.5">
          <Label className="text-sm">Auto-Confirm Booking</Label>
          <p className="text-xs text-muted-foreground">
            Automatically confirm without manual review
          </p>
        </div>
        <Switch
          checked={config.autoConfirm}
          onCheckedChange={(checked) => updateConfig({ autoConfirm: checked })}
        />
      </div>

      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
        <p className="text-xs text-primary">
          <span className="font-medium">Stored Variables:</span> $booking_date, $booking_time, $booking_id
        </p>
      </div>
    </div>
  );
}
