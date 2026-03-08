import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Copy, Check, RefreshCw, Plug } from "lucide-react";
import { toast } from "sonner";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

interface Five9WebhookCardProps {
  tenantId?: string;
  webhookSecret: string;
  onWebhookSecretChange: (secret: string) => void;
}

export function Five9WebhookCard({ tenantId, webhookSecret, onWebhookSecretChange }: Five9WebhookCardProps) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const webhookUrl = `${supabaseUrl}/functions/v1/five9-main`;

  const generateSecret = () => {
    const secret = crypto.randomUUID() + "-" + crypto.randomUUID().slice(0, 8);
    onWebhookSecretChange(secret);
    toast.success("Webhook secret generated");
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Five9 Webhook Setup</CardTitle>
          </div>
          <StatusBadge variant={webhookSecret ? "active" : "inactive"} dot>
            {webhookSecret ? "Configured" : "Not configured"}
          </StatusBadge>
        </div>
        <CardDescription>Configure Five9 Workflow Automation to send call events here.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Webhook URL</Label>
          <div className="flex items-center gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs bg-muted/50" />
            <CopyButton value={webhookUrl} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tenant ID (x-tenant-id header)</Label>
          <div className="flex items-center gap-2">
            <Input value={tenantId || "Save client first"} readOnly className="font-mono text-xs bg-muted/50" />
            {tenantId && <CopyButton value={tenantId} />}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Webhook Secret (x-webhook-secret header)</Label>
          <div className="flex items-center gap-2">
            <Input
              value={webhookSecret}
              onChange={(e) => onWebhookSecretChange(e.target.value)}
              placeholder="Click Generate or paste your own"
              className="font-mono text-xs"
            />
            {webhookSecret && <CopyButton value={webhookSecret} />}
            <Button type="button" variant="outline" size="sm" onClick={generateSecret} className="shrink-0">
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Generate
            </Button>
          </div>
        </div>

        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Five9 Workflow Automation Setup:</p>
          <p>1. Create an HTTP POST action targeting the webhook URL above</p>
          <p>2. Add header <code className="bg-background px-1 rounded">x-tenant-id</code> with the Tenant ID value</p>
          <p>3. Add header <code className="bg-background px-1 rounded">x-webhook-secret</code> with the secret value</p>
        </div>
      </CardContent>
    </Card>
  );
}
