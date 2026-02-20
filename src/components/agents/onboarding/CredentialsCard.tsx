import { useState } from "react";
import { Copy, Check, User, Mail, Phone, Key, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProvisioningResult } from "@/types/provisioning";

interface CredentialsCardProps {
  result: ProvisioningResult;
}

function CopyField({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 border border-border px-3 py-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium text-foreground truncate">{value}</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={handleCopy}>
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
      </Button>
    </div>
  );
}

export function CredentialsCard({ result }: CredentialsCardProps) {
  return (
    <div className="rounded-xl border border-success/30 bg-success/5 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center">
          <Check className="h-4 w-4 text-success" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Agent Provisioned Successfully</p>
          <p className="text-xs text-muted-foreground">All credentials generated</p>
        </div>
      </div>
      <div className="space-y-2">
        <CopyField label="Agent Name" value={result.agentName} icon={User} />
        <CopyField label="Work Email" value={result.email} icon={Mail} />
        <CopyField label="Five9 Username" value={result.five9Username} icon={Shield} />
        <CopyField label="Extension" value={String(result.extension)} icon={Phone} />
        <CopyField label="Temporary Password" value={result.password} icon={Key} />
      </div>
      <p className="text-xs text-warning mt-3">⚠ Credentials also sent to the external email provided.</p>
    </div>
  );
}
