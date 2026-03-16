import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  ChevronDown,
  ChevronUp,
  FileWarning,
  Link2Off,
  FileQuestion,
  Wand2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FlowNode, FlowEdge } from './flow/types';
import { nodeTypeConfigs } from '@/config/nodeTypes';
import { cn } from '@/lib/utils';

interface ScriptTesterProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onClose: () => void;
  onNavigateToNode?: (nodeId: string) => void;
}

interface Issue {
  id: string;
  nodeId: string;
  nodeLabel: string;
  type: 'error' | 'warning' | 'suggestion';
  message: string;
  details?: string;
}

export function ScriptTester({ nodes, edges, onClose, onNavigateToNode }: ScriptTesterProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    errors: true,
    warnings: true,
    suggestions: true,
  });

  const issues = useMemo(() => {
    const results: Issue[] = [];

    nodes.forEach(node => {
      const config = nodeTypeConfigs[node.data.type];
      const hasOutgoingEdge = edges.some(e => e.source === node.id);
      const hasIncomingEdge = edges.some(e => e.target === node.id);

      // Check for empty/missing content
      if (!node.data.content || node.data.content.trim() === '' || node.data.content === 'Configure this node...') {
        results.push({
          id: `${node.id}-empty-content`,
          nodeId: node.id,
          nodeLabel: node.data.label,
          type: 'error',
          message: 'Missing content',
          details: `The ${config?.label || 'node'} "${node.data.label}" has no content configured.`,
        });
      }

      // Check for disconnected nodes (except end nodes)
      if (node.data.type !== 'end' && !hasOutgoingEdge) {
        results.push({
          id: `${node.id}-no-outgoing`,
          nodeId: node.id,
          nodeLabel: node.data.label,
          type: 'error',
          message: 'Dead end - no outgoing connection',
          details: `This node has no path forward. Add a connection to continue the flow.`,
        });
      }

      // Check for orphaned nodes (no incoming connections except start nodes)
      const isStartNode = !hasIncomingEdge && nodes.filter(n => !edges.some(e => e.target === n.id)).length === 1;
      if (!hasIncomingEdge && !isStartNode && nodes.length > 1) {
        results.push({
          id: `${node.id}-orphan`,
          nodeId: node.id,
          nodeLabel: node.data.label,
          type: 'warning',
          message: 'Orphaned node - unreachable',
          details: `This node cannot be reached from any other node in the flow.`,
        });
      }

      // Check question nodes for empty options
      if (node.data.type === 'question') {
        if (!node.data.options || node.data.options.length === 0) {
          results.push({
            id: `${node.id}-no-options`,
            nodeId: node.id,
            nodeLabel: node.data.label,
            type: 'error',
            message: 'Question has no options',
            details: `Add at least one option for the caller to choose.`,
          });
        } else {
          // Check for options without labels
          node.data.options.forEach((opt, idx) => {
            if (!opt.label || opt.label.trim() === '') {
              results.push({
                id: `${node.id}-empty-option-${idx}`,
                nodeId: node.id,
                nodeLabel: node.data.label,
                type: 'error',
                message: `Option ${idx + 1} has no label`,
                details: `Each option needs a clear label for agents to click.`,
              });
            }
          });
        }
      }

      // Check data capture nodes for input fields
      if (node.data.type === 'data') {
        if (!node.data.inputFields || node.data.inputFields.length === 0) {
          results.push({
            id: `${node.id}-no-fields`,
            nodeId: node.id,
            nodeLabel: node.data.label,
            type: 'error',
            message: 'Data capture has no input fields',
            details: `Add input fields to collect caller information.`,
          });
        } else {
          node.data.inputFields.forEach((field, idx) => {
            if (!field.variableName || field.variableName.trim() === '') {
              results.push({
                id: `${node.id}-no-variable-${idx}`,
                nodeId: node.id,
                nodeLabel: node.data.label,
                type: 'warning',
                message: `Field "${field.label}" has no variable name`,
                details: `Set a variable name to use this data in other nodes.`,
              });
            }
          });
        }
      }

      // Check transfer nodes for destination
      if (node.data.type === 'transfer') {
        if (!node.data.transferConfig?.destination) {
          results.push({
            id: `${node.id}-no-destination`,
            nodeId: node.id,
            nodeLabel: node.data.label,
            type: 'error',
            message: 'Transfer has no destination',
            details: `Configure a phone number or extension to transfer to.`,
          });
        }
      }

      // Check webhook nodes for URL
      if (node.data.type === 'api-webhook') {
        if (!node.data.webhookConfig?.url) {
          results.push({
            id: `${node.id}-no-url`,
            nodeId: node.id,
            nodeLabel: node.data.label,
            type: 'error',
            message: 'Webhook has no URL configured',
            details: `Set the API endpoint URL to send data to.`,
          });
        }
      }

      // Suggestions for enhancement
      if (node.data.type === 'content' && node.data.content && node.data.content.length > 500) {
        results.push({
          id: `${node.id}-long-content`,
          nodeId: node.id,
          nodeLabel: node.data.label,
          type: 'suggestion',
          message: 'Consider breaking up long content',
          details: `Long scripts can be overwhelming. Consider splitting into multiple nodes for better flow.`,
        });
      }

      // Suggest adding timer for calls
      if (nodes.length > 5 && !nodes.some(n => n.data.type === 'timer')) {
        if (node === nodes[0]) {
          results.push({
            id: 'suggest-timer',
            nodeId: node.id,
            nodeLabel: 'Script',
            type: 'suggestion',
            message: 'Consider adding a timer node',
            details: `For longer scripts, a timer helps agents track call duration and compliance.`,
          });
        }
      }
    });

    // Check for circular paths (simple detection)
    const visited = new Set<string>();
    const detectCycle = (nodeId: string, path: Set<string>): boolean => {
      if (path.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      
      visited.add(nodeId);
      path.add(nodeId);
      
      const outgoing = edges.filter(e => e.source === nodeId);
      for (const edge of outgoing) {
        if (detectCycle(edge.target, new Set(path))) {
          return true;
        }
      }
      return false;
    };

    nodes.forEach(node => {
      if (!visited.has(node.id) && detectCycle(node.id, new Set())) {
        results.push({
          id: 'circular-path',
          nodeId: node.id,
          nodeLabel: node.data.label,
          type: 'warning',
          message: 'Circular path detected',
          details: `This flow contains a loop back to a previous node. Ensure this is intentional.`,
        });
      }
    });

    return results;
  }, [nodes, edges]);

  const errors = issues.filter(i => i.type === 'error');
  const warnings = issues.filter(i => i.type === 'warning');
  const suggestions = issues.filter(i => i.type === 'suggestion');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getIcon = (type: Issue['type']) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'suggestion': return <Lightbulb className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-80 rounded-xl border border-border bg-card shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-12rem)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Script Tester</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium">{errors.length} Errors</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">{warnings.length} Warnings</span>
          </div>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">{suggestions.length} Tips</span>
          </div>
        </div>
        
        {issues.length === 0 && (
          <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Script looks good! No issues found.</span>
          </div>
        )}
      </div>

      {/* Issues List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Errors Section */}
          {errors.length > 0 && (
            <IssueSection
              title="Errors"
              issues={errors}
              isExpanded={expandedSections.errors}
              onToggle={() => toggleSection('errors')}
              onNavigate={onNavigateToNode}
              badgeClass="bg-destructive/10 text-destructive"
            />
          )}

          {/* Warnings Section */}
          {warnings.length > 0 && (
            <IssueSection
              title="Warnings"
              issues={warnings}
              isExpanded={expandedSections.warnings}
              onToggle={() => toggleSection('warnings')}
              onNavigate={onNavigateToNode}
              badgeClass="bg-amber-500/10 text-amber-600"
            />
          )}

          {/* Suggestions Section */}
          {suggestions.length > 0 && (
            <IssueSection
              title="Suggestions"
              issues={suggestions}
              isExpanded={expandedSections.suggestions}
              onToggle={() => toggleSection('suggestions')}
              onNavigate={onNavigateToNode}
              badgeClass="bg-blue-500/10 text-blue-600"
            />
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}

interface IssueSectionProps {
  title: string;
  issues: Issue[];
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate?: (nodeId: string) => void;
  badgeClass: string;
}

function IssueSection({ title, issues, isExpanded, onToggle, onNavigate, badgeClass }: IssueSectionProps) {
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{title}</span>
          <Badge variant="secondary" className={cn("text-xs", badgeClass)}>
            {issues.length}
          </Badge>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-2">
              {issues.map(issue => (
                <motion.div
                  key={issue.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => onNavigate?.(issue.nodeId)}
                >
                  <div className="flex items-start gap-2">
                    {issue.type === 'error' && <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />}
                    {issue.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />}
                    {issue.type === 'suggestion' && <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{issue.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        In: <span className="font-medium">{issue.nodeLabel}</span>
                      </p>
                      {issue.details && (
                        <p className="text-xs text-muted-foreground mt-1">{issue.details}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}