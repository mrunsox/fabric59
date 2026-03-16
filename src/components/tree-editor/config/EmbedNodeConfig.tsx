import { ScriptNode, EmbedConfig } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExternalLink, Calendar, CreditCard, FileText } from 'lucide-react';

interface EmbedNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
}

const EMBED_PRESETS = [
  { value: 'calendly', label: 'Calendly', icon: Calendar, placeholder: 'https://calendly.com/your-link' },
  { value: 'stripe', label: 'Stripe Checkout', icon: CreditCard, placeholder: 'https://checkout.stripe.com/...' },
  { value: 'typeform', label: 'Typeform', icon: FileText, placeholder: 'https://form.typeform.com/to/...' },
  { value: 'custom', label: 'Custom URL', icon: ExternalLink, placeholder: 'https://...' },
];

export function EmbedNodeConfig({ node, onUpdate }: EmbedNodeConfigProps) {
  const config = node.embedConfig || { url: '', width: '100%', height: '400px' };

  const updateConfig = (updates: Partial<EmbedConfig>) => {
    onUpdate({
      embedConfig: { ...config, ...updates }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="External Content"
        />
      </div>

      <div className="p-4 rounded-lg bg-node-integration/20 border border-node-integration/30">
        <div className="flex items-center gap-3">
          <ExternalLink className="w-8 h-8 text-node-integration" />
          <div>
            <p className="font-medium">Embedded Content</p>
            <p className="text-sm text-muted-foreground">Display external tools in iframe</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Embed Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {EMBED_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.value}
                className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-node-integration/50 transition-colors text-left"
                onClick={() => updateConfig({ url: '' })}
              >
                <Icon className="w-5 h-5 text-node-integration" />
                <span className="text-sm font-medium">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>iframe URL</Label>
        <Input
          value={config.url}
          onChange={(e) => updateConfig({ url: e.target.value })}
          placeholder="https://calendly.com/your-scheduling-link"
        />
        <p className="text-xs text-muted-foreground">
          URL must allow iframe embedding (X-Frame-Options)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Width</Label>
          <Select
            value={config.width}
            onValueChange={(value) => updateConfig({ width: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="100%">Full Width</SelectItem>
              <SelectItem value="80%">80%</SelectItem>
              <SelectItem value="600px">600px</SelectItem>
              <SelectItem value="800px">800px</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Height</Label>
          <Select
            value={config.height}
            onValueChange={(value) => updateConfig({ height: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="300px">300px</SelectItem>
              <SelectItem value="400px">400px</SelectItem>
              <SelectItem value="500px">500px</SelectItem>
              <SelectItem value="600px">600px</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {config.url && (
        <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
          <div className="p-2 bg-muted/30 text-xs text-muted-foreground">
            Preview
          </div>
          <div className="aspect-video bg-background flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <ExternalLink className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Iframe will load: {config.url}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between p-3 rounded-lg border border-border">
        <div>
          <p className="text-sm font-medium">Show Continue Button</p>
          <p className="text-xs text-muted-foreground">Allow agent to proceed after viewing</p>
        </div>
        <Switch defaultChecked />
      </div>

      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground">
          Variable: $embed_complete (true when Continue clicked)
        </p>
      </div>
    </div>
  );
}