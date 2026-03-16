import { ScriptNode, LogicRule } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, ArrowRight } from 'lucide-react';

interface LogicNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
  availableNodes?: { id: string; title: string }[];
}

export function LogicNodeConfig({ node, onUpdate, availableNodes = [] }: LogicNodeConfigProps) {
  const rules = node.logicRules || [];

  const addRule = () => {
    const newRule: LogicRule = {
      id: crypto.randomUUID(),
      variable: '',
      operator: 'equals',
      value: '',
      targetNodeId: ''
    };
    onUpdate({ logicRules: [...rules, newRule] });
  };

  const updateRule = (id: string, updates: Partial<LogicRule>) => {
    onUpdate({
      logicRules: rules.map(r => r.id === id ? { ...r, ...updates } : r)
    });
  };

  const removeRule = (id: string) => {
    onUpdate({ logicRules: rules.filter(r => r.id !== id) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Logic Branch"
        />
      </div>

      <div className="p-3 rounded-lg bg-node-logic/20 border border-node-logic/30">
        <p className="text-sm text-muted-foreground">
          Logic nodes are invisible at runtime. They evaluate conditions and automatically route to the matching branch.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Conditions (IF/THEN)</Label>
          <Button variant="outline" size="sm" onClick={addRule}>
            <Plus className="w-4 h-4 mr-1" />
            Add Condition
          </Button>
        </div>

        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div key={rule.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {index === 0 ? 'IF' : 'ELSE IF'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => removeRule(rule.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={rule.variable}
                  onChange={(e) => updateRule(rule.id, { variable: e.target.value })}
                  placeholder="$variable"
                  className="font-mono text-sm"
                />
                <Select
                  value={rule.operator}
                  onValueChange={(value: LogicRule['operator']) => updateRule(rule.id, { operator: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">equals</SelectItem>
                    <SelectItem value="contains">contains</SelectItem>
                    <SelectItem value="greater">greater than</SelectItem>
                    <SelectItem value="less">less than</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={rule.value}
                  onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                  placeholder="value"
                />
              </div>

              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">THEN go to:</span>
                <Select
                  value={rule.targetNodeId}
                  onValueChange={(value) => updateRule(rule.id, { targetNodeId: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select target node..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNodes.map((n) => (
                      <SelectItem key={n.id} value={n.id}>{n.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          {/* Else branch */}
          <div className="p-3 rounded-lg border border-dashed border-border bg-muted/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">ELSE</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">go to:</span>
              <Select>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Default branch..." />
                </SelectTrigger>
                <SelectContent>
                  {availableNodes.map((n) => (
                    <SelectItem key={n.id} value={n.id}>{n.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}