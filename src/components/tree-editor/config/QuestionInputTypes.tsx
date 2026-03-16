import { ScriptNode, QuestionConfig, QuestionInputType, NodeOption } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, ListChecks, ChevronDown, Type, SlidersHorizontal, Calendar, ToggleLeft, Mail } from 'lucide-react';

interface QuestionInputTypesProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
}

const inputTypeOptions: { value: QuestionInputType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'multi-choice', label: 'Multi-Choice Buttons', icon: <ListChecks className="w-4 h-4" />, description: 'Clickable buttons for branching' },
  { value: 'dropdown', label: 'Dropdown', icon: <ChevronDown className="w-4 h-4" />, description: 'Select from a list' },
  { value: 'free-text', label: 'Free Text', icon: <Type className="w-4 h-4" />, description: 'Open text input' },
  { value: 'slider', label: 'Numeric Slider', icon: <SlidersHorizontal className="w-4 h-4" />, description: 'Scale from 1-10' },
  { value: 'date', label: 'Date Picker', icon: <Calendar className="w-4 h-4" />, description: 'Select a date' },
  { value: 'yes-no', label: 'Yes/No Toggle', icon: <ToggleLeft className="w-4 h-4" />, description: 'Binary choice' },
  { value: 'email', label: 'Email Input', icon: <Mail className="w-4 h-4" />, description: 'With regex validation' },
];

export function QuestionInputTypes({ node, onUpdate }: QuestionInputTypesProps) {
  const config: QuestionConfig = node.questionConfig || {
    inputType: 'multi-choice',
    required: true,
    sliderMin: 1,
    sliderMax: 10,
    sliderStep: 1
  };
  const options = node.options || [];

  const updateConfig = (updates: Partial<QuestionConfig>) => {
    onUpdate({ questionConfig: { ...config, ...updates } });
  };

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

  // Set default yes/no options when switching to yes-no type
  const handleInputTypeChange = (newType: QuestionInputType) => {
    updateConfig({ inputType: newType });
    
    if (newType === 'yes-no' && options.length !== 2) {
      onUpdate({
        options: [
          { id: crypto.randomUUID(), label: 'Yes', targetNodeId: '' },
          { id: crypto.randomUUID(), label: 'No', targetNodeId: '' }
        ]
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Question Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Enter question title..."
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
        <Label>Input Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {inputTypeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handleInputTypeChange(option.value)}
              className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                config.inputType === option.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              {option.icon}
              <div>
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
        <div className="space-y-0.5">
          <Label className="text-sm">Required Field</Label>
          <p className="text-xs text-muted-foreground">Agent must complete before advancing</p>
        </div>
        <Switch
          checked={config.required}
          onCheckedChange={(checked) => updateConfig({ required: checked })}
        />
      </div>

      {/* Conditional config based on input type */}
      {(config.inputType === 'multi-choice' || config.inputType === 'dropdown') && (
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
                  placeholder="Option text"
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
        </div>
      )}

      {config.inputType === 'yes-no' && (
        <div className="space-y-2">
          <Label>Yes/No Options</Label>
          <div className="grid grid-cols-2 gap-2">
            {options.map((option) => (
              <div key={option.id} className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                <Input
                  value={option.label}
                  onChange={(e) => updateOption(option.id, { label: e.target.value })}
                  className="text-center"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {config.inputType === 'slider' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Min Value</Label>
              <Input
                type="number"
                value={config.sliderMin || 1}
                onChange={(e) => updateConfig({ sliderMin: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Value</Label>
              <Input
                type="number"
                value={config.sliderMax || 10}
                onChange={(e) => updateConfig({ sliderMax: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Step</Label>
              <Input
                type="number"
                value={config.sliderStep || 1}
                onChange={(e) => updateConfig({ sliderStep: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <div className="p-4 rounded-lg border border-border bg-muted/20">
            <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
            <Slider
              defaultValue={[5]}
              min={config.sliderMin || 1}
              max={config.sliderMax || 10}
              step={config.sliderStep || 1}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{config.sliderMin || 1}</span>
              <span>{config.sliderMax || 10}</span>
            </div>
          </div>
        </div>
      )}

      {config.inputType === 'free-text' && (
        <div className="space-y-2">
          <Label>Placeholder Text</Label>
          <Input
            value={config.placeholder || ''}
            onChange={(e) => updateConfig({ placeholder: e.target.value })}
            placeholder="Enter your response..."
          />
        </div>
      )}

      {config.inputType === 'email' && (
        <div className="space-y-2">
          <Label>Placeholder Text</Label>
          <Input
            value={config.placeholder || ''}
            onChange={(e) => updateConfig({ placeholder: e.target.value })}
            placeholder="john@company.com"
          />
          <p className="text-xs text-muted-foreground">
            Validates: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          </p>
        </div>
      )}

      {config.inputType === 'date' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Min Date (Optional)</Label>
            <Input
              type="date"
              value={config.dateMin || ''}
              onChange={(e) => updateConfig({ dateMin: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Date (Optional)</Label>
            <Input
              type="date"
              value={config.dateMax || ''}
              onChange={(e) => updateConfig({ dateMax: e.target.value })}
            />
          </div>
        </div>
      )}

      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
        <p className="text-xs text-primary">
          <span className="font-medium">Variable:</span> $question_{node.id.slice(0, 8)}_value stores the response
        </p>
      </div>
    </div>
  );
}
