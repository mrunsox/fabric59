import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScriptNode, NodeType } from '@/types/script';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { getNodeConfig } from '@/config/nodeTypes';
import { ScrollArea } from '@/components/ui/scroll-area';

// Import all node config components
import { ContentNodeConfig } from './config/ContentNodeConfig';
import { QuestionNodeConfig } from './config/QuestionNodeConfig';
import { DataCaptureNodeConfig } from './config/DataCaptureNodeConfig';
import { LogicNodeConfig } from './config/LogicNodeConfig';
import { EndNodeConfig } from './config/EndNodeConfig';
import { TimerNodeConfig } from './config/TimerNodeConfig';
import { CRMNodeConfig } from './config/CRMNodeConfig';
import { WebhookNodeConfig } from './config/WebhookNodeConfig';
import { AudioNodeConfig } from './config/AudioNodeConfig';
import { TransferNodeConfig } from './config/TransferNodeConfig';
import { EmbedNodeConfig } from './config/EmbedNodeConfig';
import { AIAssistNodeConfig } from './config/AIAssistNodeConfig';
import { ScoringNodeConfig } from './config/ScoringNodeConfig';
import { ABTestNodeConfig } from './config/ABTestNodeConfig';
import { 
  TreeLinkNodeConfig, 
  ComplianceNodeConfig, 
  ParallelNodeConfig,
  LoopNodeConfig,
  RandomizerNodeConfig
} from './config/FlowNodeConfigs';
import { SMSNodeConfig } from './config/SMSNodeConfig';
import { CalendarNodeConfig } from './config/CalendarNodeConfig';
import { PaymentNodeConfig } from './config/PaymentNodeConfig';
import { QuestionInputTypes } from './config/QuestionInputTypes';

interface NodeEditorPanelProps {
  node: ScriptNode;
  onUpdate: (node: ScriptNode) => void;
  onClose: () => void;
  availableNodes?: { id: string; title: string }[];
  scriptId?: string;
}

export function NodeEditorPanel({ node, onUpdate, onClose, availableNodes = [], scriptId }: NodeEditorPanelProps) {
  const [editedNode, setEditedNode] = useState<ScriptNode>({ ...node });
  const nodeConfig = getNodeConfig(node.type);
  const Icon = nodeConfig.icon;

  // Sync editedNode when node prop changes (fixes save bug where state was stale)
  useEffect(() => {
    setEditedNode({ ...node });
  }, [node]);

  const handleUpdate = useCallback((updates: Partial<ScriptNode>) => {
    setEditedNode(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSave = () => {
    onUpdate(editedNode);
  };

  // Render the appropriate config component based on node type
  const renderNodeConfig = () => {
    const props = {
      node: editedNode,
      onUpdate: handleUpdate,
      availableNodes,
      scriptId
    };

    switch (editedNode.type) {
      case 'content':
        return <ContentNodeConfig {...props} />;
      case 'question':
        return <QuestionInputTypes {...props} />;
      case 'data':
        return <DataCaptureNodeConfig {...props} />;
      case 'logic':
        return <LogicNodeConfig {...props} />;
      case 'end':
        return <EndNodeConfig {...props} />;
      case 'timer':
        return <TimerNodeConfig {...props} />;
      case 'crm-lookup':
        return <CRMNodeConfig {...props} />;
      case 'api-webhook':
        return <WebhookNodeConfig {...props} />;
      case 'audio-prompt':
        return <AudioNodeConfig {...props} />;
      case 'transfer':
        return <TransferNodeConfig {...props} />;
      case 'external-embed':
        return <EmbedNodeConfig {...props} />;
      case 'ai-assist':
        return <AIAssistNodeConfig {...props} />;
      case 'scoring':
        return <ScoringNodeConfig {...props} />;
      case 'ab-test':
        return <ABTestNodeConfig {...props} />;
      case 'tree-link':
        return <TreeLinkNodeConfig {...props} />;
      case 'compliance-record':
        return <ComplianceNodeConfig {...props} />;
      case 'parallel-branch':
        return <ParallelNodeConfig {...props} />;
      case 'loop':
        return <LoopNodeConfig {...props} />;
      case 'randomizer':
        return <RandomizerNodeConfig {...props} />;
      case 'sms':
        return <SMSNodeConfig {...props} />;
      case 'calendar':
        return <CalendarNodeConfig {...props} />;
      case 'payment':
        return <PaymentNodeConfig {...props} />;
      default:
        return <ContentNodeConfig {...props} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full flex flex-col bg-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${nodeConfig.bgClass} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{nodeConfig.label}</h3>
            <p className="text-xs text-muted-foreground">{nodeConfig.description}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {renderNodeConfig()}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">
          Save Changes
        </Button>
      </div>
    </motion.div>
  );
}