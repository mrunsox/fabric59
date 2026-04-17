import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface BeforeAfterSliderProps {
  beforeContent: React.ReactNode;
  afterContent: React.ReactNode;
  beforeLabel?: string;
  afterLabel?: string;
}

export function BeforeAfterSlider({
  beforeContent,
  afterContent,
  beforeLabel = "Before",
  afterLabel = "After",
}: BeforeAfterSliderProps) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePos = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const next = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPos(next);
  }, []);

  const onMouseDown = () => { dragging.current = true; };
  const onMouseUp = () => { dragging.current = false; };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    updatePos(e.clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    updatePos(e.touches[0].clientX);
  };

  return (
    <section className="py-20 max-w-6xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-10"
      >
        <h2 className="text-3xl font-bold mb-3">Before and after Fabric59</h2>
        <p className="text-muted-foreground">Drag the slider to compare manual chaos with automated flow.</p>
      </motion.div>
      <div
        ref={containerRef}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchEnd={onMouseUp}
        className="relative h-80 rounded-2xl border border-border overflow-hidden bg-card cursor-ew-resize select-none"
      >
        {/* Before (full background) */}
        <div className="absolute inset-0 p-8 flex items-center justify-center bg-gradient-to-br from-destructive/5 to-warning/5">
          <div className="absolute top-3 left-4 text-[10px] font-bold uppercase tracking-wider text-destructive">{beforeLabel}</div>
          {beforeContent}
        </div>
        {/* After (clipped overlay) */}
        <div
          className="absolute inset-0 p-8 flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5"
          style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        >
          <div className="absolute top-3 right-4 text-[10px] font-bold uppercase tracking-wider text-primary">{afterLabel}</div>
          {afterContent}
        </div>
        {/* Divider */}
        <div
          className="absolute top-0 bottom-0 w-px bg-foreground/40"
          style={{ left: `${pos}%` }}
        >
          <div
            onMouseDown={onMouseDown}
            onTouchStart={onMouseDown}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center cursor-ew-resize"
          >
            <span className="text-xs font-bold">{"⇆"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
