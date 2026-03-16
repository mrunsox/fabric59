import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Building2, Home, Stethoscope, Package, Landmark, Truck, RotateCcw, ShoppingCart, HeadphonesIcon, FileText, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { industryCategories, IndustryCategory, IndustryTemplate } from './types';
import { getTemplatesByCategory, industryTemplates } from './templates';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: IndustryTemplate) => void;
}

const categoryIcons: Record<IndustryCategory, typeof Briefcase> = {
  'contact-center': HeadphonesIcon,
  'insurance': Briefcase,
  'home-services': Home,
  'healthcare': Stethoscope,
  'consumer-products': Package,
  'finance': Landmark,
  'final-mile': Truck,
  'reverse-logistics': RotateCcw,
  'ecommerce': ShoppingCart,
  'tech-support': Building2,
};

function getCustomTemplates(): IndustryTemplate[] {
  try {
    return JSON.parse(localStorage.getItem('customTemplates') || '[]');
  } catch {
    return [];
  }
}

function deleteCustomTemplate(templateId: string) {
  const templates = getCustomTemplates();
  const filtered = templates.filter(t => t.id !== templateId);
  localStorage.setItem('customTemplates', JSON.stringify(filtered));
}

export function TemplateModal({ isOpen, onClose, onSelectTemplate }: TemplateModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<IndustryCategory | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'builtin' | 'custom'>('builtin');
  const [refreshKey, setRefreshKey] = useState(0);

  const customTemplates = useMemo(() => getCustomTemplates(), [refreshKey]);

  const builtinTemplates = selectedCategory 
    ? getTemplatesByCategory(selectedCategory)
    : industryTemplates;

  const filteredCustomTemplates = selectedCategory
    ? customTemplates.filter(t => t.category === selectedCategory)
    : customTemplates;

  const templates = activeTab === 'builtin' ? builtinTemplates : filteredCustomTemplates;

  const handleSelectTemplate = (template: IndustryTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  const handleDeleteCustomTemplate = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    if (confirm('Delete this template?')) {
      deleteCustomTemplate(templateId);
      setRefreshKey(prev => prev + 1);
      toast.success('Template deleted');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Load Template</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Start with a pre-built flow or one of your saved templates
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex h-[60vh]">
              {/* Category sidebar */}
              <div className="w-64 border-r border-border p-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'builtin' | 'custom')} className="mb-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="builtin" className="text-xs">
                      <FileText className="w-3 h-3 mr-1" />
                      Built-in
                    </TabsTrigger>
                    <TabsTrigger value="custom" className="text-xs">
                      <User className="w-3 h-3 mr-1" />
                      My Templates
                      {customTemplates.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs px-1">
                          {customTemplates.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <h3 className="text-sm font-medium text-muted-foreground mb-3">Industries</h3>
                <ScrollArea className="h-[calc(100%-80px)]">
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                        selectedCategory === null
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <FileText className="w-4 h-4" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">All Templates</div>
                        <div className="text-xs opacity-70">
                          {activeTab === 'builtin' ? industryTemplates.length : customTemplates.length} templates
                        </div>
                      </div>
                    </button>
                    
                    {industryCategories.map(cat => {
                      const Icon = categoryIcons[cat.id];
                      const count = activeTab === 'builtin' 
                        ? getTemplatesByCategory(cat.id).length
                        : customTemplates.filter(t => t.category === cat.id).length;
                      
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                            selectedCategory === cat.id
                              ? 'bg-primary text-primary-foreground'
                              : 'text-foreground hover:bg-muted',
                            count === 0 && 'opacity-50'
                          )}
                          disabled={count === 0}
                        >
                          <Icon className="w-4 h-4" />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{cat.label}</div>
                            <div className="text-xs opacity-70">{cat.description}</div>
                          </div>
                          {count > 0 && (
                            <Badge variant="secondary" className="ml-auto">
                              {count}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Templates grid */}
              <div className="flex-1 p-6">
                <ScrollArea className="h-full">
                  {templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
                      <h4 className="font-medium text-foreground">
                        {activeTab === 'custom' ? 'No saved templates' : 'No templates yet'}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activeTab === 'custom' 
                          ? 'Save a script as a template to see it here'
                          : 'Templates for this industry coming soon'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {templates.map(template => (
                        <motion.div
                          key={template.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onHoverStart={() => setHoveredTemplate(template.id)}
                          onHoverEnd={() => setHoveredTemplate(null)}
                          className={cn(
                            'relative text-left p-4 rounded-xl border-2 transition-all cursor-pointer',
                            hoveredTemplate === template.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          )}
                          onClick={() => handleSelectTemplate(template)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              {(() => {
                                const cat = industryCategories.find(c => c.id === template.category);
                                const Icon = cat ? categoryIcons[cat.id] : FileText;
                                return <Icon className="w-5 h-5 text-primary" />;
                              })()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-foreground">{template.name}</h4>
                                {activeTab === 'custom' && (
                                  <Badge variant="outline" className="text-xs">Custom</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {template.description}
                              </p>
                              <div className="flex items-center gap-2 mt-3">
                                <Badge variant="outline" className="text-xs">
                                  {template.nodes.length} nodes
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {template.edges.length} connections
                                </Badge>
                              </div>
                            </div>
                            {activeTab === 'custom' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={(e) => handleDeleteCustomTemplate(e, template.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Or start with a blank canvas and build from scratch
              </p>
              <Button variant="outline" onClick={onClose}>
                Start Blank
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
