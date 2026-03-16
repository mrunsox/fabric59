import { ScriptNode, TimerConfig } from '@/types/script';
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
import { Clock, AlertTriangle } from 'lucide-react';

interface TimerNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
}

export function TimerNodeConfig({ node, onUpdate }: TimerNodeConfigProps) {
  const config = node.timerConfig || { duration: 300, alertAt: [60], action: 'warn' };

  const updateConfig = (updates: Partial<TimerConfig>) => {
    onUpdate({
      timerConfig: { ...config, ...updates }
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return { mins, secs };
  };

  const parseTime = (mins: number, secs: number) => {
    return mins * 60 + secs;
  };

  const { mins, secs } = formatTime(config.duration);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Call Timer"
        />
      </div>

      <div className="p-4 rounded-lg bg-node-call/20 border border-node-call/30">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-node-call" />
          <div>
            <p className="font-medium">Persistent Countdown</p>
            <p className="text-sm text-muted-foreground">Timer displays in header during call</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Duration (MM:SS)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={59}
            value={mins}
            onChange={(e) => updateConfig({ duration: parseTime(parseInt(e.target.value) || 0, secs) })}
            className="w-20 text-center"
          />
          <span className="text-xl font-mono">:</span>
          <Input
            type="number"
            min={0}
            max={59}
            value={secs}
            onChange={(e) => updateConfig({ duration: parseTime(mins, parseInt(e.target.value) || 0) })}
            className="w-20 text-center"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Warning Alert At (seconds remaining)</Label>
        <div className="flex flex-wrap gap-2">
          {[30, 60, 120].map((sec) => (
            <button
              key={sec}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                config.alertAt.includes(sec)
                  ? 'border-node-call bg-node-call/20 text-node-call'
                  : 'border-border bg-muted/20 text-muted-foreground hover:border-node-call/50'
              }`}
              onClick={() => {
                const newAlerts = config.alertAt.includes(sec)
                  ? config.alertAt.filter(a => a !== sec)
                  : [...config.alertAt, sec].sort((a, b) => b - a);
                updateConfig({ alertAt: newAlerts });
              }}
            >
              {sec}s
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Alert Style at 60s</Label>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/10">
          <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
          <span className="text-sm">Blink red indicator</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>When Timer Expires</Label>
        <Select
          value={config.action}
          onValueChange={(value: TimerConfig['action']) => updateConfig({ action: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="warn">Show warning only</SelectItem>
            <SelectItem value="auto-advance">Auto-advance to next node</SelectItem>
            <SelectItem value="none">Do nothing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground">
          Variable: $time_remaining (updates in real-time)
        </p>
      </div>
    </div>
  );
}