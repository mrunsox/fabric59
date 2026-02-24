import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDispositionAccessList, useUpdateDispositionAccess } from "@/hooks/useDispositionAccess";
import { useFive9Dispositions } from "@/hooks/useCampaignSetup";
import { useOrganizations } from "@/hooks/useOrganizations";
import { Shield, Loader2 } from "lucide-react";

export function DispositionGatingConfig() {
  const { data: organizations = [] } = useOrganizations();
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const { data: allDispositions = [], isLoading: loadingDispos } = useFive9Dispositions();
  const { data: accessList = [], isLoading: loadingAccess } = useDispositionAccessList(selectedOrg);
  const updateAccess = useUpdateDispositionAccess();

  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set(accessList.map((a) => a.disposition_name)));
  }, [accessList]);

  const handleToggle = (dispo: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dispo)) next.delete(dispo);
      else next.add(dispo);
      return next;
    });
  };

  const handleSave = () => {
    if (!selectedOrg) return;
    updateAccess.mutate({ organizationId: selectedOrg, dispositions: Array.from(selected) });
  };

  const handleSelectAll = () => setSelected(new Set(allDispositions));
  const handleDeselectAll = () => setSelected(new Set());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Disposition Gating
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Organization</label>
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select an organization..." />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedOrg && (
          <>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>Select All</Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>Deselect All</Button>
            </div>

            {loadingDispos || loadingAccess ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading dispositions...
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {allDispositions.map((d) => (
                  <label key={d} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                    <Checkbox
                      checked={selected.has(d)}
                      onCheckedChange={() => handleToggle(d)}
                    />
                    {d}
                  </label>
                ))}
              </div>
            )}

            <Button onClick={handleSave} disabled={updateAccess.isPending} className="gap-1.5">
              {updateAccess.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Access
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
