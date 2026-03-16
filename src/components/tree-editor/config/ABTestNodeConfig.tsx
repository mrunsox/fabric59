import { ScriptNode, ABTestConfig, ABTestVariant } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2, Split, Percent } from 'lucide-react';

interface ABTestNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
  availableNodes?: { id: string; title: string }[];
}

export function ABTestNodeConfig({ node, onUpdate, availableNodes = [] }: ABTestNodeConfigProps) {
  const config = node.abTestConfig || { variants: [], distribution: 'equal' };

  const updateConfig = (updates: Partial<ABTestConfig>) => {
    onUpdate({
      abTestConfig: { ...config, ...updates }
    });
  };

  const addVariant = () => {
    const newVariant: ABTestVariant = {
      id: crypto.randomUUID(),
      name: `Variant ${String.fromCharCode(65 + config.variants.length)}`,
      weight: 50,
      targetNodeId: ''
    };
    updateConfig({ variants: [...config.variants, newVariant] });
  };

  const updateVariant = (id: string, updates: Partial<ABTestVariant>) => {
    updateConfig({
      variants: config.variants.map(v => v.id === id ? { ...v, ...updates } : v)
    });
  };

  const removeVariant = (id: string) => {
    updateConfig({ variants: config.variants.filter(v => v.id !== id) });
  };

  const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="A/B Test"
        />
      </div>

      <div className="p-4 rounded-lg bg-node-ai/20 border border-node-ai/30">
        <div className="flex items-center gap-3">
          <Split className="w-8 h-8 text-node-ai" />
          <div>
            <p className="font-medium">Variant Testing</p>
            <p className="text-sm text-muted-foreground">Test different script paths</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Distribution Method</Label>
        <RadioGroup
          value={config.distribution}
          onValueChange={(value: ABTestConfig['distribution']) => updateConfig({ distribution: value })}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="equal" id="equal" />
            <Label htmlFor="equal" className="font-normal">Equal Split</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="weighted" id="weighted" />
            <Label htmlFor="weighted" className="font-normal">Weighted</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Test Variants</Label>
          <Button variant="outline" size="sm" onClick={addVariant}>
            <Plus className="w-4 h-4 mr-1" />
            Add Variant
          </Button>
        </div>

        <div className="space-y-3">
          {config.variants.map((variant, index) => (
            <div key={variant.id} className="p-3 rounded-lg border border-border space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-blue-500/20 text-blue-500' : 
                  index === 1 ? 'bg-green-500/20 text-green-500' :
                  'bg-orange-500/20 text-orange-500'
                }`}>
                  {String.fromCharCode(65 + index)}
                </div>
                <Input
                  value={variant.name}
                  onChange={(e) => updateVariant(variant.id, { name: e.target.value })}
                  placeholder="Variant name"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeVariant(variant.id)}
                  disabled={config.variants.length <= 2}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {config.distribution === 'weighted' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      Weight
                    </span>
                    <span className="font-mono">{variant.weight}%</span>
                  </div>
                  <Slider
                    value={[variant.weight]}
                    onValueChange={([value]) => updateVariant(variant.id, { weight: value })}
                    max={100}
                    step={5}
                  />
                </div>
              )}
            </div>
          ))}

          {config.variants.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
              Add at least 2 variants to start testing
            </div>
          )}
        </div>

        {config.variants.length > 0 && config.distribution === 'weighted' && (
          <div className={`p-3 rounded-lg ${totalWeight === 100 ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
            <div className="flex items-center justify-between text-sm">
              <span>Total distribution:</span>
              <span className={`font-mono font-bold ${totalWeight === 100 ? 'text-green-500' : 'text-yellow-500'}`}>
                {totalWeight}%
              </span>
            </div>
            {totalWeight !== 100 && (
              <p className="text-xs text-yellow-600 mt-1">
                Weights should add up to 100%
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Track Conversion Event</Label>
        <Input
          placeholder="completed_sale, booked_appointment..."
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Measure which variant performs better
        </p>
      </div>

      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs text-muted-foreground">
          Variable: $ab_variant (assigned variant name)
        </p>
      </div>
    </div>
  );
}