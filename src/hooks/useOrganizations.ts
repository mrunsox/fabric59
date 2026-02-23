import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrganizationBranding {
  id: string;
  name: string;
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_primary_color: string | null;
  brand_from_email: string | null;
  brand_reply_to: string | null;
}

export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations_list"],
    queryFn: async (): Promise<OrganizationBranding[]> => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, brand_name, brand_logo_url, brand_primary_color, brand_from_email, brand_reply_to")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return (data || []) as OrganizationBranding[];
    },
  });
}
