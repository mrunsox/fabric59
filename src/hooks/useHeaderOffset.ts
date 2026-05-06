import { useEffect, useRef } from "react";

/**
 * Tracks an element's height and writes it to `--header-offset` on :root.
 * Used by the sticky marketing header so `scroll-padding-top` /
 * `scroll-margin-top` always match the live header size — even when
 * the header changes height on scroll (shadow/padding swap).
 */
export function useHeaderOffset<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const apply = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) {
        document.documentElement.style.setProperty("--header-offset", `${h}px`);
      }
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  return ref;
}
