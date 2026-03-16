import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Mail, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScriptNode, QuestionConfig, NodeOption } from '@/types/script';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface QuestionInputRendererProps {
  node: ScriptNode;
  onOptionSelect: (targetNodeId: string | undefined, optionLabel: string) => void;
  onValueCapture: (variableName: string, value: string) => void;
  interpolateContent: (content: string) => string;
}

export function QuestionInputRenderer({
  node,
  onOptionSelect,
  onValueCapture,
  interpolateContent,
}: QuestionInputRendererProps) {
  const config: QuestionConfig = node.questionConfig || {
    inputType: 'multi-choice',
    required: true,
    sliderMin: 1,
    sliderMax: 10,
    sliderStep: 1,
  };
  const options = node.options || [];

  // Local state for different input types
  const [textValue, setTextValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState([5]);
  const [dateValue, setDateValue] = useState<Date | undefined>();
  const [dropdownValue, setDropdownValue] = useState('');

  const variableName = `question_${node.id.slice(0, 8)}_value`;

  // Email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError(config.required ? 'Email is required' : null);
      return !config.required;
    }
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleEmailSubmit = () => {
    if (validateEmail(emailValue)) {
      onValueCapture(variableName, emailValue);
      // Find the first option to advance to
      const nextOption = options[0];
      if (nextOption) {
        onOptionSelect(nextOption.targetNodeId, emailValue);
      }
    }
  };

  const handleTextSubmit = () => {
    if (config.required && !textValue.trim()) return;
    onValueCapture(variableName, textValue);
    const nextOption = options[0];
    if (nextOption) {
      onOptionSelect(nextOption.targetNodeId, textValue);
    }
  };

  const handleSliderSubmit = () => {
    const value = sliderValue[0].toString();
    onValueCapture(variableName, value);
    const nextOption = options[0];
    if (nextOption) {
      onOptionSelect(nextOption.targetNodeId, value);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setDateValue(date);
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      onValueCapture(variableName, formattedDate);
      const nextOption = options[0];
      if (nextOption) {
        onOptionSelect(nextOption.targetNodeId, formattedDate);
      }
    }
  };

  const handleDropdownSelect = (value: string) => {
    setDropdownValue(value);
    onValueCapture(variableName, value);
    // Find matching option
    const matchingOption = options.find(o => o.label === value);
    if (matchingOption) {
      onOptionSelect(matchingOption.targetNodeId, value);
    }
  };

  // Render based on input type
  switch (config.inputType) {
    case 'multi-choice':
      return (
        <div className="space-y-3">
          {options.map((option, index) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                onValueCapture(variableName, option.label);
                onOptionSelect(option.targetNodeId, option.label);
              }}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:bg-accent hover:border-primary/30 transition-all duration-200 group text-left"
            >
              <span className="font-medium text-foreground group-hover:text-accent-foreground">
                {option.label}
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </motion.button>
          ))}
        </div>
      );

    case 'dropdown':
      return (
        <div className="space-y-4">
          <Select value={dropdownValue} onValueChange={handleDropdownSelect}>
            <SelectTrigger className="w-full h-12 text-base bg-background">
              <SelectValue placeholder={config.placeholder || 'Select an option...'} />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {options.map((option) => (
                <SelectItem key={option.id} value={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'free-text':
      return (
        <div className="space-y-4">
          <Input
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder={config.placeholder || 'Enter your response...'}
            className="h-12 text-base bg-background"
            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
          />
          <Button
            onClick={handleTextSubmit}
            disabled={config.required && !textValue.trim()}
            className="w-full gradient-primary text-primary-foreground"
          >
            <Check className="w-4 h-4 mr-2" />
            Continue
          </Button>
        </div>
      );

    case 'slider':
      return (
        <div className="space-y-6">
          <div className="px-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {config.sliderMin || 1}
              </span>
              <span className="text-2xl font-bold text-primary">
                {sliderValue[0]}
              </span>
              <span className="text-sm text-muted-foreground">
                {config.sliderMax || 10}
              </span>
            </div>
            <Slider
              value={sliderValue}
              onValueChange={setSliderValue}
              min={config.sliderMin || 1}
              max={config.sliderMax || 10}
              step={config.sliderStep || 1}
              className="py-4"
            />
          </div>
          <Button
            onClick={handleSliderSubmit}
            className="w-full gradient-primary text-primary-foreground"
          >
            <Check className="w-4 h-4 mr-2" />
            Continue with {sliderValue[0]}
          </Button>
        </div>
      );

    case 'date':
      return (
        <div className="space-y-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full h-12 justify-start text-left font-normal',
                  !dateValue && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={handleDateSelect}
                disabled={(date) => {
                  if (config.dateMin && date < new Date(config.dateMin)) return true;
                  if (config.dateMax && date > new Date(config.dateMax)) return true;
                  return false;
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      );

    case 'yes-no':
      return (
        <div className="grid grid-cols-2 gap-4">
          {options.slice(0, 2).map((option, index) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => {
                onValueCapture(variableName, option.label);
                onOptionSelect(option.targetNodeId, option.label);
              }}
              className={cn(
                'p-6 rounded-xl border-2 text-lg font-semibold transition-all duration-200',
                index === 0
                  ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/50 text-emerald-600'
                  : 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/50 text-red-600'
              )}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      );

    case 'email':
      return (
        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              value={emailValue}
              onChange={(e) => {
                setEmailValue(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => validateEmail(emailValue)}
              placeholder={config.placeholder || 'john@company.com'}
              className={cn(
                'h-12 text-base pl-11 bg-background',
                emailError && 'border-destructive focus-visible:ring-destructive'
              )}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
            />
          </div>
          {emailError && (
            <p className="text-sm text-destructive">{emailError}</p>
          )}
          <Button
            onClick={handleEmailSubmit}
            disabled={!!emailError || (config.required && !emailValue)}
            className="w-full gradient-primary text-primary-foreground"
          >
            <Check className="w-4 h-4 mr-2" />
            Submit Email
          </Button>
        </div>
      );

    default:
      return (
        <div className="space-y-3">
          {options.map((option, index) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onOptionSelect(option.targetNodeId, option.label)}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:bg-accent hover:border-primary/30 transition-all duration-200 group text-left"
            >
              <span className="font-medium text-foreground group-hover:text-accent-foreground">
                {option.label}
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </motion.button>
          ))}
        </div>
      );
  }
}
