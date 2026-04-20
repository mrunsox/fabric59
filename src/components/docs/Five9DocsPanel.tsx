import { useLocation } from "react-router-dom";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, BookOpen, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDocsForRoute } from "@/data/five9DocsIndex";

export function Five9DocsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation();
  const topics = getDocsForRoute(pathname);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <SheetTitle className="text-base">Five9 Documentation</SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            Surfaced for: <code className="text-foreground/80">{pathname}</code>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            {topics.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
                  <Badge variant="outline" className="text-[10px]">Five9</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.summary}</p>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                    Why this matters
                  </p>
                  <p className="text-xs text-foreground/80">{t.whyItMatters}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Setup checklist
                  </p>
                  {t.checklist.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-muted-foreground/50 flex-shrink-0" />
                      <span className="text-foreground/80">{c}</span>
                    </div>
                  ))}
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a href={t.url} target="_blank" rel="noopener noreferrer">
                    Open official doc
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
