import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { StepProps } from "./types";

interface Props extends StepProps {
  tenants: { id: string; name: string }[];
  saving: boolean;
  onFinish: () => void;
}

export function StepReadiness({ payload, tenants, saving, onFinish }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Review and create the campaign route:</p>
      <div className="rounded-lg border border-border p-4 space-y-1 text-sm">
        <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{payload.campaign_name || "—"}</span></div>
        <div><span className="text-muted-foreground">Domain:</span> <span className="font-medium">{payload.five9_domain || "—"}</span></div>
        <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{tenants.find((t) => t.id === payload.client_id)?.name || "—"}</span></div>
        <div><span className="text-muted-foreground">Provider:</span> <Badge variant="outline">{payload.provider_target || "none"}</Badge></div>
      </div>
      <Button
        onClick={onFinish}
        disabled={saving || !payload.campaign_name || !payload.five9_domain || !payload.client_id}
        className="w-full"
      >
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Create campaign route
      </Button>
    </div>
  );
}
