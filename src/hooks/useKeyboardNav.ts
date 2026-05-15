import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Linear-style "g + key" navigation. Press `g`, then within 1.2s press a
 * letter to jump to a workspace section. Ignored while typing in inputs or
 * when modifier keys are held.
 */
const SHORTCUTS: Record<string, string> = {
  h: "home",
  c: "campaigns",
  g: "guides",
  f: "forms",
  t: "templates",
  l: "clients",
  r: "runs",
  a: "agents",
  v: "supervisor",
  q: "qa",
  n: "analytics",
  i: "integrations",
  k: "knowledge",
  s: "settings",
};

export function useKeyboardNav(workspaceId: string | undefined) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!workspaceId) return;
    let armed = false;
    let timer: number | undefined;

    const isTyping = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      const key = e.key.toLowerCase();
      if (!armed) {
        if (key === "g") {
          armed = true;
          window.clearTimeout(timer);
          timer = window.setTimeout(() => {
            armed = false;
          }, 1200);
        }
        return;
      }
      armed = false;
      window.clearTimeout(timer);
      const dest = SHORTCUTS[key];
      if (dest) {
        e.preventDefault();
        navigate(`/w/${workspaceId}/${dest}`);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
    };
  }, [workspaceId, navigate]);
}

/** Public hint map so the sidebar can show kbd hints inline. */
export const KEYBOARD_HINTS: Record<string, string> = Object.fromEntries(
  Object.entries(SHORTCUTS).map(([k, v]) => [v, `g ${k.toUpperCase()}`]),
);
