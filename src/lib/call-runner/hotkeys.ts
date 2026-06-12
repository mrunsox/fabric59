/**
 * Live call runner — hotkey contract.
 *
 * Single source of truth so the panel buttons, the help drawer, and the
 * keyboard listener all stay in sync. Number keys 1..9 map to branch options
 * on a question_branch step; other keys cover the actions an agent needs
 * to hit without leaving the keyboard during a live call.
 *
 * All shortcuts intentionally avoid bare letters that could collide with
 * typing into the notes textarea — they require a modifier (Cmd/Ctrl/Alt)
 * unless they are number keys explicitly scoped to a branch step.
 */

export type HotkeyId =
  | "advance"
  | "back"
  | "submit"
  | "focus_notes"
  | "focus_guide_search"
  | "toggle_help";

export interface HotkeyDef {
  id: HotkeyId;
  label: string;
  /** Display string for the help drawer / tooltip. */
  display: string;
  /** Lowercased KeyboardEvent.key value to match. */
  key: string;
  meta?: boolean;
  alt?: boolean;
  shift?: boolean;
}

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
const MOD = isMac ? "\u2318" : "Ctrl";

export const HOTKEYS: HotkeyDef[] = [
  { id: "advance", label: "Advance to next step", display: `${MOD}+Enter`, key: "enter", meta: true },
  { id: "back", label: "Go back one step", display: `${MOD}+\u2190`, key: "arrowleft", meta: true },
  { id: "submit", label: "Submit interaction", display: `${MOD}+\u21B5 then ${MOD}+S`, key: "s", meta: true },
  { id: "focus_notes", label: "Jump to notes", display: "Alt+N", key: "n", alt: true },
  { id: "focus_guide_search", label: "Search guide", display: "Alt+F", key: "f", alt: true },
  { id: "toggle_help", label: "Show shortcuts", display: "?", key: "?", shift: true },
];

export function matchHotkey(e: KeyboardEvent, def: HotkeyDef): boolean {
  if (e.key.toLowerCase() !== def.key) return false;
  if (def.meta && !(e.metaKey || e.ctrlKey)) return false;
  if (!def.meta && (e.metaKey || e.ctrlKey)) return false;
  if (def.alt && !e.altKey) return false;
  if (!def.alt && e.altKey) return false;
  if (def.shift && !e.shiftKey) return false;
  return true;
}

/**
 * Number-row hotkeys for branch options. Returned as 1-indexed option index
 * (1..9) or null if the event does not match a branch shortcut.
 *
 * Only fires when no modifier is held — but is suppressed inside input/textarea
 * targets via shouldIgnoreEvent below.
 */
export function matchBranchHotkey(e: KeyboardEvent): number | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.key.length === 1 && e.key >= "1" && e.key <= "9") {
    return Number(e.key);
  }
  return null;
}

/**
 * True when the key event originated from a typing surface — we never want
 * single-digit shortcuts to fire while an agent is filling in a field.
 */
export function shouldIgnoreEvent(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (t.isContentEditable) return true;
  return false;
}
