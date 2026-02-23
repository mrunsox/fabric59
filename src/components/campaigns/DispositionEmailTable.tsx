import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy } from "lucide-react";
import type { DispositionEmailConfig } from "@/types/campaign";
import { toast } from "sonner";

interface DispositionEmailTableProps {
  dispositions: string[]; // combined existing + new
  configs: DispositionEmailConfig[];
  onChange: (configs: DispositionEmailConfig[]) => void;
}

export function DispositionEmailTable({ dispositions, configs, onChange }: DispositionEmailTableProps) {
  // Ensure every disposition has a config entry
  const getConfig = (name: string): DispositionEmailConfig => {
    return configs.find((c) => c.dispositionName === name) || {
      dispositionName: name,
      emailRecipients: "",
      emailReplyTo: "",
      emailFrom: "",
      emailSubjectTemplate: "",
    };
  };

  const updateConfig = (name: string, patch: Partial<DispositionEmailConfig>) => {
    const existing = configs.find((c) => c.dispositionName === name);
    if (existing) {
      onChange(configs.map((c) => (c.dispositionName === name ? { ...c, ...patch } : c)));
    } else {
      onChange([...configs, { dispositionName: name, emailRecipients: "", ...patch }]);
    }
  };

  const copyToAll = (sourceName: string) => {
    const source = getConfig(sourceName);
    const updated = dispositions.map((d) => ({
      ...source,
      dispositionName: d,
    }));
    onChange(updated);
    toast.success(`Copied email settings from "${sourceName}" to all dispositions`);
  };

  if (dispositions.length === 0) {
    return <p className="text-sm text-muted-foreground">Select dispositions above to configure email routing.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Configure email routing per disposition. Each disposition can have its own recipients and subject template.
      </p>
      <div className="border rounded-md overflow-auto max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Disposition</TableHead>
              <TableHead className="min-w-[180px]">Recipients</TableHead>
              <TableHead className="min-w-[160px]">Subject Template</TableHead>
              <TableHead className="min-w-[140px]">Reply-To</TableHead>
              <TableHead className="min-w-[140px]">From</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dispositions.map((dName) => {
              const cfg = getConfig(dName);
              return (
                <TableRow key={dName}>
                  <TableCell className="font-medium text-xs">{dName}</TableCell>
                  <TableCell>
                    <Input
                      value={cfg.emailRecipients}
                      onChange={(e) => updateConfig(dName, { emailRecipients: e.target.value })}
                      placeholder="email@example.com"
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={cfg.emailSubjectTemplate || ""}
                      onChange={(e) => updateConfig(dName, { emailSubjectTemplate: e.target.value })}
                      placeholder="CALL: {caller_name}"
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={cfg.emailReplyTo || ""}
                      onChange={(e) => updateConfig(dName, { emailReplyTo: e.target.value })}
                      placeholder="reply-to@..."
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={cfg.emailFrom || ""}
                      onChange={(e) => updateConfig(dName, { emailFrom: e.target.value })}
                      placeholder="from@..."
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Copy these settings to all dispositions"
                      onClick={() => copyToAll(dName)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
