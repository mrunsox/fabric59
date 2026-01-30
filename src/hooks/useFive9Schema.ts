import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Five9Schema } from "@/types/mapping";

interface Five9SchemaResponse {
  domain: {
    id: string;
    display_name: string;
    domain: string;
  };
  schema: Five9Schema;
}

async function fetchFive9Schema(domainId: string): Promise<Five9SchemaResponse> {
  const { data: session } = await supabase.auth.getSession();
  
  if (!session.session) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/five9-schema?domain_id=${domainId}`,
    {
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch Five9 schema");
  }

  return response.json();
}

export function useFive9Schema(domainId: string | null) {
  return useQuery({
    queryKey: ["five9-schema", domainId],
    queryFn: () => fetchFive9Schema(domainId!),
    enabled: !!domainId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });
}
