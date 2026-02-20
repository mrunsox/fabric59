import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const CREDENTIAL_KEYS = [
  'email_domain',
  'five9_username',
  'five9_password',
  'resend_api_key',
  'resend_from_email',
  'google_service_account_email',
  'google_service_account_private_key',
  'google_admin_impersonate_email',
] as const;

type ConfigKey = typeof CREDENTIAL_KEYS[number];

export function useAppConfig() {
  const [emailDomain, setEmailDomain] = useState("yourcompany.com");
  const [configValues, setConfigValues] = useState<Partial<Record<ConfigKey, string>>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await db
        .from('app_config')
        .select('key, value')
        .in('key', CREDENTIAL_KEYS);

      if (data) {
        const map: Partial<Record<ConfigKey, string>> = {};
        for (const row of data) {
          map[row.key as ConfigKey] = row.value;
        }
        setConfigValues(map);
        if (map.email_domain) setEmailDomain(map.email_domain);
      }
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const upsertConfig = async (key: ConfigKey, value: string) => {
    // Check if row exists
    const { data: existing } = await db
      .from('app_config')
      .select('id')
      .eq('key', key)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await db
        .from('app_config')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key));
    } else {
      ({ error } = await db
        .from('app_config')
        .insert({ key, value, description: key }));
    }
    return error;
  };

  const updateEmailDomain = async (value: string) => {
    const error = await upsertConfig('email_domain', value);
    if (error) {
      toast({ title: "Failed to update email domain", variant: "destructive" });
    } else {
      setEmailDomain(value);
      setConfigValues(prev => ({ ...prev, email_domain: value }));
      toast({ title: "Email domain updated" });
    }
  };

  const saveIntegrationCredentials = async (values: Partial<Record<ConfigKey, string>>) => {
    const entries = Object.entries(values).filter(([, v]) => v !== undefined && v !== '') as [ConfigKey, string][];
    const errors: string[] = [];

    for (const [key, value] of entries) {
      const error = await upsertConfig(key, value);
      if (error) errors.push(key);
    }

    if (errors.length > 0) {
      toast({ title: `Failed to save: ${errors.join(', ')}`, variant: "destructive" });
      return false;
    }

    setConfigValues(prev => ({ ...prev, ...values }));
    if (values.email_domain) setEmailDomain(values.email_domain);
    toast({ title: "Integration credentials saved" });
    return true;
  };

  return {
    emailDomain,
    updateEmailDomain,
    loading,
    configValues,
    saveIntegrationCredentials,
  };
}
