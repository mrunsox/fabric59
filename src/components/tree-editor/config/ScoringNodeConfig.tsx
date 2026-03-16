import { ScriptNode, ScoringConfig, ScoringCriterion } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Plus, Trash2, Star, Target } from 'lucide-react';

interface ScoringNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
}

export function ScoringNodeConfig({ node, onUpdate }: ScoringNodeConfigProps) {
  const config = node.scoringConfig || { criteria: [], passThreshold: 70 };

  const updateConfig = (updates: Partial<ScoringConfig>) => {
    onUpdate({
      scoringConfig: { ...config, ...updates }
    });
  };

  const addCriterion = () => {
    const newCriterion: ScoringCriterion = {
      id: crypto.randomUUID(),
      name: 'New Criterion',
      weight: 10,
      keywords: []
    };
    updateConfig({ criteria: [...config.criteria, newCriterion] });
  };

  const updateCriterion = (id: string, updates: Partial<ScoringCriterion>) => {
    updateConfig({
      criteria: config.criteria.map(c => c.id === id ? { ...c, ...updates } : c)
    });
  };

  const removeCriterion = (id: string) => {
    updateConfig({ criteria: config.criteria.filter(c => c.id !== id) });
  };

  const totalWeight = config.criteria.reduce((sum, c) => sum + c.weight, 0);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Call Scoring"
        />
      </div>

      <div className="p-4 rounded-lg bg-node-ai/20 border border-node-ai/30">
        <div className="flex items-center gap-3">
          <Target className="w-8 h-8 text-node-ai" />
          <div>
            <p className="font-medium">Quality Scoring</p>
            <p className="text-sm text-muted-foreground">Evaluate call compliance & quality</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Pass Threshold</Label>
          <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
            {config.passThreshold}%
          </span>
        </div>
        <Slider
          value={[config.passThreshold]}
          onValueChange={([value]) => updateConfig({ passThreshold: value })}
          max={100}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0% (All fail)</span>
          <span>100% (All pass)</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Scoring Criteria</Label>
          <Button variant="outline" size="sm" onClick={addCriterion}>
            <Plus className="w-4 h-4 mr-1" />
            Add Criterion
          </Button>
        </div>

        <div className="space-y-3">
          {config.criteria.map((criterion) => (
            <div key={criterion.id} className="p-3 rounded-lg border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <Input
                  value={criterion.name}
                  onChange={(e) => updateCriterion(criterion.id, { name: e.target.value })}
                  placeholder="Criterion name"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeCriterion(criterion.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Weight</span>
                  <span className="font-mono">{criterion.weight} pts</span>
                </div>
                <Slider
                  value={[criterion.weight]}
                  onValueChange={([value]) => updateCriterion(criterion.id, { weight: value })}
                  max={50}
                  step={5}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Trigger Keywords (optional)</Label>
                <Input
                  value={criterion.keywords?.join(', ') || ''}
                  onChange={(e) => updateCriterion(criterion.id, { 
                    keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                  })}
                  placeholder="upsell, upgrade, premium"
                  className="text-sm"
                />
              </div>
            </div>
          ))}

          {config.criteria.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
              Add scoring criteria to evaluate calls
            </div>
          )}
        </div>

        {config.criteria.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between text-sm">
              <span>Total possible score:</span>
              <span className="font-mono font-bold">{totalWeight} pts</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground">
          Variable: $call_score (running total during call)
        </p>
      </div>
    </div>
  );
}