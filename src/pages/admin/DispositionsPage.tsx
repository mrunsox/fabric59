import { useState } from "react";
import { useDomains } from "@/hooks/useDomains";
import { DispositionsTab } from "@/components/domains/DispositionsTab";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ListPlus } from "lucide-react";

export function DispositionsContent() {
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const { data: domains = [], isLoading } = useDomains();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dispositions</h1>
        <p className="text-muted-foreground">Bulk-create Five9 dispositions and assign them to campaigns</p>
      </div>

      <div className="max-w-sm space-y-2">
        <Label>Select Domain</Label>
        <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? "Loading domains…" : "Choose a domain"} />
          </SelectTrigger>
          <SelectContent>
            {domains.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.display_name} ({d.domain})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDomainId ? (
        <DispositionsTab domainId={selectedDomainId} canManage />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <ListPlus className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Select a domain above to manage dispositions</p>
        </div>
      )}
    </div>
  );
}
