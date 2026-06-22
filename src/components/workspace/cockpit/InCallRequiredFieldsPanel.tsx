/**
 * Phase 5 — InCallRequiredFieldsPanel
 *
 * Compact list of required intake fields the agent still needs to capture.
 * Reads from the Knowledge Bin's `required` group. Click on a row to focus
 * the matching control in the form runner column (best-effort DOM lookup).
 */
import { Button } from "@/components/ui/button";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import type { KnowledgeBin } from "@/lib/workspace/cockpit/knowledgeBin";

export interface InCallRequiredFieldsPanelProps {
  bin: KnowledgeBin | null;
}

function focusFieldById(fieldId: string) {
  if (typeof document === "undefined") return;
  const candidates = [
    document.querySelector(`[data-field-id="${fieldId}"] input`),
    document.querySelector(`[data-field-id="${fieldId}"] textarea`),
    document.querySelector(`[data-field-id="${fieldId}"] [tabindex]`),
    document.getElementById(fieldId),
  ];
  for (const el of candidates) {
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.focus();
      return;
    }
  }
}

export function InCallRequiredFieldsPanel({ bin }: InCallRequiredFieldsPanelProps) {
  const items = bin?.required.items ?? [];
  if (items.length === 0) {
    return (
      <div
        className="rounded-md border border-dashed border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 flex items-center gap-2"
        data-testid="incall-required-empty"
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        <span>All required fields captured.</span>
      </div>
    );
  }
  return (
    <div className="space-y-1" data-testid="incall-required-panel">
      <div className="flex items-center gap-2 px-1">
        <ClipboardList className="h-3.5 w-3.5 text-amber-600" aria-hidden />
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Required to capture · {items.length} remaining
        </p>
      </div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start h-auto py-1.5 px-2 text-xs font-normal"
              onClick={() => it.sourceId && focusFieldById(it.sourceId)}
              data-testid={`incall-required-${it.sourceId ?? it.id}`}
            >
              <span className="truncate text-foreground font-medium mr-2">
                {it.label}
              </span>
              <span className="text-muted-foreground truncate">{it.body}</span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
