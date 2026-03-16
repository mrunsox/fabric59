import { ScriptNode, NodeOption } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface QuestionNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
}

export function QuestionNodeConfig({ node, onUpdate }: QuestionNodeConfigProps) {
  const options = node.options || [];
  const layout = 'vertical'; // TODO: Add to node type

  const addOption = () => {
    const newOption: NodeOption = {
      id: crypto.randomUUID(),
      label: `Option ${options.length + 1}`,
      targetNodeId: ''
    };
    onUpdate({ options: [...options, newOption] });
  };

  const updateOption = (id: string, updates: Partial<NodeOption>) => {
    onUpdate({
      options: options.map(o => o.id === id ? { ...o, ...updates } : o)
    });
  };

  const removeOption = (id: string) => {
    onUpdate({ options: options.filter(o => o.id !== id) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Question Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Enter question..."
        />
      </div>

      <div className="space-y-2">
        <Label>Question Text</Label>
        <Textarea
          value={node.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="What would you like to ask?"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Button Layout</Label>
        <RadioGroup defaultValue={layout} className="flex gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="vertical" id="vertical" />
            <Label htmlFor="vertical" className="font-normal">Vertical</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="horizontal" id="horizontal" />
            <Label htmlFor="horizontal" className="font-normal">Horizontal</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Response Options (2-8)</Label>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={addOption}
            disabled={options.length >= 8}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Option
          </Button>
        </div>

        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={option.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/20">
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
              <Input
                value={option.label}
                onChange={(e) => updateOption(option.id, { label: e.target.value })}
                placeholder="Button text"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => removeOption(option.id)}
                disabled={options.length <= 2}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {options.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
              Add at least 2 options for branching
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Variable: $question_{'{'}id{'}'}_choice stores selected button index
        </p>
      </div>
    </div>
  );
}