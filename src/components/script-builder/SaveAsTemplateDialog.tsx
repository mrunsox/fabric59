import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookmarkPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateScriptTemplate } from "@/hooks/useScriptTemplates";
import type { Node, Edge } from "@xyflow/react";

interface SaveAsTemplateDialogProps {
  nodes: Node[];
  edges: Edge[];
}

const CATEGORIES = ["general", "legal", "home-services", "healthcare", "insurance", "financial"];

export function SaveAsTemplateDialog({ nodes, edges }: SaveAsTemplateDialogProps) {
  const { organization } = useAuth();
  const createTemplate = useCreateScriptTemplate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");

  const handleSave = () => {
    if (!organization?.id || !name.trim()) return;
    createTemplate.mutate(
      {
        organization_id: organization.id,
        name: name.trim(),
        description: description.trim() || undefined,
        content: { nodes, edges },
        category,
      },
      { onSuccess: () => { setOpen(false); setName(""); setDescription(""); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <BookmarkPlus className="h-3.5 w-3.5" /> Save as Template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Save as Template</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Template name" value={name} onChange={e => setName(e.target.value)} />
          <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c} className="capitalize">{c.replace("-", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSave} disabled={!name.trim() || createTemplate.isPending} className="w-full">
            Save Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
