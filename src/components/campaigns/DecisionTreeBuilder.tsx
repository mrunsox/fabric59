import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, ArrowDown } from "lucide-react";
import type { DecisionTreeNode, DecisionTreeOption } from "@/types/campaign";

interface DecisionTreeBuilderProps {
  nodes: DecisionTreeNode[];
  onChange: (nodes: DecisionTreeNode[]) => void;
}

function generateId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function DecisionTreeBuilder({ nodes, onChange }: DecisionTreeBuilderProps) {
  const addNode = () => {
    const newNode: DecisionTreeNode = {
      id: generateId(),
      question: "",
      options: [{ label: "", nextNodeId: null, action: null }],
    };
    onChange([...nodes, newNode]);
  };

  const updateNode = (index: number, updates: Partial<DecisionTreeNode>) => {
    const updated = [...nodes];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeNode = (index: number) => {
    onChange(nodes.filter((_, i) => i !== index));
  };

  const addOption = (nodeIndex: number) => {
    const updated = [...nodes];
    updated[nodeIndex].options.push({ label: "", nextNodeId: null, action: null });
    onChange(updated);
  };

  const updateOption = (nodeIndex: number, optIndex: number, updates: Partial<DecisionTreeOption>) => {
    const updated = [...nodes];
    updated[nodeIndex].options[optIndex] = { ...updated[nodeIndex].options[optIndex], ...updates };
    onChange(updated);
  };

  const removeOption = (nodeIndex: number, optIndex: number) => {
    const updated = [...nodes];
    updated[nodeIndex].options = updated[nodeIndex].options.filter((_, i) => i !== optIndex);
    onChange(updated);
  };

  const moveNode = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= nodes.length) return;
    const updated = [...nodes];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Build the step-by-step script agents follow during calls. Each question can branch based on the caller's response.
      </p>

      {nodes.map((node, nodeIndex) => (
        <Card key={node.id} className="border-l-4 border-l-primary/40">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <Button type="button" variant="ghost" size="icon" className="h-5 w-5" disabled={nodeIndex === 0} onClick={() => moveNode(nodeIndex, "up")}>
                  <ArrowDown className="h-3 w-3 rotate-180" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-5 w-5" disabled={nodeIndex === nodes.length - 1} onClick={() => moveNode(nodeIndex, "down")}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
              <CardTitle className="text-sm font-medium flex-1">
                Question {nodeIndex + 1}
              </CardTitle>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeNode(nodeIndex)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={node.question}
              onChange={(e) => updateNode(nodeIndex, { question: e.target.value })}
              placeholder="What question should the agent ask?"
              rows={2}
            />
            <Input
              value={node.dataToCapture || ""}
              onChange={(e) => updateNode(nodeIndex, { dataToCapture: e.target.value })}
              placeholder="Data to capture (optional, e.g. 'caller_name')"
            />
            <Input
              value={node.notes || ""}
              onChange={(e) => updateNode(nodeIndex, { notes: e.target.value })}
              placeholder="Notes for the agent (optional)"
            />

            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Answer Options</p>
              {node.options.map((opt, optIndex) => (
                <div key={optIndex} className="flex flex-wrap gap-2 items-start">
                  <Input
                    value={opt.label}
                    onChange={(e) => updateOption(nodeIndex, optIndex, { label: e.target.value })}
                    placeholder="Option label"
                    className="flex-1 min-w-[140px]"
                  />
                  <Select
                    value={opt.action || "__route__"}
                    onValueChange={(v) => updateOption(nodeIndex, optIndex, {
                      action: v === "__route__" ? null : v as DecisionTreeOption["action"],
                      nextNodeId: v === "__route__" ? opt.nextNodeId : null,
                    })}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__route__">→ Go to Q</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="disposition">Disposition</SelectItem>
                      <SelectItem value="escalate">Escalate</SelectItem>
                    </SelectContent>
                  </Select>

                  {opt.action ? (
                    <Input
                      value={opt.actionValue || ""}
                      onChange={(e) => updateOption(nodeIndex, optIndex, { actionValue: e.target.value })}
                      placeholder={opt.action === "transfer" ? "Transfer number" : opt.action === "disposition" ? "Disposition name" : "Escalate to"}
                      className="w-[160px]"
                    />
                  ) : (
                    <Select
                      value={opt.nextNodeId || "__end__"}
                      onValueChange={(v) => updateOption(nodeIndex, optIndex, { nextNodeId: v === "__end__" ? null : v })}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__end__">End</SelectItem>
                        {nodes.filter((n) => n.id !== node.id).map((n, i) => (
                          <SelectItem key={n.id} value={n.id}>
                            Q{nodes.indexOf(n) + 1}: {n.question?.slice(0, 30) || "Untitled"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {node.options.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => removeOption(nodeIndex, optIndex)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addOption(nodeIndex)} className="gap-1">
                <Plus className="h-3 w-3" /> Add Option
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={addNode} className="w-full gap-2">
        <Plus className="h-4 w-4" /> Add Question
      </Button>
    </div>
  );
}
