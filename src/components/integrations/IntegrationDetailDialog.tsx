import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { IntegrationConfigWizard } from "./IntegrationConfigWizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Integration, ActionDirection } from "@/data/integrations-catalog";
import { ClientSelectDialog } from "./ClientSelectDialog";

interface Props {
  integration: Integration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const directionConfig: Record<ActionDirection, { icon: typeof ArrowUpRight; label: string; className: string }> = {
  outbound: { icon: ArrowUpRight, label: "Outbound", className: "text-blue-500" },
  inbound: { icon: ArrowDownLeft, label: "Inbound", className: "text-green-500" },
  bidirectional: { icon: ArrowLeftRight, label: "Bidirectional", className: "text-amber-500" },
};

const LINKED_INTEGRATIONS = ["clio", "workiz", "salesforce", "slack", "zapier", "make", "n8n", "pabbly", "hubspot", "zendesk", "ms-teams", "twilio", "zoom", "google-calendar", "stripe", "quickbooks", "calendly", "docusign", "google-drive", "dropbox", "microsoft-365", "asana", "openai", "power-automate", "jobber", "housecall-pro", "smokeball", "mycase", "practicepanther", "filevine", "cosmolex", "zoho-crm", "dynamics-365", "quoteiq", "fieldpulse", "zenmaid", "leap", "actionstep", "abacuslaw", "ringcentral", "google-chat", "oncehub", "monday", "onedrive", "adobe-sign", "hellosign", "netdocuments", "lawpay", "casetext", "spellbook", "harvey-ai", "lexis-ai", "darrow-ai", "diligen", "westlaw", "fastcase", "lastpass", "nordpass"];

export function IntegrationDetailDialog({ integration, open, onOpenChange }: Props) {
  const [clientSelectOpen, setClientSelectOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  if (!integration) return null;

  const Icon = integration.icon;
  const isLinked = LINKED_INTEGRATIONS.includes(integration.id);

  const handleConfigure = () => {
    if (isLinked) {
      setWizardOpen(true);
    } else {
      toast({
        title: "Coming Soon",
        description: `${integration.name} integration setup is not yet available.`,
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {integration.logoUrl ? (
                  <img src={integration.logoUrl} alt={integration.name} className="h-6 w-6 object-contain dark:invert" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg">{integration.name}</DialogTitle>
                <DialogDescription className="text-xs">
                  {integration.category}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-xs">{integration.apiType}</Badge>
              <Badge variant="secondary" className="text-xs">{integration.authMethod}</Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  integration.status === "available"
                    ? "bg-success/10 text-success border-success/30"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {integration.status === "available" ? "Available" : integration.status === "beta" ? "Beta" : "Coming Soon"}
              </Badge>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {integration.longDescription}
            </p>

            <Separator />

            {/* Actions */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Supported Actions</h4>
              <div className="space-y-2">
                {integration.actions.map((action) => {
                  const dir = directionConfig[action.direction];
                  const DirIcon = dir.icon;
                  return (
                    <div key={action.name} className="flex items-start gap-3 rounded-lg border p-3">
                      <DirIcon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", dir.className)} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{action.name}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                      <Badge variant="outline" className="ml-auto text-[10px] flex-shrink-0">
                        {dir.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Footer actions */}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleConfigure}>
                {isLinked ? "Configure in Clients" : "Configure"}
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Config wizard */}
      {integration && (
        <IntegrationConfigWizard
          integration={integration}
          open={wizardOpen}
          onOpenChange={setWizardOpen}
        />
      )}

      {/* Client selection dialog (legacy fallback) */}
      {integration && (
        <ClientSelectDialog
          integration={integration}
          open={clientSelectOpen}
          onOpenChange={setClientSelectOpen}
          onCloseAll={() => onOpenChange(false)}
        />
      )}
    </>
  );
}
