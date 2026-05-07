import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen } from "lucide-react";
import { getClientGuide, type ProviderGuide } from "@/data/legal-connect-guides";

interface GuideDrawerContextValue {
  open: (provider: string, sectionId?: string) => void;
}

let openHandler: GuideDrawerContextValue["open"] | null = null;

/** Imperative helper so any card / button can pop the drawer without prop drilling. */
export function openGuideDrawer(provider: string, sectionId?: string) {
  openHandler?.(provider, sectionId);
}

export default function GuideDrawer() {
  const [guide, setGuide] = useState<ProviderGuide | null>(null);
  const [section, setSection] = useState<string | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  // Register the imperative handler once.
  if (!openHandler) {
    openHandler = (provider: string, sectionId?: string) => {
      const g = getClientGuide(provider);
      if (!g) return;
      setGuide(g);
      setSection(sectionId);
      setIsOpen(true);
    };
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-[480px] sm:max-w-[520px] overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            {guide?.title ?? "Guide"}
          </SheetTitle>
          <SheetDescription className="text-xs">{guide?.summary}</SheetDescription>
          {guide?.tags && (
            <div className="flex flex-wrap gap-1 pt-1">
              {guide.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
              ))}
            </div>
          )}
        </SheetHeader>
        <ScrollArea className="flex-1 mt-4 pr-4">
          <div className="space-y-5 text-sm">
            {guide?.sections.map((s) => (
              <div
                key={s.id}
                id={`guide-section-${s.id}`}
                className={
                  section === s.id
                    ? "rounded-md border border-primary/30 bg-primary/5 p-3"
                    : "rounded-md p-3 border border-transparent"
                }
              >
                <h3 className="text-sm font-semibold mb-1">{s.title}</h3>
                {s.body.map((p, i) => (
                  <p key={i} className="text-xs text-muted-foreground mb-2">{p}</p>
                ))}
                {s.bullets && (
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                    {s.bullets.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                )}
                {s.steps && (
                  <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
                    {s.steps.map((b, i) => <li key={i}>{b}</li>)}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
