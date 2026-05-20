import { ExternalLink, Info, MessageSquareQuote } from "lucide-react";
import type { GuideBlock, GuideContentV1 } from "@/types/guide-content";

interface GuideContentRendererProps {
  content: GuideContentV1;
  className?: string;
}

export function GuideContentRenderer({ content, className }: GuideContentRendererProps) {
  if (!content.blocks.length) {
    return (
      <p className={"text-sm text-muted-foreground " + (className ?? "")}>
        No guide content yet.
      </p>
    );
  }
  return (
    <div className={"space-y-4 " + (className ?? "")} data-testid="guide-content-renderer">
      {content.blocks.map((block) => (
        <RenderBlock key={block.id} block={block} />
      ))}
    </div>
  );
}

function RenderBlock({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h3 className="text-lg font-semibold tracking-tight" data-block-type="heading">
          {block.text}
        </h3>
      );
    case "paragraph":
      return (
        <p className="text-sm leading-relaxed text-foreground" data-block-type="paragraph">
          {block.text}
        </p>
      );
    case "info":
      return (
        <div
          data-block-type="info"
          className="flex gap-3 rounded-md border border-border bg-muted/40 p-3"
        >
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{block.text}</p>
        </div>
      );
    case "script":
      return (
        <div
          data-block-type="script"
          className="flex gap-3 rounded-md border-l-4 border-primary bg-primary/5 p-3"
        >
          <MessageSquareQuote className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <p className="text-sm font-medium text-foreground whitespace-pre-wrap">{block.text}</p>
        </div>
      );
    case "connector": {
      const label = block.label.trim() || block.href;
      return (
        <a
          data-block-type="connector"
          href={block.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent/10 hover:border-border/80 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {label}
        </a>
      );
    }
  }
}

export default GuideContentRenderer;
