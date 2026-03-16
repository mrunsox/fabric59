import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Play, RotateCcw, ChevronRight, CheckCircle2, X } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";

interface ScriptTestModeProps {
  nodes: Node[];
  edges: Edge[];
}

export function ScriptTestMode({ nodes, edges }: ScriptTestModeProps) {
  const [open, setOpen] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);

  const startNode = useMemo(() => nodes.find(n => n.type === "start"), [nodes]);

  const currentNode = useMemo(() => nodes.find(n => n.id === currentNodeId), [nodes, currentNodeId]);

  const outgoingEdges = useMemo(() => {
    if (!currentNodeId) return [];
    return edges.filter(e => e.source === currentNodeId);
  }, [edges, currentNodeId]);

  const nextNodes = useMemo(() => {
    return outgoingEdges.map(e => ({
      edge: e,
      node: nodes.find(n => n.id === e.target),
    })).filter(x => x.node);
  }, [outgoingEdges, nodes]);

  const start = useCallback(() => {
    if (startNode) {
      const firstEdge = edges.find(e => e.source === startNode.id);
      const firstNode = firstEdge ? nodes.find(n => n.id === firstEdge.target) : null;
      if (firstNode) {
        setCurrentNodeId(firstNode.id);
        setHistory([firstNode.id]);
        setCompleted(false);
      }
    }
  }, [startNode, edges, nodes]);

  const goTo = useCallback((nodeId: string) => {
    const targetNode = nodes.find(n => n.id === nodeId);
    if (targetNode?.type === "end") {
      setCompleted(true);
      setCurrentNodeId(nodeId);
    } else {
      setCurrentNodeId(nodeId);
    }
    setHistory(h => [...h, nodeId]);
  }, [nodes]);

  const goBack = useCallback(() => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      setCurrentNodeId(newHistory[newHistory.length - 1]);
      setCompleted(false);
    }
  }, [history]);

  const reset = useCallback(() => {
    setCurrentNodeId(null);
    setHistory([]);
    setCompleted(false);
  }, []);

  const nodeTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      question: "Question",
      action: "Action",
      condition: "Condition",
      emailSms: "Email/SMS",
      webhook: "Webhook",
      document: "Document",
      link: "Link",
      subTree: "Sub-Script",
      end: "End",
      start: "Start",
    };
    return labels[type || ""] || "Step";
  };

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Play className="h-3.5 w-3.5" /> Test Mode
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" /> Script Test Mode
          </DialogTitle>
        </DialogHeader>

        {!currentNodeId && !completed && (
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">Preview this script as an agent would experience it.</p>
            <Button onClick={start} disabled={!startNode} className="gap-2">
              <Play className="h-4 w-4" /> Start Test
            </Button>
            {!startNode && <p className="text-xs text-destructive">No start node found</p>}
          </div>
        )}

        {completed && (
          <div className="text-center py-12 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <h3 className="text-lg font-semibold">Script Complete</h3>
            <p className="text-sm text-muted-foreground">Visited {history.length} nodes</p>
            <Button onClick={reset} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" /> Restart
            </Button>
          </div>
        )}

        {currentNode && !completed && (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Progress */}
            <div className="flex items-center gap-2">
              <Badge variant="outline">{nodeTypeLabel(currentNode.type)}</Badge>
              <span className="text-xs text-muted-foreground">Step {history.length}</span>
              <div className="ml-auto flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={goBack} disabled={history.length <= 1} className="gap-1">
                  <RotateCcw className="h-3 w-3" /> Back
                </Button>
                <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
                  <X className="h-3 w-3" /> Reset
                </Button>
              </div>
            </div>

            {/* Current node card */}
            <Card className="border-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{currentNode.data.label as string}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentNode.data.prompt && (
                  <p className="text-sm">{currentNode.data.prompt as string}</p>
                )}
                {currentNode.data.instructions && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Agent Instructions</p>
                    <p className="text-sm">{currentNode.data.instructions as string}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next options */}
            {nextNodes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Next Steps</p>
                {nextNodes.map(({ edge, node: targetNode }) => (
                  <Button
                    key={edge.id}
                    variant="outline"
                    className="w-full justify-between h-auto py-3"
                    onClick={() => targetNode && goTo(targetNode.id)}
                  >
                    <div className="text-left">
                      <p className="text-sm font-medium">{edge.label || targetNode?.data.label as string}</p>
                      <p className="text-xs text-muted-foreground capitalize">{nodeTypeLabel(targetNode?.type)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            )}

            {nextNodes.length === 0 && !completed && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No outgoing connections — this is a dead end.
              </p>
            )}

            {/* Breadcrumb */}
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-1">Path</p>
              <div className="flex flex-wrap gap-1">
                {history.map((nId, i) => {
                  const n = nodes.find(nd => nd.id === nId);
                  return (
                    <Badge key={i} variant={nId === currentNodeId ? "default" : "secondary"} className="text-xs">
                      {n?.data.label as string || "?"}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
