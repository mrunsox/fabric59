import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestConnectionParams {
  domainId: string;
  username?: string;
  password?: string;
}

interface TestConnectionResult {
  success: boolean;
  status: "pending" | "connected" | "failed";
  message: string;
  error?: string;
}

export function useTestFive9Connection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ domainId, username, password }: TestConnectionParams): Promise<TestConnectionResult> => {
      const { data: session } = await supabase.auth.getSession();

      if (!session.session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-five9-connection`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            domain_id: domainId,
            username,
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok && !result.success) {
        throw new Error(result.error || result.message || "Connection test failed");
      }

      return result;
    },
    onSuccess: (result, variables) => {
      // Invalidate the domain query to refresh connection status
      queryClient.invalidateQueries({ queryKey: ["five9_domains", variables.domainId] });
      queryClient.invalidateQueries({ queryKey: ["five9_domains"] });

      if (result.success) {
        toast.success(result.message || "Connected to Five9 successfully");
      } else {
        toast.error(result.message || "Connection failed");
      }
    },
    onError: (error: Error) => {
      toast.error(`Connection test failed: ${error.message}`);
    },
  });
}
