/**
 * Phase 5 — InCallSourceChip
 *
 * Tiny inline chip describing where a piece of knowledge came from. Used in
 * the Knowledge Bin list rows and in every non-missing assist suggestion's
 * "why this answer" footer.
 */
import { cn } from "@/lib/utils";
import {
  Sparkle,
  BookOpen,
  ClipboardList,
  Megaphone,
  PhoneCall,
  Library,
  Route,
  type LucideIcon,
} from "lucide-react";
import type { KnowledgeSourceType } from "@/lib/workspace/cockpit/knowledgeBin";

interface Meta {
  label: string;
  icon: LucideIcon;
  tone: string;
}

const META: Record<KnowledgeSourceType, Meta> = {
  live_session: {
    label: "Live",
    icon: PhoneCall,
    tone: "border-primary/30 text-primary bg-primary/5",
  },
  campaign_instruction: {
    label: "Campaign",
    icon: Megaphone,
    tone: "border-amber-500/30 text-amber-700 bg-amber-500/5",
  },
  required_field: {
    label: "Required",
    icon: ClipboardList,
    tone: "border-amber-500/30 text-amber-700 bg-amber-500/5",
  },
  workspace_guide: {
    label: "Canonical guide",
    icon: BookOpen,
    tone: "border-sky-500/30 text-sky-700 bg-sky-500/5",
  },
  business_brain: {
    label: "Approved",
    icon: Sparkle,
    tone: "border-emerald-500/30 text-emerald-700 bg-emerald-500/5",
  },
  supplementary: {
    label: "Reference",
    icon: Library,
    tone: "border-border text-muted-foreground bg-muted/30",
  },
  routing: {
    label: "Routing",
    icon: Route,
    tone: "border-border text-muted-foreground bg-muted/30",
  },
};

export interface InCallSourceChipProps {
  sourceType: KnowledgeSourceType;
  precedence?: number;
  scope?: string;
  className?: string;
  /** Render a slightly more compact variant for inline footers. */
  dense?: boolean;
}

export function InCallSourceChip({
  sourceType,
  precedence,
  scope,
  className,
  dense,
}: InCallSourceChipProps) {
  const meta = META[sourceType];
  const Icon = meta.icon;
  const precLabel =
    typeof precedence === "number" && Number.isFinite(precedence)
      ? ` · prec ${precedence}`
      : "";
  const title = scope
    ? `${meta.label} — ${scope}${precLabel}`
    : `${meta.label}${precLabel}`;
  return (
    <span
      title={title}
      data-testid={`incall-source-chip-${sourceType}`}
      className={cn(
        "inline-flex items-center gap-1 rounded border font-medium tracking-tight",
        dense ? "h-4 px-1 text-[10px]" : "h-5 px-1.5 text-[10px]",
        meta.tone,
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" aria-hidden />
      <span className="truncate">{meta.label}</span>
      {typeof precedence === "number" && Number.isFinite(precedence) && (
        <span className="opacity-70 font-mono">p{precedence}</span>
      )}
    </span>
  );
}
