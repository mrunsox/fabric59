import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, Redo2, Play, Save, Search, Loader2, Cloud, CloudOff, Wand2, FileUp, Settings2, Clock, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScriptNode, NodeType } from '@/types/tree-script';
import { NodePalette } from '@/components/tree-editor/NodePalette';
import { NodeEditorPanel } from '@/components/tree-editor/NodeEditorPanel';
import { FlowCanvas, FlowCanvasRef } from '@/components/tree-editor/flow/FlowCanvas';
import { ScriptTester } from '@/components/tree-editor/ScriptTester';
import { SaveAsTemplateModal } from '@/components/tree-editor/SaveAsTemplateModal';
import { DeleteNodeModal } from '@/components/tree-editor/DeleteNodeModal';
import { ScriptConfigPanel } from '@/components/tree-editor/ScriptConfigPanel';
import { FlowNode, FlowEdge, flowNodeToScriptNode, IndustryCategory } from '@/components/tree-editor/flow/types';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { nodeTypeConfigs } from '@/config/nodeTypes';
import { useScript, useUpdateScript, useCreateScript } from '@/hooks/useScripts';
import { useEditorHistory } from '@/hooks/useEditorHistory';
import { useAuth } from '@/contexts/AuthContext';

export default function TreeEditorPage() {
  const flowCanvasRef = useRef<FlowCanvasRef>(null);
  const { scriptId } = useParams<{ scriptId: string }>();
  const isNewScript = !scriptId || scriptId === 'new';
  const { organization } = useAuth();
  
  const { data: script, isLoading } = useScript(isNewScript ? undefined : scriptId);
  const updateScript = useUpdateScript();
  const createScript = useCreateScript();
  const navigate = useNavigate();
  const { canUndo, canRedo, undo, redo, pushState } = useEditorHistory();

  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showTester, setShowTester] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; nodeId: string; nodeName: string }>({
    isOpen: false, nodeId: '', nodeName: ''
  });
  const [callTimeLimit, setCallTimeLimit] = useState(300);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [scriptName, setScriptName] = useState('Untitled Script');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  // Load script data from Fabric59's definition JSONB column
  useEffect(() => {
    if (script) {
      const def = script.definition as any;
      if (def?.nodes) {
        setNodes(def.nodes);
        setEdges(def.edges || []);
        setCallTimeLimit(def.call_time_limit || 300);
      }
      setScriptName(script.name || 'Untitled Script');
      lastSavedRef.current = JSON.stringify({ nodes: def?.nodes || [], edges: def?.edges || [] });
    }
  }, [script]);

  const handleUndo = useCallback(() => {
    const prevState = undo();
    if (prevState) {
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      toast.info('Undo');
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      toast.info('Redo');
    }
  }, [redo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Auto-save
  const triggerAutoSave = useCallback((newNodes: FlowNode[], newEdges: FlowEdge[], timeLimit?: number) => {
    if (isNewScript) return;
    
    const currentState = JSON.stringify({ nodes: newNodes, edges: newEdges });
    if (currentState === lastSavedRef.current && timeLimit === undefined) return;
    
    setHasUnsavedChanges(true);
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      if (scriptId && scriptId !== 'new') {
        const definition = { nodes: newNodes, edges: newEdges, call_time_limit: timeLimit ?? callTimeLimit };
        updateScript.mutate(
          { id: scriptId, definition: definition as any },
          {
            onSuccess: () => {
              lastSavedRef.current = currentState;
              setHasUnsavedChanges(false);
            },
          }
        );
      }
    }, 2000);
  }, [scriptId, isNewScript, updateScript, callTimeLimit]);

  const handleCallTimeLimitChange = useCallback((newLimit: number) => {
    setCallTimeLimit(newLimit);
    triggerAutoSave(nodes, edges, newLimit);
  }, [nodes, edges, triggerAutoSave]);

  const startEditingName = () => { setTempName(scriptName); setIsEditingName(true); };
  const cancelEditingName = () => { setIsEditingName(false); setTempName(''); };
  const saveScriptName = async () => {
    const newName = tempName.trim() || 'Untitled Script';
    setScriptName(newName);
    setIsEditingName(false);
    if (!isNewScript && scriptId) {
      await updateScript.mutateAsync({ id: scriptId, name: newName });
      toast.success('Script name updated');
    }
  };
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveScriptName();
    else if (e.key === 'Escape') cancelEditingName();
  };

  const handleAddNodeFromPalette = useCallback((type: NodeType) => {
    if (flowCanvasRef.current) {
      flowCanvasRef.current.addNodeAtCenter(type);
    } else {
      handleAddNode(type, { x: 300 + Math.random() * 200, y: 200 + Math.random() * 100 });
    }
  }, []);

  const handleNodesChange = useCallback((newNodes: FlowNode[]) => {
    pushState({ nodes, edges });
    setNodes(newNodes);
    triggerAutoSave(newNodes, edges);
  }, [nodes, edges, pushState, triggerAutoSave]);

  const handleEdgesChange = useCallback((newEdges: FlowEdge[]) => {
    pushState({ nodes, edges });
    setEdges(newEdges);
    triggerAutoSave(nodes, newEdges);
  }, [nodes, edges, pushState, triggerAutoSave]);

  const selectedScriptNode = useMemo((): ScriptNode | undefined => {
    if (!selectedNode) return undefined;
    const connections = edges.filter(e => e.source === selectedNode.id).map(e => e.target);
    return flowNodeToScriptNode(selectedNode, connections);
  }, [selectedNode, edges]);

  const handleNodeSelect = useCallback((node: FlowNode | null) => {
    setSelectedNode(node);
    setShowEditor(!!node);
  }, []);

  const handleAddNode = useCallback((type: NodeType, position?: { x: number; y: number }) => {
    const config = nodeTypeConfigs[type];
    const newNode: FlowNode = {
      id: crypto.randomUUID(),
      type: 'custom',
      position: position || { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: `New ${config.label}`,
        type,
        content: getDefaultContent(type),
        options: getDefaultOptions(type),
      },
    };
    pushState({ nodes, edges });
    const newNodes = [...nodes, newNode];
    setNodes(newNodes);
    setSelectedNode(newNode);
    setShowEditor(true);
    triggerAutoSave(newNodes, edges);
  }, [nodes, edges, pushState, triggerAutoSave]);

  const handleDeleteNodeRequest = useCallback((nodeId: string, nodeName: string) => {
    setDeleteModalState({ isOpen: true, nodeId, nodeName });
  }, []);

  const handleConfirmDeleteNode = useCallback(() => {
    const { nodeId } = deleteModalState;
    pushState({ nodes, edges });
    const newNodes = nodes.filter(n => n.id !== nodeId);
    const newEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNode(null);
    setShowEditor(false);
    setDeleteModalState({ isOpen: false, nodeId: '', nodeName: '' });
    triggerAutoSave(newNodes, newEdges);
    toast.success('Node deleted');
  }, [deleteModalState, nodes, edges, pushState, triggerAutoSave]);

  const handleUpdateNode = useCallback((updatedScriptNode: ScriptNode) => {
    const newNodes = nodes.map(n => {
      if (n.id === updatedScriptNode.id) {
        const updatedNode = {
          ...n,
          data: {
            ...n.data,
            label: updatedScriptNode.title,
            content: updatedScriptNode.content,
            options: updatedScriptNode.options,
            inputFields: updatedScriptNode.inputFields,
            logicRules: updatedScriptNode.logicRules,
            endAction: updatedScriptNode.endAction,
            timerConfig: updatedScriptNode.timerConfig,
            audioConfig: updatedScriptNode.audioConfig,
            transferConfig: updatedScriptNode.transferConfig,
            crmConfig: updatedScriptNode.crmConfig,
            webhookConfig: updatedScriptNode.webhookConfig,
            embedConfig: updatedScriptNode.embedConfig,
            aiAssistConfig: updatedScriptNode.aiAssistConfig,
            scoringConfig: updatedScriptNode.scoringConfig,
            abTestConfig: updatedScriptNode.abTestConfig,
          },
        };
        setSelectedNode(updatedNode);
        return updatedNode;
      }
      return n;
    });
    pushState({ nodes, edges });
    setNodes(newNodes);
    setShowEditor(false);
    triggerAutoSave(newNodes, edges);
    toast.success('Node updated!');
  }, [nodes, edges, pushState, triggerAutoSave]);

  const handleSave = useCallback(async () => {
    const definition = { nodes, edges, call_time_limit: callTimeLimit };
    if (isNewScript) {
      if (!organization?.id) { toast.error('No organization'); return; }
      const newScript = await createScript.mutateAsync({
        name: scriptName,
        organization_id: organization.id,
        definition: definition as any,
      });
      navigate(`/admin/tree-editor/${newScript.id}`, { replace: true });
      toast.success('Script created!');
    } else if (scriptId) {
      await updateScript.mutateAsync({ id: scriptId, name: scriptName, definition: definition as any });
      lastSavedRef.current = JSON.stringify({ nodes, edges });
      setHasUnsavedChanges(false);
      toast.success('Script saved!');
    }
  }, [isNewScript, scriptId, nodes, edges, callTimeLimit, scriptName, organization, createScript, updateScript, navigate]);

  const handleSaveAsTemplate = useCallback((template: { name: string; description: string; category: IndustryCategory }) => {
    const existingTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
    const newTemplate = {
      id: crypto.randomUUID(),
      name: template.name,
      description: template.description,
      category: template.category,
      nodes,
      edges,
    };
    localStorage.setItem('customTemplates', JSON.stringify([...existingTemplates, newTemplate]));
    toast.success('Template saved successfully!');
  }, [nodes, edges]);

  const handleNavigateToNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setShowEditor(true);
      setShowTester(false);
    }
  }, [nodes]);

  const availableNodes = useMemo(() => 
    nodes.map(n => ({ id: n.id, title: n.data.label })), 
    [nodes]
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading && !isNewScript) {
    return (
      <div className="h-[calc(100vh-7rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Toolbar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-3 rounded-xl border border-border bg-card mb-4"
      >
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                className="w-48 h-9 bg-background font-medium"
                autoFocus
                placeholder="Script name..."
              />
              <Button variant="ghost" size="icon" className="h-9 w-9 text-accent" onClick={saveScriptName}>
                <Check className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={cancelEditingName}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={startEditingName}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <span className="font-semibold text-foreground">{scriptName}</span>
              <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          
          <div className="h-6 w-px bg-border mx-2" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search nodes..." className="w-48 pl-10 h-9 bg-background" />
          </div>
          <div className="h-6 w-px bg-border mx-2" />
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="w-4 h-4" />
          </Button>
          
          <div className="h-6 w-px bg-border mx-2" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{formatTime(callTimeLimit)}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowConfigPanel(true)}>
              <Settings2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          
          <div className="h-6 w-px bg-border mx-2" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {updateScript.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></>
            ) : hasUnsavedChanges ? (
              <><CloudOff className="w-4 h-4" /><span>Unsaved</span></>
            ) : !isNewScript ? (
              <><Cloud className="w-4 h-4 text-accent" /><span className="text-accent">Saved</span></>
            ) : null}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" size="sm" 
            onClick={() => setShowTester(!showTester)}
            className={showTester ? 'bg-primary/10 border-primary' : ''}
          >
            <Wand2 className="w-4 h-4 mr-2" />Test Script
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSaveTemplateModal(true)} disabled={nodes.length === 0}>
            <FileUp className="w-4 h-4 mr-2" />Save as Template
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={updateScript.isPending || createScript.isPending}
          >
            {(updateScript.isPending || createScript.isPending) ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isNewScript ? 'Create' : 'Save'}
          </Button>
        </div>
      </motion.div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 rounded-xl border border-border overflow-hidden">
          <FlowCanvas
            ref={flowCanvasRef}
            initialNodes={nodes}
            initialEdges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onNodeSelect={handleNodeSelect}
            onAddNode={handleAddNode}
            onDeleteNode={handleDeleteNodeRequest}
          />
        </div>

        <NodePalette onAddNode={handleAddNodeFromPalette} />

        <AnimatePresence>
          {showTester && (
            <ScriptTester
              nodes={nodes}
              edges={edges}
              onClose={() => setShowTester(false)}
              onNavigateToNode={handleNavigateToNode}
            />
          )}
        </AnimatePresence>

        {showEditor && selectedScriptNode && (
          <NodeEditorPanel
            node={selectedScriptNode}
            onUpdate={handleUpdateNode}
            onClose={() => setShowEditor(false)}
            availableNodes={availableNodes}
            scriptId={scriptId}
          />
        )}
      </div>

      <SaveAsTemplateModal
        isOpen={showSaveTemplateModal}
        onClose={() => setShowSaveTemplateModal(false)}
        onSave={handleSaveAsTemplate}
        defaultName={script?.name || 'Untitled Template'}
      />

      <DeleteNodeModal
        isOpen={deleteModalState.isOpen}
        nodeName={deleteModalState.nodeName}
        onConfirm={handleConfirmDeleteNode}
        onCancel={() => setDeleteModalState({ isOpen: false, nodeId: '', nodeName: '' })}
      />

      <AnimatePresence>
        {showConfigPanel && (
          <ScriptConfigPanel
            callTimeLimit={callTimeLimit}
            onUpdate={handleCallTimeLimitChange}
            onClose={() => setShowConfigPanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function getDefaultContent(type: NodeType): string {
  const defaults: Record<string, string> = {
    content: 'Enter your script content here...',
    question: 'What would you like to do?',
    data: 'Please provide the following information:',
    end: 'Thank you for calling!',
  };
  return defaults[type] || 'Configure this node...';
}

function getDefaultOptions(type: NodeType) {
  if (type === 'question') return [{ id: crypto.randomUUID(), label: 'Option 1' }, { id: crypto.randomUUID(), label: 'Option 2' }];
  return [];
}
