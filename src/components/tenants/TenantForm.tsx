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
import { Loader2, ChevronDown, Bell, Zap, Workflow } from "lucide-react";
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
  crm_type: z.enum(["clio", "workiz", "salesforce", "generic_rest", "other"]),
  crm_api_url: z.string().url().optional().or(z.literal("")),
  crm_api_key: z.string().optional(),
  webhook_url: z.string().url().optional().or(z.literal("")),
  slack_webhook_url: z.string().url().optional().or(z.literal("")),
  zapier_webhook_url: z.string().url().optional().or(z.literal("")),
  make_webhook_url: z.string().url().optional().or(z.literal("")),
  pabbly_webhook_url: z.string().url().optional().or(z.literal("")),
  n8n_webhook_url: z.string().url().optional().or(z.literal("")),
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
] as const;

export function TenantForm({ tenant, onSuccess }: TenantFormProps) {
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const [notificationsOpen, setNotificationsOpen] = useState(
    !!(tenant?.slack_webhook_url)
  );
  const [automationsOpen, setAutomationsOpen] = useState(
    !!(tenant?.zapier_webhook_url || tenant?.make_webhook_url || tenant?.pabbly_webhook_url || tenant?.n8n_webhook_url)
  );

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
              <span className="font-medium">Slack Notifications</span>
              {hasSlackConfigured && (
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

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tenant ? "Update Client" : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
