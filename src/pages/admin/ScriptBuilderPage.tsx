import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Upload, Undo2,
  HelpCircle, Zap, GitFork, Mail, Webhook, FileText, ExternalLink, Layers,
  CircleDot, CircleX, Download,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useScripts, useUpdateScript } from "@/hooks/useScripts";
import { useScriptVersioning } from "@/hooks/useScriptVersioning";

import { StartNode } from "@/components/script-builder/StartNode";
import { EndNode } from "@/components/script-builder/EndNode";
import { QuestionNode } from "@/components/script-builder/QuestionNode";
import { ActionNode } from "@/components/script-builder/ActionNode";
import { ConditionNode } from "@/components/script-builder/ConditionNode";
import { EmailSmsNode } from "@/components/script-builder/EmailSmsNode";
import { WebhookNode } from "@/components/script-builder/WebhookNode";
import { DocumentNode } from "@/components/script-builder/DocumentNode";
import { LinkNode } from "@/components/script-builder/LinkNode";
import { SubTreeNode } from "@/components/script-builder/SubTreeNode";

import { NodePropertyEditors } from "@/components/script-builder/NodePropertyEditors";
import { AIScriptGenerator } from "@/components/script-builder/AIScriptGenerator";
import { ScriptTestMode } from "@/components/script-builder/ScriptTestMode";
import { TemplateGallery } from "@/components/script-builder/TemplateGallery";
import { SaveAsTemplateDialog } from "@/components/script-builder/SaveAsTemplateDialog";
import { ScriptImportDialog, downloadScriptJSON } from "@/components/script-builder/ScriptImportExport";
import { ScriptValidationDialog, validateScript } from "@/components/script-builder/ScriptValidation";
import { ScriptStatusBadge } from "@/components/script-builder/ScriptStatusBadge";
import { VersionHistoryPanel } from "@/components/script-builder/VersionHistoryPanel";

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  question: QuestionNode,
  action: ActionNode,
  condition: ConditionNode,
  emailSms: EmailSmsNode,
  webhook: WebhookNode,
  document: DocumentNode,
  link: LinkNode,
  subTree: SubTreeNode,
};

const NODE_PALETTE = [
  { type: "start", label: "Start", icon: CircleDot, color: "text-node-start" },
  { type: "question", label: "Question", icon: HelpCircle, color: "text-node-question" },
  { type: "action", label: "Action", icon: Zap, color: "text-node-action" },
  { type: "condition", label: "Condition", icon: GitFork, color: "text-node-condition" },
  { type: "emailSms", label: "Email/SMS", icon: Mail, color: "text-primary" },
  { type: "webhook", label: "Webhook", icon: Webhook, color: "text-accent-foreground" },
  { type: "document", label: "Document", icon: FileText, color: "text-warning" },
  { type: "link", label: "Link", icon: ExternalLink, color: "text-destructive" },
  { type: "subTree", label: "Sub-Script", icon: Layers, color: "text-muted-foreground" },
  { type: "end", label: "End", icon: CircleX, color: "text-node-end" },
];

const DEFAULT_NODES: Node[] = [
  { id: "start-1", type: "start", position: { x: 300, y: 50 }, data: { label: "Start" } },
];

