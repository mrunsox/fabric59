import { ScriptNode, AudioConfig } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Volume2, Upload, Play, Pause, Mic } from 'lucide-react';
import { useState } from 'react';

interface AudioNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
}

export function AudioNodeConfig({ node, onUpdate }: AudioNodeConfigProps) {
  const config = node.audioConfig || { type: 'tts', text: '', autoPlay: true };
  const [isPlaying, setIsPlaying] = useState(false);

  const updateConfig = (updates: Partial<AudioConfig>) => {
    onUpdate({
      audioConfig: { ...config, ...updates }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Audio Prompt"
        />
      </div>

      <div className="p-4 rounded-lg bg-node-call/20 border border-node-call/30">
        <div className="flex items-center gap-3">
          <Volume2 className="w-8 h-8 text-node-call" />
          <div>
            <p className="font-medium">Audio Playback</p>
            <p className="text-sm text-muted-foreground">Play TTS or recorded audio</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Audio Type</Label>
        <RadioGroup
          value={config.type}
          onValueChange={(value: AudioConfig['type']) => updateConfig({ type: value })}
          className="grid grid-cols-2 gap-3"
        >
          <div className={`flex items-center space-x-2 p-3 rounded-lg border ${config.type === 'tts' ? 'border-node-call bg-node-call/10' : 'border-border'}`}>
            <RadioGroupItem value="tts" id="tts" />
            <Label htmlFor="tts" className="flex items-center gap-2 cursor-pointer">
              <Mic className="w-4 h-4" />
              Text-to-Speech
            </Label>
          </div>
          <div className={`flex items-center space-x-2 p-3 rounded-lg border ${config.type === 'recording' ? 'border-node-call bg-node-call/10' : 'border-border'}`}>
            <RadioGroupItem value="recording" id="recording" />
            <Label htmlFor="recording" className="flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload MP3
            </Label>
          </div>
        </RadioGroup>
      </div>

      {config.type === 'tts' ? (
        <div className="space-y-2">
          <Label>Text to Speak</Label>
          <Textarea
            value={config.text || ''}
            onChange={(e) => updateConfig({ text: e.target.value })}
            placeholder="Enter the text that will be converted to speech..."
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Variables like {'{$customerName}'} will be replaced before speaking
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Audio File</Label>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drop MP3 file here or click to upload
            </p>
            <Button variant="outline" size="sm">
              Choose File
            </Button>
          </div>
          {config.audioUrl && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <div className="flex-1 h-1 bg-muted rounded-full">
                <div className="h-full w-1/3 bg-node-call rounded-full" />
              </div>
              <span className="text-xs text-muted-foreground">0:12</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between p-3 rounded-lg border border-border">
        <div>
          <p className="text-sm font-medium">Auto-Play</p>
          <p className="text-xs text-muted-foreground">Play automatically when node loads</p>
        </div>
        <Switch
          checked={config.autoPlay}
          onCheckedChange={(checked) => updateConfig({ autoPlay: checked })}
        />
      </div>

      <div className="space-y-2">
        <Label>Text Overlay (shown during playback)</Label>
        <Input
          value={node.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Please listen to this important message..."
        />
      </div>
    </div>
  );
}