import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, ArrowDown, ChevronDown, ChevronRight, ShieldAlert, Clock } from "lucide-react";
import type { DecisionTreeNode, DecisionTreeOption } from "@/types/campaign";

interface DecisionTreeBuilderProps {
  nodes: DecisionTreeNode[];
  onChange: (nodes: DecisionTreeNode[]) => void;
}

function generateId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function DecisionTreeBuilder({ nodes, onChange }: DecisionTreeBuilderProps) {
  const [expandedAdvanced, setExpandedAdvanced] = useState<Record<string, boolean>>({});

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

  const addConditionalClosing = (nodeIndex: number) => {
    const updated = [...nodes];
    const closings = updated[nodeIndex].conditionalClosings || [];
    updated[nodeIndex].conditionalClosings = [...closings, { condition: "", script: "" }];
    onChange(updated);
  };

  const updateConditionalClosing = (nodeIndex: number, closingIndex: number, patch: { condition?: string; script?: string }) => {
    const updated = [...nodes];
    const closings = [...(updated[nodeIndex].conditionalClosings || [])];
    closings[closingIndex] = { ...closings[closingIndex], ...patch };
    updated[nodeIndex].conditionalClosings = closings;
    onChange(updated);
  };

  const removeConditionalClosing = (nodeIndex: number, closingIndex: number) => {
    const updated = [...nodes];
    updated[nodeIndex].conditionalClosings = (updated[nodeIndex].conditionalClosings || []).filter((_, i) => i !== closingIndex);
    onChange(updated);
  };

  const toggleAdvanced = (nodeId: string) => {
    setExpandedAdvanced((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Build the step-by-step script agents follow during calls. Each question can branch based on the caller's response, skip to other questions, or end the call.
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
              <CardTitle className="text-sm font-medium flex-1 flex items-center gap-2">
                Question {nodeIndex + 1}
                {node.isGate && <ShieldAlert className="h-3.5 w-3.5 text-destructive" />}
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

            {/* Required Gate Toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={node.isGate || false}
                onCheckedChange={(v) => updateNode(nodeIndex, { isGate: v })}
              />
              <Label className="text-xs cursor-pointer">Required Gate (must collect data to proceed)</Label>
            </div>
            {node.isGate && (
              <Textarea
                value={node.gateFailMessage || ""}
                onChange={(e) => updateNode(nodeIndex, { gateFailMessage: e.target.value })}
                placeholder="Script to read if data is NOT provided (e.g. 'We need your policy number to proceed...')"
                rows={2}
                className="border-destructive/30"
              />
            )}

            {/* Answer Options */}
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Answer Options</p>
              {node.options.map((opt, optIndex) => (
                <div key={optIndex} className="space-y-2 pb-2 border-b border-muted/50 last:border-0">
                  <div className="flex flex-wrap gap-2 items-start">
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
                        skipToNodeId: v === "skip" ? opt.skipToNodeId : null,
                      })}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__route__">→ Go to Q</SelectItem>
                        <SelectItem value="skip">⤵ Skip to Q</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="disposition">Disposition</SelectItem>
                        <SelectItem value="escalate">Escalate</SelectItem>
                        <SelectItem value="end_call">End Call</SelectItem>
                      </SelectContent>
                    </Select>

                    {opt.action === "skip" ? (
                      <Select
                        value={opt.skipToNodeId || "__end__"}
                        onValueChange={(v) => updateOption(nodeIndex, optIndex, { skipToNodeId: v === "__end__" ? null : v })}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__end__">End</SelectItem>
                          {nodes.filter((n) => n.id !== node.id).map((n) => (
                            <SelectItem key={n.id} value={n.id}>
                              Q{nodes.indexOf(n) + 1}: {n.question?.slice(0, 30) || "Untitled"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : opt.action && opt.action !== "end_call" ? (
                      <Input
                        value={opt.actionValue || ""}
                        onChange={(e) => updateOption(nodeIndex, optIndex, { actionValue: e.target.value })}
                        placeholder={opt.action === "transfer" ? "Transfer number" : opt.action === "disposition" ? "Disposition name" : "Escalate to"}
                        className="w-[160px]"
                      />
                    ) : !opt.action ? (
                      <Select
                        value={opt.nextNodeId || "__end__"}
                        onValueChange={(v) => updateOption(nodeIndex, optIndex, { nextNodeId: v === "__end__" ? null : v })}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__end__">End</SelectItem>
                          {nodes.filter((n) => n.id !== node.id).map((n) => (
                            <SelectItem key={n.id} value={n.id}>
                              Q{nodes.indexOf(n) + 1}: {n.question?.slice(0, 30) || "Untitled"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}

                    {node.options.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => removeOption(nodeIndex, optIndex)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Condition field — shown for all routing types */}
                  <Input
                    value={opt.condition || ""}
                    onChange={(e) => updateOption(nodeIndex, optIndex, { condition: e.target.value })}
                    placeholder="Condition (optional, e.g. 'before 3:30pm EST', 'caller in rep list')"
                    className="text-xs"
                  />

                  {/* Fallback/persistence script */}
                  {opt.fallbackScript !== undefined && opt.fallbackScript !== "" ? (
                    <div className="flex gap-2">
                      <Textarea
                        value={opt.fallbackScript || ""}
                        onChange={(e) => updateOption(nodeIndex, optIndex, { fallbackScript: e.target.value })}
                        placeholder="Fallback script if caller persists..."
                        rows={1}
                        className="text-xs flex-1"
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => updateOption(nodeIndex, optIndex, { fallbackScript: undefined })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => updateOption(nodeIndex, optIndex, { fallbackScript: "" })}
                    >
                      + Add fallback script
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addOption(nodeIndex)} className="gap-1">
                <Plus className="h-3 w-3" /> Add Option
              </Button>
            </div>

            {/* Advanced section: Closing scripts & conditional closings */}
            <Collapsible open={expandedAdvanced[node.id] || false}>
              <CollapsibleTrigger
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => toggleAdvanced(node.id)}
              >
                {expandedAdvanced[node.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Advanced: Closing Scripts
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Closing Script</Label>
                  <Textarea
                    value={node.closingScript || ""}
                    onChange={(e) => updateNode(nodeIndex, { closingScript: e.target.value })}
                    placeholder="Standard closing statement for this question"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-xs font-medium">Conditional Closings</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">Add time-based or condition-based closing scripts (e.g., different scripts before/after 3:30pm).</p>
                  {(node.conditionalClosings || []).map((cc, ccIdx) => (
                    <div key={ccIdx} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                      <Input
                        value={cc.condition}
                        onChange={(e) => updateConditionalClosing(nodeIndex, ccIdx, { condition: e.target.value })}
                        placeholder="Condition"
                        className="text-xs"
                      />
                      <Textarea
                        value={cc.script}
                        onChange={(e) => updateConditionalClosing(nodeIndex, ccIdx, { script: e.target.value })}
                        placeholder="Closing script for this condition"
                        rows={1}
                        className="text-xs"
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeConditionalClosing(nodeIndex, ccIdx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => addConditionalClosing(nodeIndex)} className="gap-1 text-xs">
                    <Plus className="h-3 w-3" /> Add Conditional Closing
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={addNode} className="w-full gap-2">
        <Plus className="h-4 w-4" /> Add Question
      </Button>
    </div>
  );
}
