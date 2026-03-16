import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LayoutTemplate, Search, Trash2 } from "lucide-react";
import { useScriptTemplates, useDeleteScriptTemplate } from "@/hooks/useScriptTemplates";
import type { Node, Edge } from "@xyflow/react";

interface TemplateGalleryProps {
  onSelect: (nodes: Node[], edges: Edge[]) => void;
}

export function TemplateGallery({ onSelect }: TemplateGalleryProps) {
  const { data: templates = [], isLoading } = useScriptTemplates();
  const deleteTemplate = useDeleteScriptTemplate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (template: typeof templates[0]) => {
    const content = template.content as { nodes?: Node[]; edges?: Edge[] };
    if (content?.nodes) {
      onSelect(content.nodes, content.edges || []);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <LayoutTemplate className="h-3.5 w-3.5" /> Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" /> Script Templates
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <LayoutTemplate className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No templates found</p>
            </div>
          )}
          {filtered.map(t => (
            <Card key={t.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleSelect(t)}>
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium truncate">{t.name}</h4>
                    <Badge variant="outline" className="capitalize text-xs">{t.category}</Badge>
                    {t.is_built_in && <Badge variant="secondary" className="text-xs">Built-in</Badge>}
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>}
                </div>
                {!t.is_built_in && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive shrink-0"
                    onClick={e => { e.stopPropagation(); deleteTemplate.mutate(t.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
