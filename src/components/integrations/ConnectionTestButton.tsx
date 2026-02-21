import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  edgeFunction: string;
  apiKey?: string;
}

export function ConnectionTestButton({ edgeFunction, apiKey }: Props) {
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleTest = async () => {
    setStatus("testing");
    setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke(edgeFunction, {
        body: { action: "test", api_key: apiKey },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus("success");
        setMessage(data.message || "Connection successful");
      } else {
        setStatus("error");
        setMessage(data?.error || "Connection test failed");
      }
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Test failed");
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant={status === "success" ? "outline" : "secondary"}
        onClick={handleTest}
        disabled={status === "testing"}
        className="gap-2 w-full"
      >
        {status === "testing" && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === "success" && <CheckCircle2 className="h-4 w-4 text-success" />}
        {status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
        {status === "idle" && <Wifi className="h-4 w-4" />}
        {status === "testing" ? "Testing..." : status === "success" ? "Connected" : status === "error" ? "Retry Test" : "Test Connection"}
      </Button>
      {message && (
        <p className={`text-xs ${status === "success" ? "text-success" : "text-destructive"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
