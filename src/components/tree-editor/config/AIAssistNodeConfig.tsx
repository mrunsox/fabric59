import { ScriptNode, AIAssistConfig } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bot, Mic, Sparkles, AlertCircle } from 'lucide-react';

interface AIAssistNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
}

export function AIAssistNodeConfig({ node, onUpdate }: AIAssistNodeConfigProps) {
  const config = node.aiAssistConfig || { model: 'gpt-4', promptTemplate: '', transcriptionEnabled: true };

  const updateConfig = (updates: Partial<AIAssistConfig>) => {
    onUpdate({
      aiAssistConfig: { ...config, ...updates }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="AI Assist"
        />
      </div>

      <div className="p-4 rounded-lg bg-gradient-to-br from-node-ai/20 to-purple-500/20 border border-node-ai/30">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-node-ai" />
          <div>
            <p className="font-medium">AI-Powered Assistance</p>
            <p className="text-sm text-muted-foreground">Real-time suggestions from transcription</p>
          </div>
          <Sparkles className="w-5 h-5 text-yellow-500 ml-auto" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>AI Model</Label>
        <Select
          value={config.model}
          onValueChange={(value: AIAssistConfig['model']) => updateConfig({ model: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                GPT-4 (Recommended)
              </div>
            </SelectItem>
            <SelectItem value="claude">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                Claude 3
              </div>
            </SelectItem>
            <SelectItem value="custom">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Custom Endpoint
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Live Transcription</p>
            <p className="text-xs text-muted-foreground">Analyze conversation in real-time</p>
          </div>
        </div>
        <Switch
          checked={config.transcriptionEnabled}
          onCheckedChange={(checked) => updateConfig({ transcriptionEnabled: checked })}
        />
      </div>

      <div className="space-y-2">
        <Label>Prompt Template</Label>
        <Textarea
          value={config.promptTemplate}
          onChange={(e) => updateConfig({ promptTemplate: e.target.value })}
          placeholder={`You are a helpful call center assistant. Analyze the conversation and:
1. Detect customer sentiment (happy, neutral, frustrated)
2. Suggest relevant responses
3. Flag compliance issues

Current transcript: {$transcript}
Customer info: {$customerName}, {$accountTier}`}
          rows={8}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Use variables like {'{$transcript}'} to inject call data
        </p>
      </div>

      <div className="space-y-3">
        <Label>Sidebar Display</Label>
        <div className="p-3 rounded-lg border border-node-ai/30 bg-node-ai/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">AI Suggestion Preview</p>
              <p className="text-xs text-muted-foreground mt-1">
                "Caller seems frustrated. Consider offering a callback or supervisor escalation."
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground">
          Variable: $ai_suggestion (latest AI response)
        </p>
      </div>
    </div>
  );
}