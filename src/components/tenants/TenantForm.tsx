import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateTenant, useUpdateTenant } from "@/hooks/useTenants";
import type { Tenant, TenantFormData, CrmType, TenantStatus } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  crm_type: z.enum(["clio", "workiz", "salesforce", "generic_rest", "other"]),
  crm_api_url: z.string().url().optional().or(z.literal("")),
  crm_api_key: z.string().optional(),
  webhook_url: z.string().url().optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "pending"]),
});

interface TenantFormProps {
  tenant?: Tenant;
  onSuccess?: () => void;
}

export function TenantForm({ tenant, onSuccess }: TenantFormProps) {
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();

  const form = useForm<TenantFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tenant?.name || "",
      crm_type: tenant?.crm_type || "other",
      crm_api_url: tenant?.crm_api_url || "",
      crm_api_key: tenant?.crm_api_key || "",
      webhook_url: tenant?.webhook_url || "",
      status: tenant?.status || "pending",
    },
  });

  const isSubmitting = createTenant.isPending || updateTenant.isPending;

  const onSubmit = async (data: TenantFormData) => {
    if (tenant) {
      await updateTenant.mutateAsync({ id: tenant.id, data });
    } else {
      await createTenant.mutateAsync(data);
    }
    onSuccess?.();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Tenant Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Law Firm Alpha"
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">
            {form.formState.errors.name.message}
          </p>
        )}
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

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tenant ? "Update Tenant" : "Create Tenant"}
        </Button>
      </div>
    </form>
  );
}
