import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useAppConfig() {
  const [emailDomain, setEmailDomain] = useState("yourcompany.com");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await db
        .from('app_config')
        .select('value')
        .eq('key', 'email_domain')
        .maybeSingle();
      if (data?.value) setEmailDomain(data.value);
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const updateEmailDomain = async (value: string) => {
    const { error } = await db
      .from('app_config')
      .update({ value })
      .eq('key', 'email_domain');
    if (error) {
      toast({ title: "Failed to update email domain", variant: "destructive" });
    } else {
      setEmailDomain(value);
      toast({ title: "Email domain updated" });
    }
  };

  return { emailDomain, updateEmailDomain, loading };
}
