import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, XCircle, ListPlus, RefreshCw } from "lucide-react";
import { useFive9Campaigns, useFive9CampaignProfiles, useCreateDispositions } from "@/hooks/useFive9Dispositions";
import type { CreateDispositionsResult } from "@/hooks/useFive9Dispositions";
import { toast } from "sonner";

interface ParsedDisposition {
  name: string;
  type: string;
  description: string;
  valid: boolean;
  error?: string;
}

const VALID_TYPES = [
  "FinalApplyToCampaigns",
  "FinalApplyToContact",
  "AddActiveNumber",
  "DoNotDial",
  "NoneApplyToCampaigns",
  "NoneApplyToContact",
];

function parseDispositions(raw: string): ParsedDisposition[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      const name = parts[0] || "";
      const type = parts[1] || "FinalApplyToCampaigns";
      const description = parts[2] || "";

      if (!name) return { name, type, description, valid: false, error: "Name is required" };
      if (!VALID_TYPES.includes(type)) return { name, type, description, valid: false, error: `Invalid type: ${type}` };

      return { name, type, description, valid: true };
    });
}

interface DispositionsTabProps {
  domainId: string;
  canManage: boolean;
}

export function DispositionsTab({ domainId, canManage }: DispositionsTabProps) {
  const [rawInput, setRawInput] = useState("");
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [results, setResults] = useState<CreateDispositionsResult | null>(null);

  const campaignsQuery = useFive9Campaigns(domainId);
  const profilesQuery = useFive9CampaignProfiles(domainId);
  const createMutation = useCreateDispositions();

  const parsed = rawInput ? parseDispositions(rawInput) : [];
  const validCount = parsed.filter((d) => d.valid).length;
  const invalidCount = parsed.filter((d) => !d.valid).length;

  const handleFetchTargets = () => {
    campaignsQuery.refetch();
    profilesQuery.refetch();
  };

  const toggleCampaign = (name: string) => {
    setSelectedCampaigns((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const toggleProfile = (name: string) => {
    setSelectedProfiles((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  const handleExecute = async () => {
    const validDispositions = parsed.filter((d) => d.valid);
    if (validDispositions.length === 0) {
      toast.error("No valid dispositions to create");
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        dispositions: validDispositions.map((d) => ({
          name: d.name,
          type: d.type,
          description: d.description,
        })),
        campaigns: selectedCampaigns,
        campaignProfiles: selectedProfiles,
      });
      setResults(result);
      const created = result.creationResults.filter((r) => r.success).length;
      toast.success(`${created} disposition(s) processed successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create dispositions");
    }
  };

  return (
    <div className="space-y-4">
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListPlus className="h-5 w-5" />
            Bulk Create Dispositions
          </CardTitle>
          <CardDescription>
            Paste dispositions in pipe-delimited format, then assign them to campaigns and profiles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Dispositions (one per line)</Label>
            <Textarea
              placeholder={`Appointment Set | FinalApplyToCampaigns | Caller scheduled an appointment\nNot Interested | FinalApplyToCampaigns | Caller declined services\nWrong Number | FinalApplyToContact | Invalid phone number`}
              value={rawInput}
              onChange={(e) => {
                setRawInput(e.target.value);
                setResults(null);
              }}
              disabled={!canManage}
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Format: <code className="bg-muted px-1 rounded">Name | Type | Description</code> — Type defaults to <code className="bg-muted px-1 rounded">FinalApplyToCampaigns</code> if omitted
            </p>
          </div>

          {/* Parse Preview */}
          {parsed.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Preview</Label>
                <Badge variant="secondary">{validCount} valid</Badge>
                {invalidCount > 0 && <Badge variant="destructive">{invalidCount} invalid</Badge>}
              </div>
              <div className="rounded-md border overflow-auto max-h-48">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-left px-3 py-2 font-medium">Type</th>
                      <th className="text-left px-3 py-2 font-medium">Description</th>
                      <th className="text-left px-3 py-2 font-medium w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((d, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5">{d.name || "—"}</td>
                        <td className="px-3 py-1.5">
                          <code className="text-xs bg-muted px-1 rounded">{d.type}</code>
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{d.description || "—"}</td>
                        <td className="px-3 py-1.5">
                          {d.valid ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <span title={d.error}>
                              <XCircle className="h-4 w-4 text-destructive" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Targets Card */}
      <Card>
        <CardHeader>
          <CardTitle>Assign to Campaigns & Profiles</CardTitle>
          <CardDescription>
            Fetch live data from Five9 to select which campaigns and profiles should receive the dispositions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={handleFetchTargets}
            disabled={campaignsQuery.isFetching || profilesQuery.isFetching}
          >
            {campaignsQuery.isFetching || profilesQuery.isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Fetch Campaigns & Profiles
          </Button>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Campaigns */}
            <div className="space-y-2">
              <Label>Campaigns</Label>
              {campaignsQuery.data && campaignsQuery.data.length > 0 ? (
                <div className="rounded-md border p-3 space-y-2 max-h-48 overflow-auto">
                  {campaignsQuery.data.map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedCampaigns.includes(c)}
                        onCheckedChange={() => toggleCampaign(c)}
                        disabled={!canManage}
                      />
                      {c}
                    </label>
                  ))}
                </div>
              ) : campaignsQuery.data ? (
                <p className="text-sm text-muted-foreground">No campaigns found</p>
              ) : (
                <p className="text-sm text-muted-foreground">Click "Fetch" to load campaigns</p>
              )}
            </div>

            {/* Campaign Profiles */}
            <div className="space-y-2">
              <Label>Campaign Profiles</Label>
              {profilesQuery.data && profilesQuery.data.length > 0 ? (
                <div className="rounded-md border p-3 space-y-2 max-h-48 overflow-auto">
                  {profilesQuery.data.map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedProfiles.includes(p)}
                        onCheckedChange={() => toggleProfile(p)}
                        disabled={!canManage}
                      />
                      {p}
                    </label>
                  ))}
                </div>
              ) : profilesQuery.data ? (
                <p className="text-sm text-muted-foreground">No campaign profiles found</p>
              ) : (
                <p className="text-sm text-muted-foreground">Click "Fetch" to load profiles</p>
              )}
            </div>
          </div>

          {/* Execute */}
          {canManage && (
            <Button
              onClick={handleExecute}
              disabled={createMutation.isPending || validCount === 0}
              className="w-full sm:w-auto"
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ListPlus className="mr-2 h-4 w-4" />
              )}
              Create & Assign ({validCount} disposition{validCount !== 1 ? "s" : ""})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Results Card */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Creation Results */}
            <div className="space-y-2">
              <Label>Disposition Creation</Label>
              <div className="rounded-md border overflow-auto max-h-48">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-left px-3 py-2 font-medium">Status</th>
                      <th className="text-left px-3 py-2 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.creationResults.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5">
                          {r.success ? (
                            <Badge variant="default" className="bg-success text-success-foreground">Success</Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground text-xs">{r.error || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Assignment Results */}
            {results.assignmentResults.length > 0 && (
              <div className="space-y-2">
                <Label>Campaign/Profile Assignment</Label>
                <div className="rounded-md border overflow-auto max-h-48">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Target</th>
                        <th className="text-left px-3 py-2 font-medium">Type</th>
                        <th className="text-left px-3 py-2 font-medium">Status</th>
                        <th className="text-left px-3 py-2 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.assignmentResults.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1.5">{r.target}</td>
                          <td className="px-3 py-1.5">
                            <code className="text-xs bg-muted px-1 rounded">{r.targetType}</code>
                          </td>
                          <td className="px-3 py-1.5">
                            {r.success ? (
                              <Badge variant="default" className="bg-success text-success-foreground">Success</Badge>
                            ) : (
                              <Badge variant="destructive">Failed</Badge>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground text-xs">{r.error || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
