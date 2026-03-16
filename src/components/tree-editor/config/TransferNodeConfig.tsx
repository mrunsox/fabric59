import { ScriptNode, TransferConfig } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PhoneForwarded, Plus, X, Users, Phone, UserPlus } from 'lucide-react';
import { useState } from 'react';

interface TransferNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
}

export function TransferNodeConfig({ node, onUpdate }: TransferNodeConfigProps) {
  const config = node.transferConfig || { type: 'warm', destination: '', contextVariables: [] };
  const [newVar, setNewVar] = useState('');

  const updateConfig = (updates: Partial<TransferConfig>) => {
    onUpdate({
      transferConfig: { ...config, ...updates }
    });
  };

  const addContextVariable = () => {
    if (newVar && !config.contextVariables.includes(newVar)) {
      updateConfig({ contextVariables: [...config.contextVariables, newVar] });
      setNewVar('');
    }
  };

  const removeContextVariable = (varName: string) => {
    updateConfig({
      contextVariables: config.contextVariables.filter(v => v !== varName)
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Transfer Call"
        />
      </div>

      <div className="p-4 rounded-lg bg-node-call/20 border border-node-call/30">
        <div className="flex items-center gap-3">
          <PhoneForwarded className="w-8 h-8 text-node-call" />
          <div>
            <p className="font-medium">Call Transfer</p>
            <p className="text-sm text-muted-foreground">Route call with context</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Transfer Type</Label>
        <RadioGroup
          value={config.type}
          onValueChange={(value: TransferConfig['type']) => updateConfig({ type: value })}
          className="space-y-2"
        >
          <div className={`flex items-center space-x-3 p-3 rounded-lg border ${config.type === 'cold' ? 'border-node-call bg-node-call/10' : 'border-border'}`}>
            <RadioGroupItem value="cold" id="cold" />
            <Phone className="w-4 h-4" />
            <Label htmlFor="cold" className="flex-1 cursor-pointer">
              <span className="font-medium">Cold Transfer</span>
              <p className="text-xs text-muted-foreground">Transfer immediately without announcement</p>
            </Label>
          </div>
          <div className={`flex items-center space-x-3 p-3 rounded-lg border ${config.type === 'warm' ? 'border-node-call bg-node-call/10' : 'border-border'}`}>
            <RadioGroupItem value="warm" id="warm" />
            <UserPlus className="w-4 h-4" />
            <Label htmlFor="warm" className="flex-1 cursor-pointer">
              <span className="font-medium">Warm Transfer</span>
              <p className="text-xs text-muted-foreground">Announce caller before transfer</p>
            </Label>
          </div>
          <div className={`flex items-center space-x-3 p-3 rounded-lg border ${config.type === 'conference' ? 'border-node-call bg-node-call/10' : 'border-border'}`}>
            <RadioGroupItem value="conference" id="conference" />
            <Users className="w-4 h-4" />
            <Label htmlFor="conference" className="flex-1 cursor-pointer">
              <span className="font-medium">Conference</span>
              <p className="text-xs text-muted-foreground">Add party to existing call</p>
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Transfer Destination</Label>
        <Input
          value={config.destination}
          onChange={(e) => updateConfig({ destination: e.target.value })}
          placeholder="Extension, queue, or phone number"
        />
        <p className="text-xs text-muted-foreground">
          Examples: ext:1234, queue:support, +15551234567
        </p>
      </div>

      <div className="space-y-2">
        <Label>Context Variables to Pass</Label>
        <div className="flex gap-2">
          <Input
            value={newVar}
            onChange={(e) => setNewVar(e.target.value)}
            placeholder="$variableName"
            className="font-mono text-sm"
          />
          <Button variant="outline" onClick={addContextVariable}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.contextVariables.map((v) => (
            <div
              key={v}
              className="flex items-center gap-1 px-2 py-1 rounded bg-muted text-sm font-mono"
            >
              {v}
              <button
                onClick={() => removeContextVariable(v)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          These variables will be available to the receiving agent
        </p>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border border-border">
        <div>
          <p className="text-sm font-medium">Show Confirmation Dialog</p>
          <p className="text-xs text-muted-foreground">Agent confirms before transfer</p>
        </div>
        <Switch defaultChecked />
      </div>
    </div>
  );
}