import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatusBadge } from "@/components/ui/status-badge";
import { Copy, Check, RefreshCw, ExternalLink, ChevronDown, Scale, Plug, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLIO_PROFILES, MYCASE_PROFILES, detectProfile, type Five9ToCrmRules, type CrmProfile } from "@/data/crm-profiles";
import { MultiInput } from "@/components/campaigns/MultiInput";
import { toast } from "sonner";

interface CrmIntegrationWizardProps {
  tenantId?: string;
  configs: Record<string, any>;
  onChange: (configs: Record<string, any>) => void;
}

// Copy helper
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

// Rules toggles sub-component
function RulesToggles({
  rules,
  onRuleChange,
  showTimeEntry,
}: {
  rules: Five9ToCrmRules;
  onRuleChange: (key: keyof Five9ToCrmRules, value: any) => void;
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

      {/* Queue filter */}
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

export function CrmIntegrationWizard({ tenantId, configs, onChange }: CrmIntegrationWizardProps) {
  const [open, setOpen] = useState(
    !!(configs?.clio?.enabled || configs?.mycase?.enabled)
  );
  const [clioProfile, setClioProfile] = useState<string | null>(null);
  const [mycaseProfile, setMycaseProfile] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const webhookUrl = `${supabaseUrl}/functions/v1/five9-main`;

  // Detect current profiles on mount
  useEffect(() => {
    if (configs?.clio?.rules) {
      setClioProfile(detectProfile(configs.clio.rules, CLIO_PROFILES) || "custom");
    }
    if (configs?.mycase?.rules) {
      setMycaseProfile(detectProfile(configs.mycase.rules, MYCASE_PROFILES) || "custom");
    }
  }, []);

  const updateConfigs = useCallback((path: string, value: any) => {
    const updated = { ...configs };
    const keys = path.split(".");
    let current: any = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]] || typeof current[keys[i]] !== "object") {
        current[keys[i]] = {};
      } else {
        current[keys[i]] = { ...current[keys[i]] };
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    onChange(updated);
  }, [configs, onChange]);

  const isCrmEnabled = (crm: string) => !!configs?.[crm]?.enabled;

  const toggleCrm = (crm: string, enabled: boolean) => {
    const existing = configs?.[crm] || {};
    onChange({
      ...configs,
      [crm]: {
        ...existing,
        enabled,
        rules: existing.rules || {
          enabled: true,
          autoCreateContact: false,
          autoCreateMatterOrCase: false,
          autoCreateOnlyForQueues: [],
          attachToLatestOpenOnly: true,
          fallbackToContactOnly: true,
          createTimeEntryForBillable: false,
        },
      },
    });
  };

  const generateSecret = () => {
    const secret = crypto.randomUUID() + "-" + crypto.randomUUID().slice(0, 8);
    updateConfigs("clio.webhookSecret", secret);
    toast.success("Webhook secret generated");
  };

  const applyProfile = (crm: "clio" | "mycase", profileId: string) => {
    const profiles = crm === "clio" ? CLIO_PROFILES : MYCASE_PROFILES;
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;

    const setter = crm === "clio" ? setClioProfile : setMycaseProfile;
    setter(profileId);

    onChange({
      ...configs,
      [crm]: {
        ...(configs?.[crm] || {}),
        enabled: true,
        rules: { ...profile.rules },
      },
    });
  };

  const handleRuleChange = (crm: "clio" | "mycase", key: keyof Five9ToCrmRules, value: any) => {
    const currentRules = configs?.[crm]?.rules || {};
    const updatedRules = { ...currentRules, [key]: value };
    onChange({
      ...configs,
      [crm]: {
        ...(configs?.[crm] || {}),
        rules: updatedRules,
      },
    });

    // Re-detect profile
    const profiles = crm === "clio" ? CLIO_PROFILES : MYCASE_PROFILES;
    const setter = crm === "clio" ? setClioProfile : setMycaseProfile;
    setter(detectProfile(updatedRules, profiles) || "custom");
  };

  const clioConnected = !!configs?.clio?.oauthTokenId;
  const mycaseConnected = !!configs?.mycase?.apiKeyId;
  const webhookSecret = configs?.clio?.webhookSecret || "";

  const handleConnectClio = () => {
    if (!tenantId) {
      toast.error("Save the client first before connecting Clio");
      return;
    }
    toast.info("Clio OAuth requires CLIO_CLIENT_ID and CLIO_CLIENT_SECRET to be configured as backend secrets. Contact your admin to set up the OAuth app.");
  };

  const handleConnectMyCase = () => {
    if (!tenantId) {
      toast.error("Save the client first before connecting MyCase");
      return;
    }
    // For v1, prompt for API key inline
    const apiKey = window.prompt("Paste your MyCase API key:");
    if (apiKey) {
      updateConfigs("mycase.apiKeyId", `mycase_key_${tenantId}`);
      updateConfigs("mycase.authType", "api_key");
      toast.success("MyCase API key saved");
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
        >
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">CRM Integration Wizard</span>
            {(isCrmEnabled("clio") || isCrmEnabled("mycase")) && (
              <Badge variant="secondary" className="text-xs">
                {[isCrmEnabled("clio") && "Clio", isCrmEnabled("mycase") && "MyCase"].filter(Boolean).join(" + ")}
              </Badge>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        {/* Deprecation banner — new setup lives under Client → Legal Connect */}
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 flex items-start gap-3">
          <ExternalLink className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-foreground">
              This setup is moving to <span className="text-primary">Client → Legal Connect</span>
            </p>
            <p className="text-xs text-muted-foreground">
              All new provider connections should be created from the per-client Legal Connect page.
              This wizard is read-only legacy and remains available for migration.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {tenantId && (
                <Button asChild size="sm" variant="default" className="h-7 text-xs">
                  <a href={`/admin/clients/${tenantId}/legal-connect`}>
                    Open Legal Connect →
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  toast.info(
                    "Open Client → Legal Connect to run the per-provider Connect wizard. Existing credentials remain available here as fallback."
                  );
                }}
              >
                Migrate now
              </Button>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Connect Five9 to Clio and/or MyCase in three steps: enable webhooks, connect your CRM, and choose a behavior profile.
        </p>

        {/* Card A: Five9 Webhook Setup */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plug className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Five9 Webhook Setup</CardTitle>
              </div>
              <StatusBadge variant={webhookSecret ? "active" : "inactive"} dot>
                {webhookSecret ? "Configured" : "Not configured"}
              </StatusBadge>
            </div>
            <CardDescription>Configure Five9 Workflow Automation to send call events here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Webhook URL */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Webhook URL</Label>
              <div className="flex items-center gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-xs bg-muted/50" />
                <CopyButton value={webhookUrl} />
              </div>
            </div>

            {/* Tenant ID */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tenant ID (x-tenant-id header)</Label>
              <div className="flex items-center gap-2">
                <Input value={tenantId || "Save client first"} readOnly className="font-mono text-xs bg-muted/50" />
                {tenantId && <CopyButton value={tenantId} />}
              </div>
            </div>

            {/* Webhook Secret */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Webhook Secret (x-webhook-secret header)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={webhookSecret}
                  onChange={(e) => updateConfigs("clio.webhookSecret", e.target.value)}
                  placeholder="Click Generate or paste your own"
                  className="font-mono text-xs"
                />
                {webhookSecret && <CopyButton value={webhookSecret} />}
                <Button type="button" variant="outline" size="sm" onClick={generateSecret} className="shrink-0">
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Generate
                </Button>
              </div>
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Five9 Workflow Automation Setup:</p>
              <p>1. Create an HTTP POST action targeting the webhook URL above</p>
              <p>2. Add header <code className="bg-background px-1 rounded">x-tenant-id</code> with the Tenant ID value</p>
              <p>3. Add header <code className="bg-background px-1 rounded">x-webhook-secret</code> with the secret value</p>
            </div>
          </CardContent>
        </Card>

        {/* Card B: Clio Connection */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Clio Integration</CardTitle>
              </div>
              <StatusBadge variant={clioConnected ? "active" : "inactive"} dot>
                {clioConnected ? "Connected" : "Not connected"}
              </StatusBadge>
            </div>
            <CardDescription>Route Five9 call events to Clio as Communications & Time Entries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">Enable Clio integration</span>
                <p className="text-xs text-muted-foreground">Turn on to process Five9 calls through Clio</p>
              </div>
              <Switch checked={isCrmEnabled("clio")} onCheckedChange={(v) => toggleCrm("clio", v)} />
            </div>

            {!clioConnected && isCrmEnabled("clio") && (
              <Button type="button" variant="outline" onClick={handleConnectClio} className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Clio Account
              </Button>
            )}

            {isCrmEnabled("clio") && (
              <div className="space-y-4 pt-2 border-t border-border">
                {/* Profile selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Behavior Profile</Label>
                  <Select value={clioProfile || "custom"} onValueChange={(v) => v !== "custom" && applyProfile("clio", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIO_PROFILES.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex flex-col">
                            <span>{p.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {clioProfile && clioProfile !== "custom" && (
                    <p className="text-xs text-muted-foreground">
                      {CLIO_PROFILES.find((p) => p.id === clioProfile)?.description}
                    </p>
                  )}
                </div>

                {/* Override toggles */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <button type="button" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ChevronDown className="h-3 w-3" />
                      Advanced overrides
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <RulesToggles
                      rules={configs?.clio?.rules || {}}
                      onRuleChange={(key, value) => handleRuleChange("clio", key, value)}
                      showTimeEntry
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card C: MyCase Connection */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">MyCase Integration</CardTitle>
              </div>
              <StatusBadge variant={mycaseConnected ? "active" : "inactive"} dot>
                {mycaseConnected ? "Connected" : "Not connected"}
              </StatusBadge>
            </div>
            <CardDescription>Route Five9 call events to MyCase as Notes on contacts & cases.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">Enable MyCase integration</span>
                <p className="text-xs text-muted-foreground">Turn on to process Five9 calls through MyCase</p>
              </div>
              <Switch checked={isCrmEnabled("mycase")} onCheckedChange={(v) => toggleCrm("mycase", v)} />
            </div>

            {!mycaseConnected && isCrmEnabled("mycase") && (
              <Button type="button" variant="outline" onClick={handleConnectMyCase} className="w-full">
                <KeyRound className="h-4 w-4 mr-2" />
                Connect MyCase Account
              </Button>
            )}

            {isCrmEnabled("mycase") && (
              <div className="space-y-4 pt-2 border-t border-border">
                {/* Profile selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Behavior Profile</Label>
                  <Select value={mycaseProfile || "custom"} onValueChange={(v) => v !== "custom" && applyProfile("mycase", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {MYCASE_PROFILES.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex flex-col">
                            <span>{p.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {mycaseProfile && mycaseProfile !== "custom" && (
                    <p className="text-xs text-muted-foreground">
                      {MYCASE_PROFILES.find((p) => p.id === mycaseProfile)?.description}
                    </p>
                  )}
                </div>

                {/* Override toggles */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <button type="button" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ChevronDown className="h-3 w-3" />
                      Advanced overrides
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <RulesToggles
                      rules={configs?.mycase?.rules || {}}
                      onRuleChange={(key, value) => handleRuleChange("mycase", key, value)}
                      showTimeEntry={false}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
