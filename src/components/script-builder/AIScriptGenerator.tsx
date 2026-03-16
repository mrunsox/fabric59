import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Node, Edge } from "@xyflow/react";

interface AIScriptGeneratorProps {
  onGenerated: (nodes: Node[], edges: Edge[]) => void;
}

const INDUSTRIES = [
  { value: "legal", label: "Legal / Law Firm" },
  { value: "home-services", label: "Home Services" },
  { value: "healthcare", label: "Healthcare" },
  { value: "insurance", label: "Insurance" },
  { value: "financial", label: "Financial Services" },
  { value: "general", label: "General / Other" },
];

export function AIScriptGenerator({ onGenerated }: AIScriptGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [industry, setIndustry] = useState("general");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-script", {
        body: { prompt: prompt.trim(), industry },
      });
      if (error) throw error;
      if (data?.nodes && data?.edges) {
        onGenerated(data.nodes, data.edges);
        toast.success("Script generated successfully");
        setOpen(false);
        setPrompt("");
      } else {
        toast.error("Invalid response from AI");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate script");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> AI Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Script Generator
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Industry</label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map(i => (
                  <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Describe your call script</label>
            <Textarea
              placeholder="e.g., Inbound legal intake for personal injury cases. Qualify the caller, capture injury details, check statute of limitations, and schedule a consultation."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Include call type, qualification criteria, and desired outcomes
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["Inbound intake", "Outbound sales", "Customer service", "Appointment setting"].map(s => (
              <Badge
                key={s}
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={() => setPrompt(p => p ? `${p}. ${s}` : s)}
              >
                {s}
              </Badge>
            ))}
          </div>
          <Button onClick={generate} disabled={loading || !prompt.trim()} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Generating…" : "Generate Script"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
