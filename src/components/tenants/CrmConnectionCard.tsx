import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatusBadge } from "@/components/ui/status-badge";
import { ExternalLink, ChevronDown, Scale, KeyRound } from "lucide-react";
import { CLIO_PROFILES, MYCASE_PROFILES, detectProfile, type Five9ToCrmRules, type CrmProfile } from "@/data/crm-profiles";
import { MultiInput } from "@/components/campaigns/MultiInput";
import { toast } from "sonner";

function RulesToggles({
  rules,
  onRuleChange,
  showTimeEntry,
}: {
  rules: Five9ToCrmRules;
  onRuleChange: (key: keyof Five9ToCrmRules, value: unknown) => void;
  showTimeEntry: boolean;
}) {
  const toggles = [
    { key: "autoCreateContact" as const, label: "Auto-create new contacts", desc: "Create a new contact if phone number is not found" },
    { key: "autoCreateMatterOrCase" as const, label: showTimeEntry ? "Auto-create matters" : "Auto-create cases", desc: showTimeEntry ? "Create a new matter when none exists" : "Create a new case when none exists" },
    { key: "attachToLatestOpenOnly" as const, label: showTimeEntry ? "Attach to latest open matter" : "Attach to latest open case", desc: "When multiple exist, pick the most recently opened" },
    { key: "fallbackToContactOnly" as const, label: "Fallback to contact-only logging", desc: showTimeEntry ? "Log call on contact if no matter available" : "Log note on contact if no case available" },
    ...(showTimeEntry ? [{ key: "createTimeEntryForBillable" as const, label: "Create billable time entries", desc: "Auto-create Activity/TimeEntry from call duration" }] : []),
  ];

  return (
    <div className="space-y-3">
      {toggles.map((t) => (
        <div key={t.key} className="flex items-start gap-3">
          <Checkbox
            checked={!!rules[t.key]}
            onCheckedChange={(v) => onRuleChange(t.key, !!v)}
            className="mt-0.5"
          />
          <div className="space-y-0.5">
            <span className="text-sm font-medium">{t.label}</span>
            <p className="text-xs text-muted-foreground">{t.desc}</p>
          </div>
        </div>
      ))}
      <div className="space-y-2 pt-2">
        <Label className="text-sm">Queues allowed to auto-create {showTimeEntry ? "matters" : "cases"}</Label>
        <p className="text-xs text-muted-foreground">Leave empty to allow all queues. Add queue names to restrict.</p>
        <MultiInput
          values={rules.autoCreateOnlyForQueues || []}
          onChange={(v) => onRuleChange("autoCreateOnlyForQueues", v)}
          placeholder="e.g. Intake, Family Intake"
        />
      </div>
    </div>
  );
}

interface CrmConnectionCardProps {
  crm: "clio" | "mycase";
  tenantId?: string;
  config: Record<string, unknown> | undefined;
  onConfigChange: (config: Record<string, unknown>) => void;
}

export function CrmConnectionCard({ crm, tenantId, config, onConfigChange }: CrmConnectionCardProps) {
  const isClio = crm === "clio";
  const profiles = isClio ? CLIO_PROFILES : MYCASE_PROFILES;
  const [profile, setProfile] = useState<string | null>(null);

  const enabled = !!config?.enabled;
  const connected = isClio ? !!config?.oauthTokenId : !!config?.apiKeyId;
  const defaultRules: Five9ToCrmRules = {
    enabled: true,
    autoCreateContact: false,
    autoCreateMatterOrCase: false,
    autoCreateOnlyForQueues: [],
    attachToLatestOpenOnly: true,
    fallbackToContactOnly: true,
    createTimeEntryForBillable: false,
  };
  const rules: Five9ToCrmRules = { ...defaultRules, ...((config?.rules as Partial<Five9ToCrmRules>) || {}) };

  useEffect(() => {
    if (config?.rules) {
      setProfile(detectProfile(config.rules as Five9ToCrmRules, profiles) || "custom");
    }
  }, []);

  const toggleEnabled = (v: boolean) => {
    onConfigChange({
      ...(config || {}),
      enabled: v,
      rules: config?.rules || {
        enabled: true,
        autoCreateContact: false,
        autoCreateMatterOrCase: false,
        autoCreateOnlyForQueues: [],
        attachToLatestOpenOnly: true,
        fallbackToContactOnly: true,
        createTimeEntryForBillable: false,
      },
    });
  };

  const applyProfile = (profileId: string) => {
    const p = profiles.find((pr) => pr.id === profileId);
    if (!p) return;
    setProfile(profileId);
    onConfigChange({ ...(config || {}), enabled: true, rules: { ...p.rules } });
  };

  const handleRuleChange = (key: keyof Five9ToCrmRules, value: unknown) => {
    const updated = { ...rules, [key]: value };
    onConfigChange({ ...(config || {}), rules: updated });
    setProfile(detectProfile(updated, profiles) || "custom");
  };

  const handleConnect = () => {
    if (!tenantId) {
      toast.error(`Save the client first before connecting ${isClio ? "Clio" : "MyCase"}`);
      return;
    }
    if (isClio) {
      toast.info("Clio OAuth requires CLIO_CLIENT_ID and CLIO_CLIENT_SECRET to be configured as backend secrets.");
    } else {
      const apiKey = window.prompt("Paste your MyCase API key:");
      if (apiKey) {
        onConfigChange({ ...(config || {}), apiKeyId: `mycase_key_${tenantId}`, authType: "api_key" });
        toast.success("MyCase API key saved");
      }
    }
  };

  const Icon = isClio ? Scale : KeyRound;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{isClio ? "Clio" : "MyCase"} Integration</CardTitle>
          </div>
          <StatusBadge variant={connected ? "active" : "inactive"} dot>
            {connected ? "Connected" : "Not connected"}
          </StatusBadge>
        </div>
        <CardDescription>
          Route Five9 call events to {isClio ? "Clio as Communications & Time Entries" : "MyCase as Notes on contacts & cases"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-sm font-medium">Enable {isClio ? "Clio" : "MyCase"} integration</span>
            <p className="text-xs text-muted-foreground">Turn on to process Five9 calls through {isClio ? "Clio" : "MyCase"}</p>
          </div>
          <Switch checked={enabled} onCheckedChange={toggleEnabled} />
        </div>

        {!connected && enabled && (
          <Button type="button" variant="outline" onClick={handleConnect} className="w-full">
            {isClio ? <ExternalLink className="h-4 w-4 mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
            Connect {isClio ? "Clio" : "MyCase"} Account
          </Button>
        )}

        {enabled && (
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Behavior Profile</Label>
              <Select value={profile || "custom"} onValueChange={(v) => v !== "custom" && applyProfile(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a profile" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span>{p.label}</span>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {profile && profile !== "custom" && (
                <p className="text-xs text-muted-foreground">
                  {profiles.find((p) => p.id === profile)?.description}
                </p>
              )}
            </div>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <button type="button" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <ChevronDown className="h-3 w-3" />
                  Advanced overrides
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <RulesToggles
                  rules={rules}
                  onRuleChange={handleRuleChange}
                  showTimeEntry={isClio}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
