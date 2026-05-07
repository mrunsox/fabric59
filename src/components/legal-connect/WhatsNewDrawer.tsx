import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, ExternalLink } from "lucide-react";
import { useReleaseNotes } from "@/hooks/useLegalConnectFeedback";
import { Link } from "react-router-dom";

const AUDIENCE_LABEL: Record<string, string> = {
  all: "Everyone",
  design_partners: "Design partners",
  internal: "Internal",
};

interface Props {
  audience?: "all" | "design_partners" | "internal";
}

export default function WhatsNewDrawer({ audience = "design_partners" }: Props) {
  const [open, setOpen] = useState(false);
  const { data: notes = [], isLoading } = useReleaseNotes(audience);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          What's new
          {notes.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">{notes.length}</Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[480px] sm:max-w-[520px] flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> What's new in Legal Connect
          </SheetTitle>
          <SheetDescription className="text-xs">
            Recent changes shipped to design-partner tenants. Newest first.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 mt-4 pr-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No release notes yet.</p>
          ) : (
            <ol className="space-y-5">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-sm">{n.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(n.published_at).toLocaleDateString()} · {AUDIENCE_LABEL[n.audience] ?? n.audience}
                      </p>
                    </div>
                  </div>
                  {n.summary && <p className="text-xs text-muted-foreground">{n.summary}</p>}
                  {n.highlights.length > 0 && (
                    <ul className="text-xs space-y-1 list-disc pl-4">
                      {n.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  )}
                  {n.details.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Details</summary>
                      <ul className="mt-1 list-disc pl-4 space-y-0.5 text-muted-foreground">
                        {n.details.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </details>
                  )}
                  {n.dev_guide_link && (
                    <Link to={n.dev_guide_link} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      Dev guide <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
