import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateTenant, useUpdateTenant } from "@/hooks/useTenants";
import type { Tenant, TenantFormData, CrmType, TenantStatus, NotificationTriggers } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, ChevronDown, Bell, Zap, Workflow, Phone, Video, Calendar, MessageCircle, CreditCard, FileText, Brain, Building2, Key, Globe, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_NOTIFICATION_TRIGGERS: NotificationTriggers = {
  intake_created: false,
  call_ended: false,
  contact_updated: false,
};

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  organization_id: z.string().optional(),
  crm_type: z.enum(["clio", "workiz", "salesforce", "hubspot", "zendesk", "generic_rest", "other"]),
  crm_api_url: z.string().url().optional().or(z.literal("")),
  crm_api_key: z.string().optional(),
  webhook_url: z.string().url().optional().or(z.literal("")),
  slack_webhook_url: z.string().url().optional().or(z.literal("")),
  zapier_webhook_url: z.string().url().optional().or(z.literal("")),
  make_webhook_url: z.string().url().optional().or(z.literal("")),
  pabbly_webhook_url: z.string().url().optional().or(z.literal("")),
  n8n_webhook_url: z.string().url().optional().or(z.literal("")),
  teams_webhook_url: z.string().url().optional().or(z.literal("")),
  twilio_account_sid: z.string().optional().or(z.literal("")),
  twilio_auth_token: z.string().optional().or(z.literal("")),
  twilio_from_number: z.string().optional().or(z.literal("")),
  zoom_api_key: z.string().optional().or(z.literal("")),
  google_calendar_id: z.string().optional().or(z.literal("")),
  stripe_api_key: z.string().optional().or(z.literal("")),
  quickbooks_api_key: z.string().optional().or(z.literal("")),
  calendly_api_key: z.string().optional().or(z.literal("")),
  docusign_api_key: z.string().optional().or(z.literal("")),
  dropbox_api_key: z.string().optional().or(z.literal("")),
  microsoft365_api_key: z.string().optional().or(z.literal("")),
  asana_api_key: z.string().optional().or(z.literal("")),
  openai_api_key: z.string().optional().or(z.literal("")),
  power_automate_webhook_url: z.string().url().optional().or(z.literal("")),
  integration_configs: z.record(z.string()).optional(),
  notification_triggers: z.object({
    intake_created: z.boolean(),
    call_ended: z.boolean(),
    contact_updated: z.boolean(),
  }),
  status: z.enum(["active", "inactive", "pending"]),
});

interface TenantFormProps {
  tenant?: Tenant;
  onSuccess?: () => void;
}

// Platform configuration for the automation section
const AUTOMATION_PLATFORMS = [
  {
    key: "zapier_webhook_url" as const,
    name: "Zapier",
    placeholder: "https://hooks.zapier.com/hooks/catch/...",
    description: "Create a Zap with 'Webhooks by Zapier' as the trigger.",
    color: "text-orange-500",
  },
  {
    key: "make_webhook_url" as const,
    name: "Make",
    placeholder: "https://hook.make.com/...",
    description: "Create a scenario with 'Webhooks' module.",
    color: "text-purple-500",
  },
  {
    key: "pabbly_webhook_url" as const,
    name: "Pabbly Connect",
    placeholder: "https://connect.pabbly.com/workflow/...",
    description: "Create a workflow with 'Webhook' trigger.",
    color: "text-blue-500",
  },
  {
    key: "n8n_webhook_url" as const,
    name: "n8n",
    placeholder: "https://your-n8n.app/webhook/...",
    description: "Add a Webhook node to your workflow.",
    color: "text-green-500",
  },
  {
    key: "power_automate_webhook_url" as const,
    name: "Power Automate",
    placeholder: "https://prod-xx.westus.logic.azure.com/workflows/...",
    description: "Create a flow with 'When a HTTP request is received' trigger.",
    color: "text-blue-600",
  },
] as const;

