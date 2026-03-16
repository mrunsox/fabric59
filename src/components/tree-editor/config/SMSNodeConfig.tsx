import { ScriptNode, SMSConfig, SMSSendScenario } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, AlertCircle, Webhook, Clock, Send, Phone, FileText, PhoneForwarded } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface SMSNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
  variables?: { name: string }[];
}

const sendScenarioOptions: { value: SMSSendScenario; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'on_transfer_warm', label: 'On Warm Transfer', description: 'Send when call is warm transferred', icon: <PhoneForwarded className="w-4 h-4" /> },
  { value: 'on_transfer_cold', label: 'On Cold Transfer', description: 'Send when call is cold transferred', icon: <Phone className="w-4 h-4" /> },
  { value: 'after_disposition', label: 'After Disposition', description: 'Send after agent selects disposition', icon: <FileText className="w-4 h-4" /> },
  { value: 'after_call_end', label: 'After Call End', description: 'Send when call concludes', icon: <Phone className="w-4 h-4" /> },
  { value: 'manual_trigger', label: 'Manual Trigger', description: 'Agent manually initiates send', icon: <Send className="w-4 h-4" /> },
  { value: 'on_schedule', label: 'Scheduled', description: 'Send after a delay', icon: <Clock className="w-4 h-4" /> },
];

export function SMSNodeConfig({ node, onUpdate, variables = [] }: SMSNodeConfigProps) {
  const config: SMSConfig = node.smsConfig || {
    providerId: '',
    recipientVariable: '',
    messageTemplate: '',
    optOutCheck: true,
    sendScenario: 'manual_trigger',
    webhookEnabled: false,
    trackDelivery: true,
    retryOnFailure: false,
  };

  const updateConfig = (updates: Partial<SMSConfig>) => {
    onUpdate({ smsConfig: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <MessageSquare className="w-4 h-4" />
        <span className="text-sm">Configure SMS node</span>
      </div>

      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="SMS node title"
        />
      </div>

      <div className="space-y-2">
        <Label>SMS Provider</Label>
        <Select 
          value={config.providerId} 
          onValueChange={(v) => updateConfig({ providerId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select provider from Integrations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="twilio">Twilio</SelectItem>
            <SelectItem value="messagebird">MessageBird</SelectItem>
            <SelectItem value="vonage">Vonage</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Configure providers in Settings → Integrations
        </p>
      </div>

      <div className="space-y-2">
        <Label>Recipient Variable</Label>
        <Select 
          value={config.recipientVariable} 
          onValueChange={(v) => updateConfig({ recipientVariable: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select phone number variable" />
          </SelectTrigger>
          <SelectContent>
            {variables.map(v => (
              <SelectItem key={v.name} value={v.name}>${v.name}</SelectItem>
            ))}
            <SelectItem value="caller_phone">$caller_phone</SelectItem>
            <SelectItem value="customer_phone">$customer_phone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Message Template</Label>
        <Textarea
          value={config.messageTemplate}
          onChange={(e) => updateConfig({ messageTemplate: e.target.value })}
          placeholder="Your appointment is confirmed for $date. Reply STOP to opt out."
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Use $variable syntax. Max 160 chars for standard SMS.
        </p>
        <div className="text-xs text-muted-foreground text-right">
          {config.messageTemplate.length} / 160 characters
        </div>
      </div>

      <Separator />

      {/* Send Scenario Section */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Send className="w-4 h-4" />
          Send Scenario
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {sendScenarioOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updateConfig({ sendScenario: option.value })}
              className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                config.sendScenario === option.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              {option.icon}
              <div>
                <p className="text-xs font-medium">{option.label}</p>
                <p className="text-[10px] text-muted-foreground">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {config.sendScenario === 'on_schedule' && (
        <div className="space-y-2">
          <Label>Delay (seconds)</Label>
          <Input
            type="number"
            value={config.delaySeconds || 0}
            onChange={(e) => updateConfig({ delaySeconds: parseInt(e.target.value) })}
            placeholder="30"
            min={0}
            max={3600}
          />
        </div>
      )}

      <Separator />

      {/* Delivery Tracking Section */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Delivery Tracking
        </Label>

        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
          <div className="space-y-0.5">
            <Label className="text-sm">Track Delivery Status</Label>
            <p className="text-xs text-muted-foreground">Monitor sent/delivered/failed status</p>
          </div>
          <Switch
            checked={config.trackDelivery}
            onCheckedChange={(checked) => updateConfig({ trackDelivery: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
          <div className="space-y-0.5">
            <Label className="text-sm">Retry on Failure</Label>
            <p className="text-xs text-muted-foreground">Auto-retry failed messages</p>
          </div>
          <Switch
            checked={config.retryOnFailure}
            onCheckedChange={(checked) => updateConfig({ retryOnFailure: checked })}
          />
        </div>

        {config.retryOnFailure && (
          <div className="space-y-2">
            <Label>Max Retries</Label>
            <Input
              type="number"
              value={config.maxRetries || 3}
              onChange={(e) => updateConfig({ maxRetries: parseInt(e.target.value) })}
              min={1}
              max={5}
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Webhook Section */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Webhook className="w-4 h-4" />
          Webhook Callbacks
        </Label>

        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
          <div className="space-y-0.5">
            <Label className="text-sm">Enable Webhooks</Label>
            <p className="text-xs text-muted-foreground">Receive delivery status callbacks</p>
          </div>
          <Switch
            checked={config.webhookEnabled}
            onCheckedChange={(checked) => updateConfig({ webhookEnabled: checked })}
          />
        </div>

        {config.webhookEnabled && (
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input
              value={config.webhookUrl || ''}
              onChange={(e) => updateConfig({ webhookUrl: e.target.value })}
              placeholder="https://your-api.com/sms-webhook"
            />
            <p className="text-xs text-muted-foreground">
              Receives POST with: messageId, status, timestamp, errorCode
            </p>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
        <div className="space-y-0.5">
          <Label className="text-sm">Opt-Out Verification</Label>
          <p className="text-xs text-muted-foreground">Check TCPA opt-out status before sending</p>
        </div>
        <Switch
          checked={config.optOutCheck}
          onCheckedChange={(checked) => updateConfig({ optOutCheck: checked })}
        />
      </div>

      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-600 dark:text-amber-400">
          <p className="font-medium">TCPA Compliance</p>
          <p>Ensure prior express consent before sending promotional SMS.</p>
        </div>
      </div>
    </div>
  );
}
