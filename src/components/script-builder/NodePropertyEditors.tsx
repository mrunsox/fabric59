import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, X } from "lucide-react";
import type { Node } from "@xyflow/react";

interface NodePropertyEditorsProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function NodePropertyEditors({ node, onUpdate, onClose }: NodePropertyEditorsProps) {
  if (!node) return null;

  const update = (key: string, value: unknown) => {
    onUpdate(node.id, { ...node.data, [key]: value });
  };

  const nodeType = node.type || "default";

  return (
    <Card className="w-80 shrink-0 overflow-y-auto max-h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm capitalize">{nodeType} Properties</CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Common fields */}
        <div>
          <label className="text-xs font-medium mb-1 block">Label</label>
          <Input
            value={(node.data.label as string) || ""}
            onChange={e => update("label", e.target.value)}
            placeholder="Node label"
          />
        </div>

        {/* Question node */}
        {nodeType === "question" && (
          <>
            <div>
              <label className="text-xs font-medium mb-1 block">Prompt</label>
              <Textarea
                value={(node.data.prompt as string) || ""}
                onChange={e => update("prompt", e.target.value)}
                rows={3}
                placeholder="What should the agent ask?"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Options</label>
              <OptionsEditor
                options={(node.data.options as string[]) || []}
                onChange={opts => update("options", opts)}
              />
            </div>
          </>
        )}

        {/* Action node */}
        {nodeType === "action" && (
          <div>
            <label className="text-xs font-medium mb-1 block">Instructions</label>
            <Textarea
              value={(node.data.instructions as string) || ""}
              onChange={e => update("instructions", e.target.value)}
              rows={4}
              placeholder="Agent instructions for this step"
            />
          </div>
        )}

        {/* Condition node */}
        {nodeType === "condition" && (
          <div>
            <label className="text-xs font-medium mb-1 block">Condition Expression</label>
            <Input
              value={(node.data.expression as string) || ""}
              onChange={e => update("expression", e.target.value)}
              placeholder="e.g., caller_type === 'new'"
            />
          </div>
        )}

        {/* Email/SMS node */}
        {nodeType === "emailSms" && (
          <>
            <div>
              <label className="text-xs font-medium mb-1 block">Channel</label>
              <Select value={(node.data.channel as string) || "email"} onValueChange={v => update("channel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Template</label>
              <Input
                value={(node.data.templateName as string) || ""}
                onChange={e => update("templateName", e.target.value)}
                placeholder="Template name"
              />
            </div>
          </>
        )}

        {/* Webhook node */}
        {nodeType === "webhook" && (
          <>
            <div>
              <label className="text-xs font-medium mb-1 block">URL</label>
              <Input
                value={(node.data.url as string) || ""}
                onChange={e => update("url", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Method</label>
              <Select value={(node.data.method as string) || "POST"} onValueChange={v => update("method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Document node */}
        {nodeType === "document" && (
          <>
            <div>
              <label className="text-xs font-medium mb-1 block">Document Type</label>
              <Select value={(node.data.documentType as string) || "html"} onValueChange={v => update("documentType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Template</label>
              <Input
                value={(node.data.templateName as string) || ""}
                onChange={e => update("templateName", e.target.value)}
                placeholder="Template name"
              />
            </div>
          </>
        )}

        {/* Link node */}
        {nodeType === "link" && (
          <>
            <div>
              <label className="text-xs font-medium mb-1 block">URL</label>
              <Input
                value={(node.data.url as string) || ""}
                onChange={e => update("url", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Open in New Tab</label>
              <Switch
                checked={!!node.data.openInNewTab}
                onCheckedChange={v => update("openInNewTab", v)}
              />
            </div>
          </>
        )}

        {/* SubTree node */}
        {nodeType === "subTree" && (
          <div>
            <label className="text-xs font-medium mb-1 block">Sub-Script ID</label>
            <Input
              value={(node.data.scriptId as string) || ""}
              onChange={e => update("scriptId", e.target.value)}
              placeholder="Script UUID"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (opts: string[]) => void }) {
  return (
    <div className="space-y-1.5">
      {options.map((opt, i) => (
        <div key={i} className="flex gap-1.5">
          <Input
            value={opt}
            onChange={e => {
              const next = [...options];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="h-8 text-sm"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => onChange(options.filter((_, j) => j !== i))}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => onChange([...options, ""])}>
        <Plus className="h-3 w-3" /> Add Option
      </Button>
    </div>
  );
}
