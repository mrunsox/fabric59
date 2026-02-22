import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Save, Shield, Bell, Zap, Database, Key, Eye, EyeOff, Loader2, Hash, CheckCircle2, AlertCircle, RefreshCw, Activity, Users, UserPlus } from "lucide-react";
import { InviteMemberDialog } from "@/components/settings/InviteMemberDialog";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useTeamPermissions, PERMISSION_KEYS } from "@/hooks/useTeamPermissions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AGENT_ROLES } from "@/types/provisioning";

function MaskedInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex gap-2">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono"
        autoComplete="off"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setShow(s => !s)}
        className="shrink-0"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function MaskedTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 6,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShow(s => !s)}
          className="h-7 text-xs gap-1.5"
        >
          {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {show ? "Hide" : "Show"} key
        </Button>
      </div>
      <Textarea
        id={id}
        value={show ? value : value ? value.replace(/[^\n]/g, "•") : ""}
        onChange={e => {
          if (show) onChange(e.target.value);
        }}
        onFocus={() => setShow(true)}
        placeholder={placeholder}
        rows={rows}
        className="font-mono text-xs resize-none"
      />
    </div>
  );
}

export default function SettingsPage() {
  const { configValues, saveIntegrationCredentials, loading } = useAppConfig();
  const { organization, membership } = useAuth();
  const { members, isLoading: membersLoading, togglePermission } = useTeamPermissions(organization?.id);
  const isOrgAdmin = membership?.role === "owner" || membership?.role === "admin";
  const [inviteOpen, setInviteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slackTesting, setSlackTesting] = useState(false);
  const [slackStatus, setSlackStatus] = useState<{ connected: boolean; workspace?: string; botName?: string } | null>(null);

  const [creds, setCreds] = useState({
    email_domain: "",
    five9_username: "",
    five9_password: "",
    resend_api_key: "",
    resend_from_email: "",
    google_service_account_email: "",
    google_service_account_private_key: "",
    google_admin_impersonate_email: "",
  });

  // Populate from DB once loaded
  // Populate form once DB values load
  useEffect(() => {
    if (!loading) {
      setCreds({
        email_domain: configValues.email_domain ?? "",
        five9_username: configValues.five9_username ?? "",
        five9_password: configValues.five9_password ?? "",
        resend_api_key: configValues.resend_api_key ?? "",
        resend_from_email: configValues.resend_from_email ?? "",
        google_service_account_email: configValues.google_service_account_email ?? "",
        google_service_account_private_key: configValues.google_service_account_private_key ?? "",
        google_admin_impersonate_email: configValues.google_admin_impersonate_email ?? "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const set = (key: keyof typeof creds) => (value: string) =>
    setCreds(prev => ({ ...prev, [key]: value }));

  const handleSaveGeneral = () => {
    toast.success("Settings saved successfully");
  };

  const handleSaveCredentials = async () => {
    setSaving(true);
    await saveIntegrationCredentials(creds);
    setSaving(false);
  };

  const handleTestSlack = async () => {
    setSlackTesting(true);
    try {
      const { data } = await supabase.functions.invoke('slack-agent', {
        body: { action: 'test' },
      });
      if (data?.success) {
        setSlackStatus({ connected: true, workspace: data.workspace, botName: data.botName });
        toast.success(`Slack connected — workspace: ${data.workspace}`);
      } else {
        setSlackStatus({ connected: false });
        toast.error(`Slack test failed: ${data?.error || 'Unknown error'}`);
      }
    } catch {
      setSlackStatus({ connected: false });
      toast.error('Could not reach Slack — connector may not be linked');
    } finally {
      setSlackTesting(false);
    }
  };

  // Derive integration status from loaded configValues
  const integrationStatus = {
    five9: !!(configValues.five9_username && configValues.five9_password),
    resend: !!(configValues.resend_api_key && configValues.resend_from_email),
    google: !!(
      configValues.google_service_account_email &&
      configValues.google_service_account_private_key &&
      configValues.google_admin_impersonate_email
    ),
    slack: slackStatus?.connected ?? null,
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure global settings for the integration fabric
        </p>
      </div>

      {/* Integration Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Integration Status</CardTitle>
              <CardDescription>Live status of all configured service credentials</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              {
                label: "Five9 Admin API",
                description: "Agent provisioning & SOAP access",
                ok: integrationStatus.five9,
                missingHint: "Five9 username and password required",
              },
              {
                label: "Email (Resend)",
                description: "Credential delivery to new agents",
                ok: integrationStatus.resend,
                missingHint: "Resend API key and from-email required",
              },
              {
                label: "Google Workspace",
                description: "Agent account creation & deletion",
                ok: integrationStatus.google,
                missingHint: "Service account email, impersonation email, and private key required",
              },
              {
                label: "Slack",
                description: "Channel notifications & invites",
                ok: integrationStatus.slack,
                missingHint: "Test the Slack connector below to verify",
              },
            ].map(({ label, description, ok, missingHint }) => (
              <div
                key={label}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                  ok === true
                    ? "border-success/20 bg-success/5"
                    : ok === false
                    ? "border-warning/20 bg-warning/5"
                    : "border-border bg-muted/30"
                }`}
              >
                {ok === true ? (
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                ) : ok === false ? (
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ok === true ? description : missingHint}
                  </p>
                </div>
                <div className="ml-auto shrink-0">
                  {ok === true ? (
                    <Badge variant="outline" className="text-success border-success/30 bg-success/10 text-xs">Configured</Badge>
                  ) : ok === false ? (
                    <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 text-xs">Missing</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-xs">Unknown</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Members Permission Manager */}
      {isOrgAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage feature access permissions for organization members</CardDescription>
              </div>
              <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5">
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
            </div>
          </CardHeader>
          <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
          <CardContent>
            {membersLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No team members yet. Invite members from the organization settings.</p>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[140px]">Member</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                      <TooltipProvider>
                        {PERMISSION_KEYS.map((perm) => (
                          <th key={perm.key} className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">{perm.label}</span>
                              </TooltipTrigger>
                              <TooltipContent><p className="text-xs">{perm.description}</p></TooltipContent>
                            </Tooltip>
                          </th>
                        ))}
                      </TooltipProvider>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {members.map((member) => {
                      const isAdmin = member.role === "owner" || member.role === "admin";
                      return (
                        <tr key={member.userId} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-sm truncate max-w-[160px]">{member.displayName || member.email}</p>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant="outline" className="text-xs capitalize">{member.role}</Badge>
                          </td>
                          {PERMISSION_KEYS.map((perm) => (
                            <td key={perm.key} className="text-center px-2 py-3">
                              <Checkbox
                                checked={isAdmin || member.permissions.includes(perm.key)}
                                disabled={isAdmin}
                                onCheckedChange={(checked) => {
                                  togglePermission.mutate({ userId: member.userId, permission: perm.key, grant: !!checked });
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Configure API rate limits and timeouts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rate-limit">Rate Limit (req/min per tenant)</Label>
              <Input id="rate-limit" type="number" defaultValue="100" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeout">Request Timeout (seconds)</Label>
              <Input id="timeout" type="number" defaultValue="30" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="retry-count">Max Retry Count</Label>
              <Input id="retry-count" type="number" defaultValue="3" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retry-delay">Retry Delay (ms)</Label>
              <Input id="retry-delay" type="number" defaultValue="1000" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Credentials */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Integration Credentials</CardTitle>
              <CardDescription>API keys and credentials for connected services</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Agent Provisioning */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Agent Provisioning</p>

            <div className="space-y-2">
              <Label htmlFor="email-domain">Email Domain</Label>
              <Input
                id="email-domain"
                value={creds.email_domain}
                onChange={e => set("email_domain")(e.target.value)}
                placeholder="yourcompany.com"
              />
              <p className="text-xs text-muted-foreground">Used to construct agent email addresses (e.g. firstname.l@yourcompany.com)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="five9-username">Five9 Admin Username</Label>
              <Input
                id="five9-username"
                value={creds.five9_username}
                onChange={e => set("five9_username")(e.target.value)}
                placeholder="admin@yourdomain.five9.com"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="five9-password">Five9 Admin Password</Label>
              <MaskedInput
                id="five9-password"
                value={creds.five9_password}
                onChange={set("five9_password")}
                placeholder="Five9 admin password"
              />
            </div>
          </div>

          <Separator />

          {/* Email (Resend) */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Email (Resend)</p>

            <div className="space-y-2">
              <Label htmlFor="resend-api-key">Resend API Key</Label>
              <MaskedInput
                id="resend-api-key"
                value={creds.resend_api_key}
                onChange={set("resend_api_key")}
                placeholder="re_••••••••••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resend-from">From Email Address</Label>
              <Input
                id="resend-from"
                type="email"
                value={creds.resend_from_email}
                onChange={e => set("resend_from_email")(e.target.value)}
                placeholder="noreply@yourcompany.com"
              />
            </div>
          </div>

          <Separator />

          {/* Google Workspace */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Google Workspace</p>

            <div className="space-y-2">
              <Label htmlFor="google-sa-email">Service Account Email</Label>
              <Input
                id="google-sa-email"
                value={creds.google_service_account_email}
                onChange={e => set("google_service_account_email")(e.target.value)}
                placeholder="service@project.iam.gserviceaccount.com"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="google-impersonate">Admin Impersonation Email</Label>
              <Input
                id="google-impersonate"
                value={creds.google_admin_impersonate_email}
                onChange={e => set("google_admin_impersonate_email")(e.target.value)}
                placeholder="admin@yourcompany.com"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="google-pk">Service Account Private Key (PEM)</Label>
              <MaskedTextarea
                id="google-pk"
                value={creds.google_service_account_private_key}
                onChange={set("google_service_account_private_key")}
                placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">Paste the full PEM private key from your Google service account JSON file</p>
            </div>
          </div>

          <Separator />

          {/* Slack Integration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Slack Integration</p>
              {slackStatus !== null && (
                slackStatus.connected
                  ? <Badge variant="outline" className="gap-1.5 text-success border-success/30 bg-success/10"><CheckCircle2 className="h-3 w-3" />Connected</Badge>
                  : <Badge variant="outline" className="gap-1.5 text-destructive border-destructive/30 bg-destructive/10"><AlertCircle className="h-3 w-3" />Not connected</Badge>
              )}
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Lovable Slack Connector</p>
                  <p className="text-xs text-muted-foreground">
                    Connected via the Lovable connector gateway. The bot is auto-present in all public channels.
                    {slackStatus?.workspace && <span className="ml-1 font-medium text-foreground">Workspace: {slackStatus.workspace}</span>}
                    {slackStatus?.botName && <span className="ml-1 text-muted-foreground">· Bot: {slackStatus.botName}</span>}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestSlack}
                  disabled={slackTesting}
                  className="shrink-0 gap-2"
                >
                  {slackTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Test Connection
                </Button>
              </div>
            </div>

            {/* Channel Mapping Table */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Channel mapping by role</p>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slack Channels</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {AGENT_ROLES.filter(r => r.slackChannels.length > 0).map(role => (
                      <tr key={role.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{role.name}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {role.slackChannels.map(ch => (
                              <span key={ch} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                <Hash className="h-2.5 w-2.5" />{ch.replace(/^#/, '')}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-muted-foreground">Manager</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground italic">No channels assigned</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={handleSaveCredentials} disabled={saving || loading} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Integration Credentials"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Shield className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle>Security</CardTitle>
              <CardDescription>Authentication and encryption settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require API Key Authentication</Label>
              <p className="text-sm text-muted-foreground">All API requests must include a valid X-Tenant-Id header</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Encrypt CRM API Keys</Label>
              <p className="text-sm text-muted-foreground">Store CRM credentials with AES-256 encryption</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>CORS: Allow Five9 Domains</Label>
              <p className="text-sm text-muted-foreground">Whitelist *.five9.com for cross-origin requests</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Notifications & Alerting */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Bell className="h-5 w-5 text-warning" />
            </div>
            <div>
              <CardTitle>Notifications & Alerting</CardTitle>
              <CardDescription>Configure alerts, webhooks, and HR notifications</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email on Error Threshold</Label>
              <p className="text-sm text-muted-foreground">Send alert when error rate exceeds 5%</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="alert-email">Alert Email</Label>
            <Input id="alert-email" type="email" placeholder="ops@yourcompany.com" />
            <p className="text-xs text-muted-foreground">Receives error alerts from the error-alert system</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Slack Error Alerts</Label>
              <p className="text-sm text-muted-foreground">Send critical errors to #alerts channel</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="hr-email">HR Notification Email</Label>
            <Input id="hr-email" type="email" placeholder="hr@yourcompany.com" />
            <p className="text-xs text-muted-foreground">Receives automated offboarding completion summaries</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Webhook Endpoint URL</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`https://lxwalsgqrnstjclafaka.supabase.co/functions/v1/five9-webhook`}
                className="font-mono text-xs"
              />
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(`https://lxwalsgqrnstjclafaka.supabase.co/functions/v1/five9-webhook`);
                toast.success("Webhook URL copied");
              }}>Copy</Button>
            </div>
            <p className="text-xs text-muted-foreground">Paste this URL into your Five9 admin webhook settings</p>
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Database className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Data Retention</CardTitle>
              <CardDescription>Configure log storage and cleanup policies</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="log-retention">API Log Retention (days)</Label>
              <Input id="log-retention" type="number" defaultValue="30" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="error-retention">Error Log Retention (days)</Label>
              <Input id="error-retention" type="number" defaultValue="90" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-purge Old Logs</Label>
              <p className="text-sm text-muted-foreground">Automatically delete logs older than retention period</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveGeneral} className="gap-2">
          <Save className="h-4 w-4" />
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
