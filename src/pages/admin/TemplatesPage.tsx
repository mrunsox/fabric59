import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileStack, Plus } from "lucide-react";
import { toast } from "sonner";

export default function TemplatesPage() {
  const { organization, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["templates", organization?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("flow_templates")
        .select("id, name, category, organization_id, updated_at")
        .or(`organization_id.eq.${organization!.id},organization_id.is.null`)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!organization,
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("flow_templates").insert({
        organization_id: organization!.id, name: "Untitled template", category: "general",
        definition: { trigger: { type: "call_end" }, filters: [], mappings: [], action: null, failure: { retries: 0 } },
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (t) => { qc.invalidateQueries({ queryKey: ["templates"] }); navigate(`/admin/templates/${t.id}`); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileStack className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Templates</h1>
            <p className="text-sm text-muted-foreground mt-1">Reusable flow blueprints for clients and dispositions</p>
          </div>
        </div>
        <Button onClick={() => create.mutate()}><Plus className="h-4 w-4 mr-2" />New template</Button>
      </div>

      {templates.length === 0 ? (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">No templates yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} className="hover:border-primary/40 cursor-pointer" onClick={() => navigate(`/admin/templates/${t.id}`)}>
              <CardHeader>
                <CardTitle className="text-base">{t.name}</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{t.category || "general"}</Badge>
                  {!t.organization_id && <Badge>Global</Badge>}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