export function TenantForm({ tenant, onSuccess }: TenantFormProps) {
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const [notificationsOpen, setNotificationsOpen] = useState(
    !!(tenant?.slack_webhook_url || (tenant as any)?.teams_webhook_url)
  );
  const [automationsOpen, setAutomationsOpen] = useState(
    !!(tenant?.zapier_webhook_url || tenant?.make_webhook_url || tenant?.pabbly_webhook_url || tenant?.n8n_webhook_url)
  );
  const [communicationOpen, setCommunicationOpen] = useState(
    !!((tenant as any)?.twilio_account_sid)
  );
  const [schedulingOpen, setSchedulingOpen] = useState(
    !!((tenant as any)?.zoom_api_key || (tenant as any)?.google_calendar_id || (tenant as any)?.calendly_api_key || (tenant as any)?.microsoft365_api_key || (tenant as any)?.asana_api_key)
  );
  const [billingOpen, setBillingOpen] = useState(
    !!((tenant as any)?.stripe_api_key || (tenant as any)?.quickbooks_api_key)
  );
  const [documentsOpen, setDocumentsOpen] = useState(
    !!((tenant as any)?.docusign_api_key || (tenant as any)?.dropbox_api_key)
  );
  const [aiOpen, setAiOpen] = useState(
    !!((tenant as any)?.openai_api_key)
  );
  const [additionalCrmsOpen, setAdditionalCrmsOpen] = useState(false);
  const [additionalCommsOpen, setAdditionalCommsOpen] = useState(false);
  const [additionalSchedulingOpen, setAdditionalSchedulingOpen] = useState(false);
  const [additionalDocsOpen, setAdditionalDocsOpen] = useState(false);
  const [legalBillingOpen, setLegalBillingOpen] = useState(false);
  const [legalAiOpen, setLegalAiOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);

  // Load organizations (white-label partners) for the dropdown
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations-for-form"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const form = useForm<TenantFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tenant?.name || "",
      organization_id: tenant?.organization_id || "",
      crm_type: tenant?.crm_type || "other",
      crm_api_url: tenant?.crm_api_url || "",
      crm_api_key: tenant?.crm_api_key || "",
      webhook_url: tenant?.webhook_url || "",
      slack_webhook_url: tenant?.slack_webhook_url || "",
      zapier_webhook_url: tenant?.zapier_webhook_url || "",
      make_webhook_url: tenant?.make_webhook_url || "",
      pabbly_webhook_url: tenant?.pabbly_webhook_url || "",
      n8n_webhook_url: tenant?.n8n_webhook_url || "",
      teams_webhook_url: (tenant as any)?.teams_webhook_url || "",
      twilio_account_sid: (tenant as any)?.twilio_account_sid || "",
      twilio_auth_token: (tenant as any)?.twilio_auth_token || "",
      twilio_from_number: (tenant as any)?.twilio_from_number || "",
      zoom_api_key: (tenant as any)?.zoom_api_key || "",
      google_calendar_id: (tenant as any)?.google_calendar_id || "",
      stripe_api_key: (tenant as any)?.stripe_api_key || "",
      quickbooks_api_key: (tenant as any)?.quickbooks_api_key || "",
      calendly_api_key: (tenant as any)?.calendly_api_key || "",
      docusign_api_key: (tenant as any)?.docusign_api_key || "",
      dropbox_api_key: (tenant as any)?.dropbox_api_key || "",
      microsoft365_api_key: (tenant as any)?.microsoft365_api_key || "",
      asana_api_key: (tenant as any)?.asana_api_key || "",
      openai_api_key: (tenant as any)?.openai_api_key || "",
      power_automate_webhook_url: (tenant as any)?.power_automate_webhook_url || "",
      integration_configs: (tenant as any)?.integration_configs || {},
      notification_triggers: tenant?.notification_triggers || DEFAULT_NOTIFICATION_TRIGGERS,
      status: tenant?.status || "pending",
    },
  });

  const isSubmitting = createTenant.isPending || updateTenant.isPending;
  const slackWebhookUrl = form.watch("slack_webhook_url");
  const hasSlackConfigured = !!slackWebhookUrl;

  // Check if any automation platform is configured
  const hasAutomationsConfigured = AUTOMATION_PLATFORMS.some(
    (platform) => !!form.watch(platform.key)
  );

  const onSubmit = async (data: TenantFormData) => {
    // If no Slack webhook, reset triggers to false
    const finalData = {
      ...data,
      organization_id: data.organization_id || undefined,
      notification_triggers: data.slack_webhook_url
        ? data.notification_triggers
        : DEFAULT_NOTIFICATION_TRIGGERS,
    };

    if (tenant) {
      await updateTenant.mutateAsync({ id: tenant.id, data: finalData });
    } else {
      await createTenant.mutateAsync(finalData);
    }
    onSuccess?.();
  };

  const handleTriggerChange = (key: keyof NotificationTriggers, value: boolean) => {
    const current = form.getValues("notification_triggers");
    form.setValue("notification_triggers", { ...current, [key]: value });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Client Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Smith & Associates Law"
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      {/* White-Label Partner dropdown */}
      <div className="space-y-2">
        <Label htmlFor="organization_id">White-Label Partner</Label>
        <Select
          value={form.watch("organization_id") || "none"}
          onValueChange={(val) => form.setValue("organization_id", val === "none" ? "" : val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a partner..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— No partner (direct client) —</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Which white-label partner does this client belong to?
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="crm_type">CRM Type *</Label>
          <Select
            value={form.watch("crm_type")}
            onValueChange={(value: CrmType) => form.setValue("crm_type", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clio">Clio</SelectItem>
              <SelectItem value="workiz">Workiz</SelectItem>
              <SelectItem value="salesforce">Salesforce</SelectItem>
              <SelectItem value="hubspot">HubSpot</SelectItem>
              <SelectItem value="zendesk">Zendesk</SelectItem>
              <SelectItem value="generic_rest">Generic REST</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select
            value={form.watch("status")}
            onValueChange={(value: TenantStatus) => form.setValue("status", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="crm_api_url">CRM API URL</Label>
        <Input
          id="crm_api_url"
          placeholder="https://app.clio.com/api/v4"
          {...form.register("crm_api_url")}
        />
        {form.formState.errors.crm_api_url && (
          <p className="text-sm text-destructive">
            {form.formState.errors.crm_api_url.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="crm_api_key">CRM API Key</Label>
        <Input
          id="crm_api_key"
          type="password"
          placeholder="••••••••••••••••"
          {...form.register("crm_api_key")}
        />
        <p className="text-xs text-muted-foreground">
          API key will be encrypted at rest
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="webhook_url">Webhook URL (Optional)</Label>
        <Input
          id="webhook_url"
          placeholder="https://your-service.com/webhook"
          {...form.register("webhook_url")}
        />
      </div>

      {/* Notifications Section */}
      <Collapsible
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        className="rounded-lg border border-border"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Notifications</span>
              {(hasSlackConfigured || !!form.watch("teams_webhook_url")) && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Configured
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                notificationsOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slack_webhook_url">Slack Webhook URL</Label>
            <Input
              id="slack_webhook_url"
              placeholder="https://hooks.slack.com/services/..."
              {...form.register("slack_webhook_url")}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty if this client doesn't use Slack notifications
            </p>
            {form.formState.errors.slack_webhook_url && (
              <p className="text-sm text-destructive">
                {form.formState.errors.slack_webhook_url.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="teams_webhook_url">Microsoft Teams Webhook URL</Label>
            <Input
              id="teams_webhook_url"
              placeholder="https://outlook.office.com/webhook/..."
              {...form.register("teams_webhook_url")}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty if this client doesn't use Teams notifications
            </p>
          </div>

          {hasSlackConfigured && (
            <div className="space-y-3 pt-2">
              <Label className="text-sm">Notification Triggers</Label>
              <div className="space-y-3 rounded-md border border-border p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium">New intake created</span>
                    <p className="text-xs text-muted-foreground">
                      Notify when a new intake is processed
                    </p>
                  </div>
                  <Switch
                    checked={form.watch("notification_triggers.intake_created")}
                    onCheckedChange={(checked) =>
                      handleTriggerChange("intake_created", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium">Call ended</span>
                    <p className="text-xs text-muted-foreground">
                      Notify when a Five9 call completes
                    </p>
                  </div>
                  <Switch
                    checked={form.watch("notification_triggers.call_ended")}
                    onCheckedChange={(checked) =>
                      handleTriggerChange("call_ended", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium">Contact updated</span>
                    <p className="text-xs text-muted-foreground">
                      Notify when contact info is modified
                    </p>
                  </div>
                  <Switch
                    checked={form.watch("notification_triggers.contact_updated")}
                    onCheckedChange={(checked) =>
                      handleTriggerChange("contact_updated", checked)
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Workflow Automations Section */}
      <Collapsible
        open={automationsOpen}
        onOpenChange={setAutomationsOpen}
        className="rounded-lg border border-border"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Workflow Automations</span>
              {hasAutomationsConfigured && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {AUTOMATION_PLATFORMS.filter((p) => !!form.watch(p.key)).length} Active
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                automationsOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect to workflow automation platforms to trigger actions when events occur.
            All configured platforms will receive the same event data.
          </p>

          <div className="space-y-4">
            {AUTOMATION_PLATFORMS.map((platform) => (
              <div key={platform.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className={cn("h-4 w-4", platform.color)} />
                  <Label htmlFor={platform.key} className="font-medium">
                    {platform.name}
                  </Label>
                  {form.watch(platform.key) && (
                    <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                      Connected
                    </span>
                  )}
                </div>
                <Input
                  id={platform.key}
                  placeholder={platform.placeholder}
                  {...form.register(platform.key)}
                />
                <p className="text-xs text-muted-foreground">
                  {platform.description}
                </p>
                {form.formState.errors[platform.key] && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors[platform.key]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-md bg-muted/50 p-3 mt-4">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Automations are triggered by the same events as Slack notifications 
              (intake created, call ended, contact updated). Make sure to enable the appropriate triggers 
              in the Slack Notifications section above, or the webhook URL if Slack isn't configured.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Communication Section */}
      <Collapsible
        open={communicationOpen}
        onOpenChange={setCommunicationOpen}
        className="rounded-lg border border-border"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Communication (Twilio SMS)</span>
              {!!form.watch("twilio_account_sid") && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Configured
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                communicationOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure Twilio to send SMS confirmations and follow-up texts after calls.
          </p>
          <div className="space-y-2">
            <Label htmlFor="twilio_account_sid">Twilio Account SID</Label>
            <Input id="twilio_account_sid" placeholder="AC..." {...form.register("twilio_account_sid")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twilio_auth_token">Twilio Auth Token</Label>
            <Input id="twilio_auth_token" type="password" placeholder="••••••••" {...form.register("twilio_auth_token")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twilio_from_number">Twilio From Number</Label>
            <Input id="twilio_from_number" placeholder="+1234567890" {...form.register("twilio_from_number")} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Scheduling Section */}
      <Collapsible
        open={schedulingOpen}
        onOpenChange={setSchedulingOpen}
        className="rounded-lg border border-border"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Scheduling (Zoom & Google Calendar)</span>
              {(!!form.watch("zoom_api_key") || !!form.watch("google_calendar_id")) && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Configured
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                schedulingOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure Zoom and Google Calendar for meeting scheduling and appointment booking.
          </p>
          <div className="space-y-2">
            <Label htmlFor="zoom_api_key">Zoom API Key</Label>
            <Input id="zoom_api_key" type="password" placeholder="••••••••" {...form.register("zoom_api_key")} />
            <p className="text-xs text-muted-foreground">Server-to-server OAuth or JWT app key from Zoom Marketplace</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="google_calendar_id">Google Calendar ID</Label>
            <Input id="google_calendar_id" placeholder="primary or calendar-id@group.calendar.google.com" {...form.register("google_calendar_id")} />
            <p className="text-xs text-muted-foreground">Calendar ID to create events on (use "primary" for default calendar)</p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Billing Section */}
      <Collapsible
        open={billingOpen}
        onOpenChange={setBillingOpen}
        className="rounded-lg border border-border"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Billing & Payments</span>
              {(!!form.watch("stripe_api_key") || !!form.watch("quickbooks_api_key")) && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Configured
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                billingOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure payment processing and invoicing integrations.
          </p>
          <div className="space-y-2">
            <Label htmlFor="stripe_api_key">Stripe API Key</Label>
            <Input id="stripe_api_key" type="password" placeholder="sk_live_..." {...form.register("stripe_api_key")} />
            <p className="text-xs text-muted-foreground">Secret key from Stripe Dashboard → Developers → API keys</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quickbooks_api_key">QuickBooks API Key</Label>
            <Input id="quickbooks_api_key" type="password" placeholder="••••••••" {...form.register("quickbooks_api_key")} />
            <p className="text-xs text-muted-foreground">OAuth client credentials from Intuit Developer portal</p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Documents & E-Signature Section */}
      <Collapsible
        open={documentsOpen}
        onOpenChange={setDocumentsOpen}
        className="rounded-lg border border-border"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Documents & E-Signature</span>
              {(!!form.watch("docusign_api_key") || !!form.watch("dropbox_api_key")) && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Configured
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                documentsOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure document storage and e-signature integrations.
          </p>
          <div className="space-y-2">
            <Label htmlFor="docusign_api_key">DocuSign API Key</Label>
            <Input id="docusign_api_key" type="password" placeholder="••••••••" {...form.register("docusign_api_key")} />
            <p className="text-xs text-muted-foreground">Integration key from DocuSign Admin → API and Keys</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dropbox_api_key">Dropbox API Key</Label>
            <Input id="dropbox_api_key" type="password" placeholder="••••••••" {...form.register("dropbox_api_key")} />
            <p className="text-xs text-muted-foreground">App key from Dropbox App Console</p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* AI & Productivity Section */}
      <Collapsible
        open={aiOpen}
        onOpenChange={setAiOpen}
        className="rounded-lg border border-border"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">AI & Productivity</span>
              {(!!form.watch("openai_api_key") || !!form.watch("asana_api_key") || !!form.watch("calendly_api_key") || !!form.watch("microsoft365_api_key")) && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Configured
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                aiOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure AI assistance and productivity tool integrations.
          </p>
          <div className="space-y-2">
            <Label htmlFor="openai_api_key">OpenAI API Key</Label>
            <Input id="openai_api_key" type="password" placeholder="sk-..." {...form.register("openai_api_key")} />
            <p className="text-xs text-muted-foreground">API key from OpenAI Platform → API keys</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="asana_api_key">Asana API Key</Label>
            <Input id="asana_api_key" type="password" placeholder="••••••••" {...form.register("asana_api_key")} />
            <p className="text-xs text-muted-foreground">Personal access token from Asana Developer Console</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="calendly_api_key">Calendly API Key</Label>
            <Input id="calendly_api_key" type="password" placeholder="••••••••" {...form.register("calendly_api_key")} />
            <p className="text-xs text-muted-foreground">Personal access token from Calendly Integrations page</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="microsoft365_api_key">Microsoft 365 API Key</Label>
            <Input id="microsoft365_api_key" type="password" placeholder="••••••••" {...form.register("microsoft365_api_key")} />
            <p className="text-xs text-muted-foreground">App registration client secret from Azure AD portal</p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Additional CRMs Section */}
      <Collapsible open={additionalCrmsOpen} onOpenChange={setAdditionalCrmsOpen} className="rounded-lg border border-border">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Additional CRMs</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", additionalCrmsOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          <p className="text-sm text-muted-foreground">API keys for additional CRM and practice management platforms.</p>
          {[
            { key: "jobber_api_key", label: "Jobber API Key" },
            { key: "housecall_pro_api_key", label: "Housecall Pro API Key" },
            { key: "smokeball_api_key", label: "Smokeball API Key" },
            { key: "mycase_api_key", label: "MyCase API Key" },
            { key: "practicepanther_api_key", label: "PracticePanther API Key" },
            { key: "filevine_api_key", label: "Filevine API Key" },
            { key: "cosmolex_api_key", label: "CosmoLex API Key" },
            { key: "zoho_crm_api_key", label: "Zoho CRM API Key" },
            { key: "dynamics365_api_key", label: "Dynamics 365 API Key" },
            { key: "quoteiq_api_key", label: "QuoteIQ API Key" },
            { key: "fieldpulse_api_key", label: "FieldPulse API Key" },
            { key: "zenmaid_api_key", label: "ZenMaid API Key" },
            { key: "leap_api_key", label: "LEAP API Key" },
            { key: "actionstep_api_key", label: "Actionstep API Key" },
            { key: "abacuslaw_api_key", label: "AbacusLaw API Key" },
          ].map((item) => (
            <div key={item.key} className="space-y-2">
              <Label htmlFor={`ic_${item.key}`}>{item.label}</Label>
              <Input id={`ic_${item.key}`} type="password" placeholder="••••••••"
                value={form.watch("integration_configs")?.[item.key] || ""}
                onChange={(e) => {
                  const current = form.getValues("integration_configs") || {};
                  form.setValue("integration_configs", { ...current, [item.key]: e.target.value });
                }}
              />
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Additional Communication Section */}
      <Collapsible open={additionalCommsOpen} onOpenChange={setAdditionalCommsOpen} className="rounded-lg border border-border">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Additional Communication</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", additionalCommsOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          {[
            { key: "ringcentral_api_key", label: "RingCentral API Key" },
            { key: "google_chat_webhook_url", label: "Google Chat Webhook URL" },
          ].map((item) => (
            <div key={item.key} className="space-y-2">
              <Label htmlFor={`ic_${item.key}`}>{item.label}</Label>
              <Input id={`ic_${item.key}`} type="password" placeholder="••••••••"
                value={form.watch("integration_configs")?.[item.key] || ""}
                onChange={(e) => {
                  const current = form.getValues("integration_configs") || {};
                  form.setValue("integration_configs", { ...current, [item.key]: e.target.value });
                }}
              />
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Additional Scheduling Section */}
      <Collapsible open={additionalSchedulingOpen} onOpenChange={setAdditionalSchedulingOpen} className="rounded-lg border border-border">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Additional Scheduling</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", additionalSchedulingOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          {[
            { key: "oncehub_api_key", label: "OnceHub API Key" },
            { key: "monday_api_key", label: "Monday.com API Key" },
          ].map((item) => (
            <div key={item.key} className="space-y-2">
              <Label htmlFor={`ic_${item.key}`}>{item.label}</Label>
              <Input id={`ic_${item.key}`} type="password" placeholder="••••••••"
                value={form.watch("integration_configs")?.[item.key] || ""}
                onChange={(e) => {
                  const current = form.getValues("integration_configs") || {};
                  form.setValue("integration_configs", { ...current, [item.key]: e.target.value });
                }}
              />
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Additional Documents Section */}
      <Collapsible open={additionalDocsOpen} onOpenChange={setAdditionalDocsOpen} className="rounded-lg border border-border">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Additional Documents</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", additionalDocsOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          {[
            { key: "onedrive_api_key", label: "OneDrive API Key" },
            { key: "adobe_sign_api_key", label: "Adobe Sign API Key" },
            { key: "hellosign_api_key", label: "HelloSign API Key" },
            { key: "netdocuments_api_key", label: "NetDocuments API Key" },
          ].map((item) => (
            <div key={item.key} className="space-y-2">
              <Label htmlFor={`ic_${item.key}`}>{item.label}</Label>
              <Input id={`ic_${item.key}`} type="password" placeholder="••••••••"
                value={form.watch("integration_configs")?.[item.key] || ""}
                onChange={(e) => {
                  const current = form.getValues("integration_configs") || {};
                  form.setValue("integration_configs", { ...current, [item.key]: e.target.value });
                }}
              />
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Legal Billing Section */}
      <Collapsible open={legalBillingOpen} onOpenChange={setLegalBillingOpen} className="rounded-lg border border-border">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Legal Billing</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", legalBillingOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ic_lawpay_api_key">LawPay API Key</Label>
            <Input id="ic_lawpay_api_key" type="password" placeholder="••••••••"
              value={form.watch("integration_configs")?.lawpay_api_key || ""}
              onChange={(e) => {
                const current = form.getValues("integration_configs") || {};
                form.setValue("integration_configs", { ...current, lawpay_api_key: e.target.value });
              }}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* AI / Legal Research Section */}
      <Collapsible open={legalAiOpen} onOpenChange={setLegalAiOpen} className="rounded-lg border border-border">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">AI / Legal Research</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", legalAiOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          {[
            { key: "casetext_api_key", label: "Casetext API Key" },
            { key: "spellbook_api_key", label: "Spellbook API Key" },
            { key: "harvey_ai_api_key", label: "Harvey AI API Key" },
            { key: "lexis_ai_api_key", label: "Lexis+ AI API Key" },
            { key: "darrow_ai_api_key", label: "Darrow AI API Key" },
            { key: "diligen_api_key", label: "Diligen API Key" },
            { key: "westlaw_api_key", label: "Westlaw API Key" },
            { key: "fastcase_api_key", label: "Fastcase API Key" },
          ].map((item) => (
            <div key={item.key} className="space-y-2">
              <Label htmlFor={`ic_${item.key}`}>{item.label}</Label>
              <Input id={`ic_${item.key}`} type="password" placeholder="••••••••"
                value={form.watch("integration_configs")?.[item.key] || ""}
                onChange={(e) => {
                  const current = form.getValues("integration_configs") || {};
                  form.setValue("integration_configs", { ...current, [item.key]: e.target.value });
                }}
              />
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Security / Passwords Section */}
      <Collapsible open={securityOpen} onOpenChange={setSecurityOpen} className="rounded-lg border border-border">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Security / Passwords</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", securityOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          {[
            { key: "lastpass_api_key", label: "LastPass API Key" },
            { key: "nordpass_api_key", label: "NordPass API Key" },
          ].map((item) => (
            <div key={item.key} className="space-y-2">
              <Label htmlFor={`ic_${item.key}`}>{item.label}</Label>
              <Input id={`ic_${item.key}`} type="password" placeholder="••••••••"
                value={form.watch("integration_configs")?.[item.key] || ""}
                onChange={(e) => {
                  const current = form.getValues("integration_configs") || {};
                  form.setValue("integration_configs", { ...current, [item.key]: e.target.value });
                }}
              />
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tenant ? "Update Client" : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
