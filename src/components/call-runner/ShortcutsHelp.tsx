import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { HOTKEYS } from "@/lib/call-runner/hotkeys";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Compact shortcut reference. Toggled by "?" anywhere on the runner that
 * is not a typing surface. Pulls from the single hotkey contract so the
 * displayed labels never drift from the actual bindings.
 */
export function ShortcutsHelp({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" data-testid="runner-shortcuts-help">
        <DialogHeader>
          <DialogTitle className="text-sm">Live call shortcuts</DialogTitle>
          <DialogDescription className="text-xs">
            Use these anywhere on the runner. Press <kbd className="font-mono">?</kbd> to toggle this panel.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5" aria-label="Keyboard shortcuts">
          {HOTKEYS.map((h) => (
            <li key={h.id} className="flex items-center justify-between text-xs">
              <span>{h.label}</span>
              <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded border border-border bg-muted text-[11px] font-mono">
                {h.display}
              </kbd>
            </li>
          ))}
          <li className="flex items-center justify-between text-xs">
            <span>Pick branch option</span>
            <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded border border-border bg-muted text-[11px] font-mono">
              1–9
            </kbd>
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}
