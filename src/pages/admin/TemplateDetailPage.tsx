import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TemplateDetailPage() {
  const { id } = useParams();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [defText, setDefText] = useState("{}");

  useEffect(() => {
    if (!id) return;
    supabase.from("flow_templates").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) { setName(data.name); setCategory(data.category || ""); setDefText(JSON.stringify(data.definition, null, 2)); }
    });
  }, [id]);

  const save = async () => {
    let definition: Record<string, unknown> = {};
    try { definition = JSON.parse(defText); } catch { toast.error("Invalid JSON"); return; }
    const { error } = await supabase.from("flow_templates").update({ name, category, definition }).eq("id", id!);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-semibold tracking-tight">Template</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Definition</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
          <div><Label>Definition (JSON)</Label><Textarea value={defText} onChange={(e) => setDefText(e.target.value)} rows={12} className="font-mono text-xs" /></div>
          <Button onClick={save}>Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
