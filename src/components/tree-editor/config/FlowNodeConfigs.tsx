import { ScriptNode, TreeLinkConfig, ComplianceConfig, ParallelConfig, ParallelBranch, LoopConfig, RandomizerConfig, RandomizerBranch, LoopExitBranch } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link2, FileCheck, GitMerge, RefreshCw, Dices, Plus, Trash2, Percent } from 'lucide-react';

interface NodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
  availableNodes?: { id: string; title: string }[];
  availableScripts?: { id: string; name: string }[];
}

// Tree Link Node Config
export function TreeLinkNodeConfig({ node, onUpdate, availableScripts = [] }: NodeConfigProps) {
  const config = node.treeLinkConfig || { targetScriptId: '', returnToNode: '' };

  const updateConfig = (updates: Partial<TreeLinkConfig>) => {
    onUpdate({ treeLinkConfig: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Link to Sub-Tree"
        />
      </div>

      <div className="p-4 rounded-lg bg-node-flow/20 border border-node-flow/30">
        <div className="flex items-center gap-3">
          <Link2 className="w-8 h-8 text-node-flow" />
          <div>
            <p className="font-medium">Tree Link</p>
            <p className="text-sm text-muted-foreground">Jump to another script tree</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Target Script</Label>
        <Select
          value={config.targetScriptId}
          onValueChange={(value) => updateConfig({ targetScriptId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a script..." />
          </SelectTrigger>
          <SelectContent>
            {availableScripts.length > 0 ? (
              availableScripts.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))
            ) : (
              <>
                <SelectItem value="upsell">Upsell Script</SelectItem>
                <SelectItem value="support">Technical Support</SelectItem>
                <SelectItem value="billing">Billing Inquiries</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Return Node (optional)</Label>
        <Input
          value={config.returnToNode || ''}
          onChange={(e) => updateConfig({ returnToNode: e.target.value })}
          placeholder="Node to return to after sub-tree"
        />
        <p className="text-xs text-muted-foreground">
          If set, control returns here after linked tree completes
        </p>
      </div>

      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground">
          All variables are inherited and returned data is merged
        </p>
      </div>
    </div>
  );
}

// Compliance Record Node Config
export function ComplianceNodeConfig({ node, onUpdate }: NodeConfigProps) {
  const config = node.complianceConfig || { type: 'consent', requiredConfirmation: true, logToAudit: true };

  const updateConfig = (updates: Partial<ComplianceConfig>) => {
    onUpdate({ complianceConfig: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Compliance Record"
        />
      </div>

      <div className="p-4 rounded-lg bg-node-flow/20 border border-node-flow/30">
        <div className="flex items-center gap-3">
          <FileCheck className="w-8 h-8 text-node-flow" />
          <div>
            <p className="font-medium">Compliance Recording</p>
            <p className="text-sm text-muted-foreground">Log consents for audit trail</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Compliance Type</Label>
        <Select
          value={config.type}
          onValueChange={(value: ComplianceConfig['type']) => updateConfig({ type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="consent">Consent</SelectItem>
            <SelectItem value="disclosure">Disclosure</SelectItem>
            <SelectItem value="verification">Identity Verification</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Confirmation Text</Label>
        <Textarea
          value={node.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="I confirm that I have read and understood the terms..."
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium">Require Explicit Confirmation</p>
            <p className="text-xs text-muted-foreground">Agent must check box to proceed</p>
          </div>
          <Switch
            checked={config.requiredConfirmation}
            onCheckedChange={(checked) => updateConfig({ requiredConfirmation: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium">Log to Audit Trail</p>
            <p className="text-xs text-muted-foreground">Record timestamp and details</p>
          </div>
          <Switch
            checked={config.logToAudit}
            onCheckedChange={(checked) => updateConfig({ logToAudit: checked })}
          />
        </div>
      </div>

      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground">
          Variable: $compliance_signed (true when confirmed)
        </p>
      </div>
    </div>
  );
}

// Parallel Branch Node Config
export function ParallelNodeConfig({ node, onUpdate, availableNodes = [] }: NodeConfigProps) {
  const config = node.parallelConfig || { branches: [], waitForAll: true };

  const updateConfig = (updates: Partial<ParallelConfig>) => {
    onUpdate({ parallelConfig: { ...config, ...updates } });
  };

  const addBranch = () => {
    const newBranch: ParallelBranch = {
      id: crypto.randomUUID(),
      name: `Branch ${config.branches.length + 1}`,
      targetNodeId: ''
    };
    updateConfig({ branches: [...config.branches, newBranch] });
  };

  const updateBranch = (id: string, updates: Partial<ParallelBranch>) => {
    updateConfig({
      branches: config.branches.map(b => b.id === id ? { ...b, ...updates } : b)
    });
  };

  const removeBranch = (id: string) => {
    updateConfig({ branches: config.branches.filter(b => b.id !== id) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Parallel Actions"
        />
      </div>

      <div className="p-4 rounded-lg bg-node-flow/20 border border-node-flow/30">
        <div className="flex items-center gap-3">
          <GitMerge className="w-8 h-8 text-node-flow" />
          <div>
            <p className="font-medium">Parallel Branches</p>
            <p className="text-sm text-muted-foreground">Execute multiple paths simultaneously</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Branches (max 5)</Label>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={addBranch}
            disabled={config.branches.length >= 5}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Branch
          </Button>
        </div>

        <div className="space-y-2">
          {config.branches.map((branch, index) => (
            <div key={branch.id} className="flex items-center gap-2 p-2 rounded-lg border border-border">
              <div className="w-6 h-6 rounded bg-node-flow/20 flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
              <Input
                value={branch.name}
                onChange={(e) => updateBranch(branch.id, { name: e.target.value })}
                placeholder="Branch name"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => removeBranch(branch.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border border-border">
        <div>
          <p className="text-sm font-medium">Wait for All Branches</p>
          <p className="text-xs text-muted-foreground">Continue only when all complete</p>
        </div>
        <Switch
          checked={config.waitForAll}
          onCheckedChange={(checked) => updateConfig({ waitForAll: checked })}
        />
      </div>

      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground">
          All child branch outputs are merged
        </p>
      </div>
    </div>
  );
}

// Loop Node Config
export function LoopNodeConfig({ node, onUpdate }: NodeConfigProps) {
  const config = node.loopConfig || { condition: '', maxIterations: 5, exitBranches: [] };

  const updateConfig = (updates: Partial<LoopConfig>) => {
    onUpdate({ loopConfig: { ...config, ...updates } });
  };

  const addExitBranch = () => {
    const newBranch: LoopExitBranch = {
      id: crypto.randomUUID(),
      name: 'Exit Branch',
      condition: '',
      targetNodeId: ''
    };
    updateConfig({ exitBranches: [...config.exitBranches, newBranch] });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Loop"
        />
      </div>

      <div className="p-4 rounded-lg bg-node-flow/20 border border-node-flow/30">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-8 h-8 text-node-flow" />
          <div>
            <p className="font-medium">Loop Control</p>
            <p className="text-sm text-muted-foreground">Repeat until condition met</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Repeat Condition</Label>
        <Input
          value={config.condition}
          onChange={(e) => updateConfig({ condition: e.target.value })}
          placeholder="$attempts < 3"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Loop continues while this condition is true
        </p>
      </div>

      <div className="space-y-2">
        <Label>Max Iterations (safety limit)</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[config.maxIterations]}
            onValueChange={([value]) => updateConfig({ maxIterations: value })}
            max={10}
            min={1}
            step={1}
            className="flex-1"
          />
          <span className="font-mono w-8 text-center">{config.maxIterations}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Exit Branches</Label>
          <Button variant="outline" size="sm" onClick={addExitBranch}>
            <Plus className="w-4 h-4 mr-1" />
            Add Exit
          </Button>
        </div>
        {config.exitBranches.map((branch) => (
          <div key={branch.id} className="p-2 rounded-lg border border-border space-y-2">
            <Input
              value={branch.name}
              onChange={(e) => updateConfig({
                exitBranches: config.exitBranches.map(b => 
                  b.id === branch.id ? { ...b, name: e.target.value } : b
                )
              })}
              placeholder="Exit condition name"
            />
            <Input
              value={branch.condition}
              onChange={(e) => updateConfig({
                exitBranches: config.exitBranches.map(b => 
                  b.id === branch.id ? { ...b, condition: e.target.value } : b
                )
              })}
              placeholder="$condition === 'value'"
              className="font-mono text-sm"
            />
          </div>
        ))}
      </div>

      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground">
          Variable: $loop_count (current iteration)
        </p>
      </div>
    </div>
  );
}

// Randomizer Node Config
export function RandomizerNodeConfig({ node, onUpdate }: NodeConfigProps) {
  const config = node.randomizerConfig || { branches: [], seed: '' };

  const updateConfig = (updates: Partial<RandomizerConfig>) => {
    onUpdate({ randomizerConfig: { ...config, ...updates } });
  };

  const addBranch = () => {
    const newBranch: RandomizerBranch = {
      id: crypto.randomUUID(),
      name: `Option ${config.branches.length + 1}`,
      weight: 50,
      targetNodeId: ''
    };
    updateConfig({ branches: [...config.branches, newBranch] });
  };

  const updateBranch = (id: string, updates: Partial<RandomizerBranch>) => {
    updateConfig({
      branches: config.branches.map(b => b.id === id ? { ...b, ...updates } : b)
    });
  };

  const removeBranch = (id: string) => {
    updateConfig({ branches: config.branches.filter(b => b.id !== id) });
  };

  const totalWeight = config.branches.reduce((sum, b) => sum + b.weight, 0);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Randomizer"
        />
      </div>

      <div className="p-4 rounded-lg bg-node-flow/20 border border-node-flow/30">
        <div className="flex items-center gap-3">
          <Dices className="w-8 h-8 text-node-flow" />
          <div>
            <p className="font-medium">Random Selection</p>
            <p className="text-sm text-muted-foreground">Weighted probability routing</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Probability Branches</Label>
          <Button variant="outline" size="sm" onClick={addBranch}>
            <Plus className="w-4 h-4 mr-1" />
            Add Branch
          </Button>
        </div>

        <div className="space-y-3">
          {config.branches.map((branch) => (
            <div key={branch.id} className="p-3 rounded-lg border border-border space-y-2">
              <div className="flex items-center gap-2">
                <Dices className="w-4 h-4 text-node-flow" />
                <Input
                  value={branch.name}
                  onChange={(e) => updateBranch(branch.id, { name: e.target.value })}
                  placeholder="Branch name"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeBranch(branch.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    Probability
                  </span>
                  <span className="font-mono">{branch.weight}%</span>
                </div>
                <Slider
                  value={[branch.weight]}
                  onValueChange={([value]) => updateBranch(branch.id, { weight: value })}
                  max={100}
                  step={5}
                />
              </div>
            </div>
          ))}
        </div>

        {config.branches.length > 0 && (
          <div className={`p-3 rounded-lg ${totalWeight === 100 ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
            <div className="flex items-center justify-between text-sm">
              <span>Total probability:</span>
              <span className={`font-mono font-bold ${totalWeight === 100 ? 'text-green-500' : 'text-yellow-500'}`}>
                {totalWeight}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground">
          Variable: $random_seed (for reproducibility)
        </p>
      </div>
    </div>
  );
}