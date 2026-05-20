import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { GuideBlock, GuideBlockType, GuideContentV1 } from "@/types/guide-content";
import { isHttpUrl } from "@/lib/guides/guideContentSchema";

interface GuideContentEditorProps {
  value: GuideContentV1;
  onChange: (next: GuideContentV1) => void;
}

const BLOCK_LABELS: Record<GuideBlockType, string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  info: "Info note",
  script: "Say-this script",
  connector: "Connector link",
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `b_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function newBlock(type: GuideBlockType): GuideBlock {
  const id = newId();
  switch (type) {
    case "connector":
      return { id, type, label: "", href: "" };
    default:
      return { id, type, text: "" };
  }
}

export function GuideContentEditor({ value, onChange }: GuideContentEditorProps) {
  const blocks = value.blocks;

  const update = (next: GuideBlock[]) => onChange({ schemaVersion: 1, blocks: next });

  const add = (type: GuideBlockType) => update([...blocks, newBlock(type)]);

  const patch = (id: string, partial: Partial<GuideBlock>) =>
    update(
      blocks.map((b) => (b.id === id ? ({ ...b, ...partial } as GuideBlock) : b)),
    );

  const remove = (id: string) => update(blocks.filter((b) => b.id !== id));

  const move = (id: string, dir: -1 | 1) => {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = blocks.slice();
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  return (
    <div className="space-y-3" data-testid="guide-content-editor">
      {blocks.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No blocks yet. Add your first block to start building the guide.
        </p>
      )}

      {blocks.map((block, i) => (
        <div
          key={block.id}
          data-testid={`guide-block-${block.id}`}
          data-block-type={block.type}
          className="rounded-md border border-border bg-background p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {BLOCK_LABELS[block.type]}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => move(block.id, -1)}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Move down"
                disabled={i === blocks.length - 1}
                onClick={() => move(block.id, 1)}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                aria-label="Delete block"
                onClick={() => remove(block.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {block.type === "heading" && (
            <Input
              aria-label="Heading text"
              value={block.text}
              onChange={(e) => patch(block.id, { text: e.target.value })}
              placeholder="Section heading"
            />
          )}

          {(block.type === "paragraph" ||
            block.type === "info" ||
            block.type === "script") && (
            <Textarea
              aria-label={`${BLOCK_LABELS[block.type]} text`}
              value={block.text}
              onChange={(e) => patch(block.id, { text: e.target.value })}
              rows={block.type === "script" ? 3 : 2}
              placeholder={
                block.type === "script"
                  ? "Say this verbatim to the caller…"
                  : block.type === "info"
                  ? "Background information for the agent"
                  : "Paragraph text"
              }
            />
          )}

          {block.type === "connector" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Label</Label>
                <Input
                  aria-label="Connector label"
                  value={block.label}
                  placeholder="Open client portal"
                  onChange={(e) => {
                    const text = e.target.value;
                    // Paste-promotion: a valid http(s) URL pasted into an empty
                    // label, when href is still empty, is promoted to href so
                    // the link works immediately while the agent labels it.
                    if (!block.href.trim() && !block.label && isHttpUrl(text)) {
                      patch(block.id, { href: text.trim(), label: "" });
                      return;
                    }
                    patch(block.id, { label: text });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">URL</Label>
                <Input
                  aria-label="Connector URL"
                  type="url"
                  inputMode="url"
                  value={block.href}
                  placeholder="https://…"
                  onChange={(e) => patch(block.id, { href: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" /> Add block:
        </span>
        {(Object.keys(BLOCK_LABELS) as GuideBlockType[]).map((t) => (
          <Button
            key={t}
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Add ${BLOCK_LABELS[t]}`}
            onClick={() => add(t)}
          >
            {BLOCK_LABELS[t]}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default GuideContentEditor;
