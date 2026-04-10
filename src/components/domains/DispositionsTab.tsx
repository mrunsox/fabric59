import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, CheckCircle2, XCircle, ListPlus, RefreshCw, Plus, ChevronDown, FolderPlus } from "lucide-react";
import { useFive9Campaigns, useFive9CampaignProfiles, useCreateDispositions } from "@/hooks/useFive9Dispositions";
import type { AssignTarget, CreateDispositionsResult } from "@/hooks/useFive9Dispositions";
import { toast } from "sonner";

interface ParsedDisposition {
  name: string;
  type: string;
  description: string;
  group: string;
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
      const group = parts[3] || "";

      if (!name) return { name, type, description, group, valid: false, error: "Name is required" };
      if (!VALID_TYPES.includes(type)) return { name, type, description, group, valid: false, error: `Invalid type: ${type}` };

      return { name, type, description, group, valid: true };
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
  const [assignTargets, setAssignTargets] = useState<Record<string, AssignTarget>>({});
  const [groupAssignments, setGroupAssignments] = useState<Record<string, string>>({});
  const [manualGroups, setManualGroups] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [worksheetFlags, setWorksheetFlags] = useState<Record<string, boolean>>({});

  const campaignsQuery = useFive9Campaigns(domainId);
  const profilesQuery = useFive9CampaignProfiles(domainId);
  const createMutation = useCreateDispositions();

  const parsed = rawInput ? parseDispositions(rawInput) : [];
  const validCount = parsed.filter((d) => d.valid).length;
  const invalidCount = parsed.filter((d) => !d.valid).length;

  // Merge groups from parsed input and manually added
  const allGroups = useMemo(() => {
    const parsedGroups = parsed.filter(d => d.valid && d.group).map(d => d.group);
    return [...new Set([...manualGroups, ...parsedGroups])];
  }, [parsed, manualGroups]);

  // Auto-populate group assignments from parsed input
  const effectiveGroupAssignments = useMemo(() => {
    const result = { ...groupAssignments };
    parsed.forEach(d => {
      if (d.valid && d.group && !(d.name in result)) {
        result[d.name] = d.group;
      }
    });
    return result;
  }, [parsed, groupAssignments]);

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

  const handleAddGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed || manualGroups.includes(trimmed)) return;
    setManualGroups(prev => [...prev, trimmed]);
    setNewGroupName("");
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
          agentMustCompleteWorksheet: worksheetFlags[d.name] || false,
        })),
        campaigns: selectedCampaigns,
        campaignProfiles: selectedProfiles,
        assignTargets,
        groupAssignments: effectiveGroupAssignments,
        dispositionGroups: allGroups,
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
              placeholder={`Appointment Set | FinalApplyToCampaigns | Caller scheduled an appointment | Sales Outcomes\nNot Interested | FinalApplyToCampaigns | Caller declined services\nWrong Number | FinalApplyToContact | Invalid phone number`}
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
              Format: <code className="bg-muted px-1 rounded">Name | Type | Description | Group (optional)</code>. Type defaults to <code className="bg-muted px-1 rounded">FinalApplyToCampaigns</code> if omitted.
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
              <div className="rounded-md border overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-left px-3 py-2 font-medium">Type</th>
                      <th className="text-left px-3 py-2 font-medium">Description</th>
                      <th className="text-left px-3 py-2 font-medium">Worksheet</th>
                      <th className="text-left px-3 py-2 font-medium">Assign To</th>
                      <th className="text-left px-3 py-2 font-medium">Group</th>
                      <th className="text-left px-3 py-2 font-medium w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((d, i) => {
                      const target = assignTargets[d.name] || "both";
                      const showGroup = target === "both" || target === "profiles";
                      return (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1.5">{d.name || "—"}</td>
                          <td className="px-3 py-1.5">
                            <code className="text-xs bg-muted px-1 rounded">{d.type}</code>
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">{d.description || "—"}</td>
                          <td className="px-3 py-1.5">
                            {d.valid && (
                              <Checkbox
                                checked={worksheetFlags[d.name] || false}
                                onCheckedChange={(checked) =>
                                  setWorksheetFlags(prev => ({ ...prev, [d.name]: !!checked }))
                                }
                                disabled={!canManage}
                                title="Require worksheet/ScriptFlow completion before dispositioning"
                              />
                            )}
                          </td>
                          <td className="px-3 py-1.5">
                            {d.valid && (
                              <Select
                                value={target}
                                onValueChange={(v) =>
                                  setAssignTargets((prev) => ({ ...prev, [d.name]: v as AssignTarget }))
                                }
                                disabled={!canManage}
                              >
                                <SelectTrigger className="h-7 text-xs w-[130px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="both">Both</SelectItem>
                                  <SelectItem value="campaigns">Campaigns Only</SelectItem>
                                  <SelectItem value="profiles">Profiles Only</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="px-3 py-1.5">
                            {d.valid && showGroup && allGroups.length > 0 && (
                              <Select
                                value={effectiveGroupAssignments[d.name] || "__ungrouped__"}
                                onValueChange={(v) =>
                                  setGroupAssignments((prev) => ({
                                    ...prev,
                                    [d.name]: v === "__ungrouped__" ? "" : v,
                                  }))
                                }
                                disabled={!canManage}
                              >
                                <SelectTrigger className="h-7 text-xs w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__ungrouped__">Ungrouped</SelectItem>
                                  {allGroups.map((g) => (
                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disposition Groups Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Disposition Groups (Campaign Profiles)
          </CardTitle>
          <CardDescription>
            Create disposition groups/categories that will be added to selected campaign profiles before assigning dispositions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New group name..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddGroup()}
              disabled={!canManage}
              className="max-w-xs"
            />
            <Button variant="outline" size="sm" onClick={handleAddGroup} disabled={!canManage || !newGroupName.trim()}>
              <Plus className="mr-1 h-4 w-4" /> Add Group
            </Button>
          </div>
          {allGroups.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allGroups.map((g) => (
                <Badge key={g} variant="secondary" className="text-sm">
                  {g}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No groups yet. Add groups manually above or include a 4th pipe field in your input.
            </p>
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
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 font-medium text-sm">
                <ChevronDown className="h-4 w-4" />
                Disposition Creation
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="rounded-md border overflow-auto max-h-48 mt-2">
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
              </CollapsibleContent>
            </Collapsible>

            {/* Assignment Results */}
            {results.assignmentResults.length > 0 && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 font-medium text-sm">
                  <ChevronDown className="h-4 w-4" />
                  Campaign/Profile Assignment
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="rounded-md border overflow-auto max-h-48 mt-2">
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
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
