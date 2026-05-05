import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { listTemplatesSync } from "@/lib/flow-templates/adapter";
import { toast } from "sonner";
import type { FlowTemplate } from "@/data/flow-templates";
import { connectorsForTemplate } from "@/data/connector-actions";

export default function NewFlowPage() {
  const navigate = useNavigate();
  const { organization, user } = useAuth();
  const [creating, setCreating] = useState<string | null>(null);
  const templates = listTemplatesSync();

  const create = async (tmpl: FlowTemplate) => {
    if (!organization) return;
    setCreating(tmpl.key);
    try {
      const { data, error } = await supabase
        .from("flows")
        .insert({
          organization_id: organization.id,
          name: tmpl.name,
          trigger_type: tmpl.defaultDefinition.trigger.type,
          template_type: tmpl.key,
          definition: tmpl.defaultDefinition as never,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      navigate(`/admin/flows/${data.id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setCreating(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/flows")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Flows
        </Button>
      </div>
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">New flow</h1>
          <p className="text-sm text-muted-foreground mt-1">Pick a template to start. Each preset wires the trigger, mappings, and action for you.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => {
          const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[t.icon] || Icons.Workflow;
          const isCreating = creating === t.key;
          const compatible = connectorsForTemplate(t.key);
          const noConnectors = compatible.length === 0;
          return (
            <Card key={t.key} className="hover:border-primary/40 transition-colors flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary/40 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <p className="text-sm text-muted-foreground flex-1">{t.description}</p>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Compatible connectors
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {noConnectors ? (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        None available
                      </Badge>
                    ) : (
                      compatible.map((c) => (
                        <Badge key={c.key} variant="secondary" className="text-xs">{c.name}</Badge>
                      ))
                    )}
                  </div>
                </div>
                <Button onClick={() => create(t)} disabled={!!creating || noConnectors}>
                  {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {noConnectors ? "No connectors support this" : "Use this template"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