export default function ScriptBuilderPage() {
  const { scriptId } = useParams<{ scriptId: string }>();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const orgId = organization?.id;
  const { data: scripts = [] } = useScripts();
  const updateScript = useUpdateScript();
  const versioning = useScriptVersioning({ scriptId });

  const script = useMemo(() => scripts.find(s => s.id === scriptId), [scripts, scriptId]);

  // Load script into versioning hook
  useEffect(() => {
    if (scriptId) versioning.fetchScript(scriptId);
  }, [scriptId]);

  const initialData = useMemo(() => {
    if (script?.definition) {
      const def = script.definition as { nodes?: Node[]; edges?: Edge[] };
      return { nodes: def.nodes || DEFAULT_NODES, edges: def.edges || [] };
    }
    return { nodes: DEFAULT_NODES, edges: [] };
  }, [script]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const nodeIdCounter = useRef(1);

  // Sync when script loads
  useEffect(() => {
    if (script?.definition) {
      const def = script.definition as { nodes?: Node[]; edges?: Edge[] };
      if (def.nodes) setNodes(def.nodes);
      if (def.edges) setEdges(def.edges);
    }
  }, [script?.id]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2 },
    }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => setSelectedNode(node), []);
  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  const addNode = useCallback((type: string) => {
    nodeIdCounter.current += 1;
    const id = `${type}-${nodeIdCounter.current}-${Date.now()}`;
    const label = NODE_PALETTE.find(n => n.type === type)?.label || type;
    const newNode: Node = {
      id,
      type,
      position: { x: 300 + Math.random() * 100, y: 200 + Math.random() * 200 },
      data: { label },
    };
    setNodes(nds => [...nds, newNode]);
  }, [setNodes]);

  const updateNodeData = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data } : n));
    setSelectedNode(prev => prev?.id === nodeId ? { ...prev, data } : prev);
  }, [setNodes]);

  const handleSave = useCallback(async () => {
    if (!scriptId) return;
    await versioning.saveDraft({ nodes, edges });
  }, [scriptId, nodes, edges, versioning]);

  const handlePublish = useCallback(async () => {
    if (!scriptId) return;
    await versioning.publish({ nodes, edges });
  }, [scriptId, nodes, edges, versioning]);

  const handleAIGenerated = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
  }, [setNodes, setEdges]);

  const handleTemplateSelect = useCallback((tNodes: Node[], tEdges: Edge[]) => {
    setNodes(tNodes);
    setEdges(tEdges);
  }, [setNodes, setEdges]);

  const handleImport = useCallback((importedNodes: Node[], importedEdges: Edge[]) => {
    setNodes(importedNodes);
    setEdges(importedEdges);
    setShowImport(false);
  }, [setNodes, setEdges]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Toolbar */}
      <div className="border-b border-border bg-card px-4 py-2 flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/scripts")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="h-5 w-px bg-border" />
        <h2 className="text-sm font-medium truncate max-w-[200px]">{script?.name || "Script Builder"}</h2>
        {versioning.script && (
          <ScriptStatusBadge
            isLive={!!versioning.script.is_live}
            hasUnsavedChanges={versioning.hasUnsavedChanges}
            version={versioning.script.version || 1}
          />
        )}
        <div className="flex-1" />

        <AIScriptGenerator onGenerated={handleAIGenerated} />
        <TemplateGallery onSelect={handleTemplateSelect} />
        <ScriptTestMode nodes={nodes} edges={edges} />
        <Button variant="outline" size="sm" onClick={() => setShowValidation(true)} className="gap-1.5">
          Validate
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="gap-1.5">
          Import
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadScriptJSON(nodes, edges, { name: script?.name, version: versioning.script?.version })} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        <SaveAsTemplateDialog nodes={nodes} edges={edges} />

        <div className="h-5 w-px bg-border" />

        <Button variant="outline" size="sm" onClick={() => setShowVersions(!showVersions)} className="gap-1.5">
          <Undo2 className="h-3.5 w-3.5" /> Versions
        </Button>
        <Button variant="outline" size="sm" onClick={handleSave} disabled={versioning.isSaving} className="gap-1.5">
          <Save className="h-3.5 w-3.5" /> Save Draft
        </Button>
        <Button size="sm" onClick={handlePublish} disabled={versioning.isPublishing} className="gap-1.5">
          <Upload className="h-3.5 w-3.5" /> Publish
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette */}
        <div className="w-48 border-r border-border bg-card p-3 space-y-1.5 overflow-y-auto shrink-0">
          <p className="text-xs font-medium text-muted-foreground mb-2">Nodes</p>
          {NODE_PALETTE.map(item => (
            <button
              key={item.type}
              onClick={() => addNode(item.type)}
              className="w-full flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent hover:border-accent transition-colors text-left"
            >
              <item.icon className={`h-4 w-4 ${item.color}`} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode="Delete"
            className="bg-background"
          >
            <Background gap={20} color="hsl(var(--border) / 0.5)" />
            <Controls />
            <MiniMap
              nodeStrokeColor="hsl(var(--border))"
              nodeColor="hsl(var(--card))"
              maskColor="hsl(var(--background) / 0.8)"
            />
          </ReactFlow>
        </div>

        {/* Property Panel */}
        {selectedNode && (
          <NodePropertyEditors
            node={selectedNode}
            onUpdate={updateNodeData}
            onClose={() => setSelectedNode(null)}
          />
        )}

        {/* Version History */}
        {showVersions && (
          <VersionHistoryPanel
            versions={versioning.versions}
            currentVersion={versioning.script?.version || 1}
            isOpen={showVersions}
            onClose={() => setShowVersions(false)}
            onRollback={async (v) => { await versioning.rollbackToVersion(v); }}
          />
        )}
      </div>

      {/* Dialogs */}
      <ScriptImportDialog isOpen={showImport} onClose={() => setShowImport(false)} onImport={handleImport} />
      <ScriptValidationDialog
        isOpen={showValidation}
        onClose={() => setShowValidation(false)}
        nodes={nodes}
        edges={edges}
        onNodeSelect={(nodeId) => {
          const n = nodes.find(nd => nd.id === nodeId);
          if (n) setSelectedNode(n);
          setShowValidation(false);
        }}
        onPublish={handlePublish}
      />
    </div>
  );
}
