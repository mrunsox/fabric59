import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

interface Props {
  clientId: string;
}

const POLICIES = [
  { key: "auto_create_contact", label: "Auto-create contact when missing" },
  { key: "auto_create_matter", label: "Auto-create matter / case for new intakes" },
  { key: "create_note_on_call", label: "Create note for every Five9 call" },
  { key: "create_task_on_callback", label: "Create task on callback dispositions" },
  { key: "strict_dup_prevention", label: "Strict duplicate prevention" },
  { key: "fallback_to_review_queue", label: "Fallback to review queue when unsupported" },
];

export default function ProviderPoliciesPanel({ clientId }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Provider Policies</CardTitle>
        </div>
        <CardDescription>
          Client-level defaults applied to all campaigns unless explicitly overridden at the
          campaign layer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {POLICIES.map((p) => (
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
