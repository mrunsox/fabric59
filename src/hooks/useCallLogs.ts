import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CallLogRecord {
  timestamp: string;
  campaignName: string;
  agentName: string;
  customerName: string;
  phoneNumber: string;
  duration: string;
  disposition: string;
}

export function useCallLogs(startDate: string, endDate: string, enabled = true) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["call_logs", organization?.id, startDate, endDate],
    queryFn: async () => {
      if (!organization?.id || !startDate || !endDate) return [];

      const { data, error } = await supabase.functions.invoke("five9-reporting", {
        body: {
          action: "getCallLogs",
          startDate,
          endDate,
          organizationId: organization.id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to fetch call logs");
      return (data.records || []) as CallLogRecord[];
    },
    enabled: enabled && !!organization?.id && !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000,
  });
}

export async function exportCallLogs(records: CallLogRecord[], format: "csv" | "xlsx" | "pdf") {
  const { data, error } = await supabase.functions.invoke("report-export", {
    body: { format, records },
  });

  if (error) throw error;

  // For CSV and XLSX, trigger download
  if (format === "csv" || format === "xlsx") {
    const blob = new Blob([data], {
      type: format === "csv" ? "text/csv" : "application/vnd.ms-excel",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-logs.${format === "xlsx" ? "xls" : format}`;
    a.click();
    URL.revokeObjectURL(url);
  } else if (format === "pdf") {
    // Open HTML in new window for printing
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(data);
      win.document.close();
      win.print();
    }
  }
}
