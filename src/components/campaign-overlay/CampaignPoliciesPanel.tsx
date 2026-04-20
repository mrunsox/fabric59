import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  clientId: string;
  campaignId?: string;
}

const CAMPAIGN_POLICIES = [
  { key: "campaign_callback_handling", label: "Honor callback dispositions" },
  { key: "campaign_screen_pop", label: "Trigger screen-pop on inbound" },
  { key: "campaign_review_on_unsupported", label: "Send unsupported actions to review queue" },
  { key: "campaign_strict_var_validation", label: "Strict required-variable validation" },
];

export default function CampaignPoliciesPanel({ clientId, campaignId }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Campaign Policies</CardTitle>
        </div>
        <CardDescription>
          Operational overrides for this campaign only. Provider-level defaults (auto-create,
          duplicate prevention) live in client setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            These settings affect Five9 operational behavior only. They cannot store or override
            provider credentials.
          </AlertDescription>
        </Alert>
        {CAMPAIGN_POLICIES.map((p) => (
          <div
            key={p.key}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
          >
            <Label htmlFor={p.key} className="text-sm cursor-pointer">
              {p.label}
            </Label>
            <Switch id={p.key} defaultChecked />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
