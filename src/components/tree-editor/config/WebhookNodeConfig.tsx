import { ScriptNode, WebhookConfig } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Webhook, Plus, Trash2, Play } from 'lucide-react';
import { useState } from 'react';

interface WebhookNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
}

export function WebhookNodeConfig({ node, onUpdate }: WebhookNodeConfigProps) {
  const config = node.webhookConfig || { url: '', method: 'POST', headers: {}, bodyTemplate: '' };
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>(
    Object.entries(config.headers || {}).map(([key, value]) => ({ key, value: String(value) }))
  );

  const updateConfig = (updates: Partial<WebhookConfig>) => {
    onUpdate({
      webhookConfig: { ...config, ...updates }
    });
  };

  const updateHeaders = (newHeaders: { key: string; value: string }[]) => {
    setHeaders(newHeaders);
    const headersObj = newHeaders.reduce((acc, h) => {
      if (h.key) acc[h.key] = h.value;
      return acc;
    }, {} as Record<string, string>);
    updateConfig({ headers: headersObj });
  };

  const addHeader = () => {
    updateHeaders([...headers, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    updateHeaders(headers.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="API/Webhook"
        />
      </div>

      <div className="p-4 rounded-lg bg-node-integration/20 border border-node-integration/30">
        <div className="flex items-center gap-3">
          <Webhook className="w-8 h-8 text-node-integration" />
          <div>
            <p className="font-medium">External API Call</p>
            <p className="text-sm text-muted-foreground">Push data to telephony/CRMs</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Request Method</Label>
        <Select
          value={config.method}
          onValueChange={(value: WebhookConfig['method']) => updateConfig({ method: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Endpoint URL</Label>
        <Input
          value={config.url}
          onChange={(e) => updateConfig({ url: e.target.value })}
          placeholder="https://api.example.com/webhook"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Headers</Label>
          <Button variant="ghost" size="sm" onClick={addHeader}>
            <Plus className="w-4 h-4 mr-1" />
            Add Header
          </Button>
        </div>
        <div className="space-y-2">
          {headers.map((header, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={header.key}
                onChange={(e) => {
                  const newHeaders = [...headers];
                  newHeaders[index].key = e.target.value;
                  updateHeaders(newHeaders);
                }}
                placeholder="Key"
                className="flex-1"
              />
              <Input
                value={header.value}
                onChange={(e) => {
                  const newHeaders = [...headers];
                  newHeaders[index].value = e.target.value;
                  updateHeaders(newHeaders);
                }}
                placeholder="Value"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive"
                onClick={() => removeHeader(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {config.method !== 'GET' && (
        <div className="space-y-2">
          <Label>Request Body (JSON)</Label>
          <Textarea
            value={config.bodyTemplate || ''}
            onChange={(e) => updateConfig({ bodyTemplate: e.target.value })}
            placeholder={`{
  "phone": "{$customerPhone}",
  "disposition": "{$disposition}",
  "duration": "{$call_duration}"
}`}
            rows={6}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Use {'{$variableName}'} to inject call variables
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Response Handling</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10">
            <p className="text-xs font-medium text-green-600">On Success</p>
            <p className="text-xs text-muted-foreground">Continue to next node</p>
          </div>
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10">
            <p className="text-xs font-medium text-destructive">On Failure</p>
            <p className="text-xs text-muted-foreground">Show error & retry</p>
          </div>
        </div>
      </div>

      <Button variant="outline" className="w-full">
        <Play className="w-4 h-4 mr-2" />
        Test Webhook
      </Button>

      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground">
          Response stored in: $api_response
        </p>
      </div>
    </div>
  );
}