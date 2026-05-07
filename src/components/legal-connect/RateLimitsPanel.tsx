import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const QK = (id: string) => ["tenant-rate-limits", id];

export default function RateLimitsPanel({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: QK(clientId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tenants")
        .select("max_jobs_per_minute, max_jobs_per_hour")
        .eq("id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data ?? { max_jobs_per_minute: 60, max_jobs_per_hour: 1000 };
    },
  });

  const [perMin, setPerMin] = useState(60);
  const [perHour, setPerHour] = useState(1000);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setPerMin(data.max_jobs_per_minute ?? 60);
      setPerHour(data.max_jobs_per_hour ?? 1000);
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("tenants")
      .update({
        max_jobs_per_minute: Math.max(1, Number(perMin) || 1),
        max_jobs_per_hour: Math.max(1, Number(perHour) || 1),
      })
      .eq("id", clientId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rate limits saved");
    qc.invalidateQueries({ queryKey: QK(clientId) });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          Rate limits
        </CardTitle>
        <CardDescription className="text-xs">
          Per-tenant caps on Legal Connect sync jobs. The worker reschedules excess jobs and opens a
          warning alert. Defaults: 60/min, 1000/hr.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Max jobs / minute</Label>
            <Input
              type="number"
              value={perMin}
              onChange={(e) => setPerMin(parseInt(e.target.value || "0", 10))}
              className="h-8 text-sm"
              min={1}
            />
          </div>
          <div>
            <Label className="text-xs">Max jobs / hour</Label>
            <Input
              type="number"
              value={perHour}
              onChange={(e) => setPerHour(parseInt(e.target.value || "0", 10))}
              className="h-8 text-sm"
              min={1}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={saving}>
            Save limits
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
