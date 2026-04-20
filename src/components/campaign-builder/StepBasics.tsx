import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StepProps } from "./types";

interface Props extends StepProps {
  domains: { id: string; domain: string; display_name: string }[];
  tenants: { id: string; name: string }[];
}

export function StepBasics({ payload, updatePayload, domains, tenants }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Campaign name</Label>
        <Input value={payload.campaign_name || ""} onChange={(e) => updatePayload({ campaign_name: e.target.value })} placeholder="24H Virtual - Inbound" />
      </div>
      <div className="space-y-2">
        <Label>Campaign type</Label>
        <Input value={payload.campaign_type || ""} onChange={(e) => updatePayload({ campaign_type: e.target.value })} placeholder="Inbound" />
      </div>
      <div className="space-y-2">
        <Label>Five9 domain</Label>
        <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={payload.five9_domain || ""} onChange={(e) => updatePayload({ five9_domain: e.target.value })}>
          <option value="">Select domain…</option>
          {domains.map((d) => <option key={d.id} value={d.domain}>{d.display_name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Client</Label>
        <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={payload.client_id || ""} onChange={(e) => updatePayload({ client_id: e.target.value })}>
          <option value="">Select client…</option>
          {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Provider target (optional)</Label>
        <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={payload.provider_target || ""} onChange={(e) => updatePayload({ provider_target: e.target.value })}>
          <option value="">None</option>
          <option value="clio">Clio</option>
          <option value="mycase">MyCase</option>
          <option value="smokeball">Smokeball</option>
        </select>
      </div>
    </div>
  );
}
