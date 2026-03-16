import { useState, useMemo } from "react";
import { Node, Edge } from "@xyflow/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, XCircle, AlertCircle, GitBranch, ArrowRight, Unplug, CircleDot, MessageSquare, Link2Off, Navigation } from "lucide-react";

export interface ValidationIssue {
  id: string;
  type: "error" | "warning" | "info";
  category: "dead-end" | "orphaned" | "missing-connection" | "duplicate" | "empty-content" | "no-start" | "no-end";
  nodeId?: string;
  nodeLabel?: string;
  nodeType?: string;
  message: string;
  suggestion: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  score: number;
}

export function validateScript(nodes: Node[], edges: Edge[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const getOutgoingEdges = (nodeId: string) => edges.filter((e) => e.source === nodeId);
  const startNodes = nodes.filter((n) => n.type === "start");

  if (startNodes.length === 0) {
    issues.push({ id: "no-start", type: "error", category: "no-start", message: "No start node found", suggestion: "Add a Start node to define where the script begins" });
  } else if (startNodes.length > 1) {
    startNodes.slice(1).forEach((node) => {
      issues.push({ id: `duplicate-start-${node.id}`, type: "error", category: "duplicate", nodeId: node.id, nodeLabel: (node.data?.label as string) || "Start", nodeType: node.type, message: "Multiple start nodes detected", suggestion: "Remove extra start nodes" });
    });
  }

  const endNodes = nodes.filter((n) => n.type === "end");
  if (endNodes.length === 0) {
    issues.push({ id: "no-end", type: "warning", category: "no-end", message: "No end node found", suggestion: "Add at least one End node" });
  }

  const reachableNodes = new Set<string>();
  if (startNodes.length > 0) {
    const queue = [startNodes[0].id];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (reachableNodes.has(currentId)) continue;
      reachableNodes.add(currentId);
      getOutgoingEdges(currentId).forEach((edge) => { if (!reachableNodes.has(edge.target)) queue.push(edge.target); });
    }
  }

  nodes.forEach((node) => {
    if (node.type === "start") return;
    if (!reachableNodes.has(node.id)) {
      issues.push({ id: `orphaned-${node.id}`, type: "error", category: "orphaned", nodeId: node.id, nodeLabel: (node.data?.label as string) || node.type || "Unknown", nodeType: node.type, message: `"${(node.data?.label as string) || node.type}" is not reachable from Start`, suggestion: "Connect this node to the flow or remove it" });
    }
  });

  nodes.forEach((node) => {
    if (node.type === "end") return;
    if (getOutgoingEdges(node.id).length === 0) {
      issues.push({ id: `dead-end-${node.id}`, type: "warning", category: "dead-end", nodeId: node.id, nodeLabel: (node.data?.label as string) || node.type || "Unknown", nodeType: node.type, message: `"${(node.data?.label as string) || node.type}" has no outgoing connections`, suggestion: "Add a connection to the next step or an End node" });
    }
  });

  nodes.forEach((node) => {
    if (node.type === "condition" && getOutgoingEdges(node.id).length < 2) {
      issues.push({ id: `condition-branches-${node.id}`, type: "warning", category: "missing-connection", nodeId: node.id, nodeLabel: (node.data?.label as string) || "Condition", nodeType: node.type, message: `Condition "${(node.data?.label as string) || "Untitled"}" should have multiple branches`, suggestion: "Add at least 2 outgoing connections" });
    }
  });

  const errors = issues.filter((i) => i.type === "error");
  const warnings = issues.filter((i) => i.type === "warning");
  const info = issues.filter((i) => i.type === "info");
  const score = Math.max(0, Math.min(100, 100 - errors.length * 20 - warnings.length * 5 - info.length));

  return { isValid: errors.length === 0, errors, warnings, info, score };
}

const getCategoryIcon = (category: ValidationIssue["category"]) => {
  const map: Record<string, React.ElementType> = { "dead-end": Unplug, orphaned: Link2Off, "missing-connection": GitBranch, duplicate: AlertCircle, "empty-content": MessageSquare, "no-start": CircleDot, "no-end": Navigation };
  return map[category] || AlertTriangle;
};

