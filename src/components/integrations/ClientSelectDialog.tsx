import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, Check } from "lucide-react";
import { useTenants } from "@/hooks/useTenants";
import { useNavigate } from "react-router-dom";
import type { Integration } from "@/data/integrations-catalog";

interface Props {
  integration: Integration;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAll: () => void;
}

const INTEGRATION_FIELD_MAP: Record<string, string> = {
  slack: "slack_webhook_url",
  zapier: "zapier_webhook_url",
  make: "make_webhook_url",
  n8n: "n8n_webhook_url",
  pabbly: "pabbly_webhook_url",
};

export function ClientSelectDialog({ integration, open, onOpenChange, onCloseAll }: Props) {
  const [search, setSearch] = useState("");
  const { data: tenants = [] } = useTenants();
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tenants
      .filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.crm_type.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tenants, search]);

  const isConfiguredForTenant = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) return false;

    // CRM type match
    if (["clio", "workiz", "salesforce"].includes(integration.id)) {
      return tenant.crm_type === integration.id;
    }

    // Webhook match
    const field = INTEGRATION_FIELD_MAP[integration.id];
    if (field) {
      return !!(tenant as any)[field];
    }

    return false;
  };

  const handleSelect = (tenantId: string) => {
    onOpenChange(false);
    onCloseAll();
    navigate(`/admin?edit=${tenantId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Client</DialogTitle>
          <DialogDescription>
            Choose a client to configure {integration.name} for.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[50vh]">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No clients found.</p>
          ) : (
            filtered.map((tenant) => {
              const configured = isConfiguredForTenant(tenant.id);
              return (
                <button
                  key={tenant.id}
                  className="w-full flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-accent transition-colors"
                  onClick={() => handleSelect(tenant.id)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{tenant.crm_type}</p>
                  </div>
                  {configured && (
                    <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30 flex-shrink-0">
                      <Check className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  )}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