interface ScriptValidationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  onNodeSelect?: (nodeId: string) => void;
  onPublish?: () => void;
}

export function ScriptValidationDialog({ isOpen, onClose, nodes, edges, onNodeSelect, onPublish }: ScriptValidationDialogProps) {
  const validation = useMemo(() => validateScript(nodes, edges), [nodes, edges]);

  const handleNodeClick = (nodeId?: string) => { if (nodeId && onNodeSelect) { onNodeSelect(nodeId); onClose(); } };

  const getScoreColor = (score: number) => score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";
  const getScoreBg = (score: number) => score >= 80 ? "bg-success/10 border-success/20" : score >= 60 ? "bg-warning/10 border-warning/20" : "bg-destructive/10 border-destructive/20";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {validation.isValid ? <CheckCircle2 className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-warning" />}
            Script Validation
          </DialogTitle>
          <DialogDescription>Review issues before publishing your script</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <Card className={getScoreBg(validation.score)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`text-4xl font-bold ${getScoreColor(validation.score)}`}>{validation.score}</div>
                  <div>
                    <p className="font-medium">{validation.score >= 80 ? "Script looks good!" : validation.score >= 60 ? "Some issues to review" : "Critical issues found"}</p>
                    <p className="text-sm text-muted-foreground">{validation.errors.length} errors, {validation.warnings.length} warnings, {validation.info.length} suggestions</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{validation.errors.length}</Badge>
                  <Badge variant="secondary" className="gap-1 bg-warning/20 text-warning"><AlertTriangle className="h-3 w-3" />{validation.warnings.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4">
              {[
                { items: validation.errors, label: "Errors", color: "text-destructive", Icon: XCircle },
                { items: validation.warnings, label: "Warnings", color: "text-warning", Icon: AlertTriangle },
                { items: validation.info, label: "Suggestions", color: "text-muted-foreground", Icon: AlertCircle },
              ].map(({ items, label, color, Icon }) => items.length > 0 && (
                <div key={label} className="space-y-2">
                  <h3 className={`text-sm font-semibold ${color} flex items-center gap-2`}><Icon className="h-4 w-4" />{label} ({items.length})</h3>
                  {items.map((issue) => {
                    const CatIcon = getCategoryIcon(issue.category);
                    return (
                      <div key={issue.id} className={`rounded-lg border p-3 ${issue.type === "error" ? "border-destructive/30 bg-destructive/5" : issue.type === "warning" ? "border-warning/30 bg-warning/5" : "border-border bg-muted/30"} ${issue.nodeId ? "cursor-pointer hover:bg-muted/50" : ""}`}
                        onClick={() => handleNodeClick(issue.nodeId)}>
                        <div className="flex items-start gap-3">
                          <CatIcon className="h-4 w-4 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{issue.message}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{issue.suggestion}</p>
                          </div>
                          {issue.nodeId && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Fix Issues</Button>
          <Button onClick={() => { onPublish?.(); onClose(); }} disabled={!validation.isValid} variant={validation.isValid ? "default" : "secondary"}>
            {validation.isValid ? <><CheckCircle2 className="h-4 w-4 mr-2" />Publish</> : <><XCircle className="h-4 w-4 mr-2" />Fix Errors First</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ValidationBadge({ nodes, edges, onClick }: { nodes: Node[]; edges: Edge[]; onClick?: () => void }) {
  const validation = useMemo(() => validateScript(nodes, edges), [nodes, edges]);
  if (validation.errors.length === 0 && validation.warnings.length === 0) {
    return <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-success/10 border-success/30 text-success" onClick={onClick}><CheckCircle2 className="h-3 w-3" />Valid</Badge>;
  }
  if (validation.errors.length > 0) {
    return <Badge variant="destructive" className="gap-1.5 cursor-pointer" onClick={onClick}><XCircle className="h-3 w-3" />{validation.errors.length} Error{validation.errors.length !== 1 ? "s" : ""}</Badge>;
  }
  return <Badge variant="secondary" className="gap-1.5 cursor-pointer bg-warning/20 text-warning hover:bg-warning/30" onClick={onClick}><AlertTriangle className="h-3 w-3" />{validation.warnings.length} Warning{validation.warnings.length !== 1 ? "s" : ""}</Badge>;
}
