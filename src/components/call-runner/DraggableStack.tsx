import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DraggableStackItem {
  id: string;
  node: ReactNode;
  /** Optional human label used by the live region announcement. */
  label?: string;
}

export interface DraggableStackProps {
  items: DraggableStackItem[];
  /** Current order of ids. */
  order: string[];
  onOrderChange: (next: string[]) => void;
  className?: string;
  /** Optional id used for data attributes / testing. */
  surfaceId?: string;
}

/**
 * Lightweight, dependency-free draggable vertical stack.
 *
 * Pointer:
 *   - Each slot has a small grip handle (top-right). Whole slot is draggable
 *     via HTML5 DnD; the handle is the explicit affordance.
 *   - Dropping above the midpoint of a target inserts before it; below the
 *     midpoint inserts after.
 *
 * Keyboard:
 *   - Handle is a button. Space picks up, ArrowUp/Down moves, Space drops,
 *     Escape cancels. Live region announces moves.
 *
 * Reduced motion:
 *   - Honors `prefers-reduced-motion` via a small CSS transition flag.
 */
export function DraggableStack({
  items,
  order,
  onOrderChange,
  className,
  surfaceId,
}: DraggableStackProps) {
  const map = new Map(items.map((it) => [it.id, it]));
  const resolved = order.map((id) => map.get(id)).filter(Boolean) as DraggableStackItem[];

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [insertionTarget, setInsertionTarget] = useState<{
    id: string;
    position: "before" | "after";
  } | null>(null);

  // Keyboard pickup state (separate from pointer DnD).
  const [grabbedId, setGrabbedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const announce = useCallback((msg: string) => setAnnouncement(msg), []);

  const move = useCallback(
    (fromId: string, toId: string, position: "before" | "after") => {
      if (fromId === toId) return;
      const next = order.filter((id) => id !== fromId);
      const targetIdx = next.indexOf(toId);
      if (targetIdx === -1) return;
      const insertAt = position === "before" ? targetIdx : targetIdx + 1;
      next.splice(insertAt, 0, fromId);
      onOrderChange(next);
    },
    [order, onOrderChange],
  );

  const moveBy = useCallback(
    (id: string, delta: number) => {
      const idx = order.indexOf(id);
      if (idx === -1) return;
      const newIdx = Math.min(order.length - 1, Math.max(0, idx + delta));
      if (newIdx === idx) return;
      const next = [...order];
      next.splice(idx, 1);
      next.splice(newIdx, 0, id);
      onOrderChange(next);
      const label = map.get(id)?.label ?? id;
      announce(`${label} moved to position ${newIdx + 1} of ${order.length}`);
    },
    [order, onOrderChange, map, announce],
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    if (!draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const position: "before" | "after" =
      e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setInsertionTarget((prev) =>
      prev && prev.id === targetId && prev.position === position
        ? prev
        : { id: targetId, position },
    );
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    if (!draggingId) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const position: "before" | "after" =
      e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    move(draggingId, targetId, position);
    setDraggingId(null);
    setInsertionTarget(null);
  };

  return (
    <div
      className={cn("flex flex-col gap-3 min-h-0", className)}
      data-runner-stack={surfaceId ?? undefined}
    >
      <span className="sr-only" aria-live="polite" role="status">
        {announcement}
      </span>
      {resolved.map((item, idx) => {
        const isDragging = draggingId === item.id;
        const isGrabbed = grabbedId === item.id;
        const showBefore =
          insertionTarget?.id === item.id && insertionTarget.position === "before";
        const showAfter = insertionTarget?.id === item.id && insertionTarget.position === "after";
        return (
          <div key={item.id} className="relative">
            {showBefore && <InsertionLine />}
            <div
              draggable
              onDragStart={(e) => {
                setDraggingId(item.id);
                e.dataTransfer.effectAllowed = "move";
                try {
                  e.dataTransfer.setData("text/plain", item.id);
                } catch {
                  /* ignore (some browsers in tests) */
                }
              }}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDrop={(e) => handleDrop(e, item.id)}
              onDragEnd={() => {
                setDraggingId(null);
                setInsertionTarget(null);
              }}
              className={cn(
                "group relative rounded-md outline-none",
                "motion-safe:transition-[opacity,transform] motion-safe:duration-150",
                isDragging && "opacity-60",
                isGrabbed && "ring-2 ring-primary/60",
              )}
              data-runner-card={item.id}
              aria-roledescription="Draggable card"
            >
              <button
                type="button"
                className={cn(
                  "absolute top-1 right-1 z-10 inline-flex h-6 w-6 items-center justify-center",
                  "rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "cursor-grab active:cursor-grabbing",
                )}
                aria-label={`Reorder ${item.label ?? item.id} (position ${idx + 1} of ${resolved.length})`}
                aria-grabbed={isGrabbed}
                data-runner-card-handle={item.id}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    if (grabbedId === item.id) {
                      setGrabbedId(null);
                      announce(`${item.label ?? item.id} dropped`);
                    } else {
                      setGrabbedId(item.id);
                      announce(`${item.label ?? item.id} picked up. Use arrow keys to move, space to drop, escape to cancel.`);
                    }
                  } else if (e.key === "Escape" && grabbedId === item.id) {
                    e.preventDefault();
                    setGrabbedId(null);
                    announce("Move cancelled");
                  } else if (grabbedId === item.id && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                    e.preventDefault();
                    moveBy(item.id, e.key === "ArrowUp" ? -1 : 1);
                  }
                }}
              >
                <GripVertical className="h-3.5 w-3.5" aria-hidden />
              </button>
              {item.node}
            </div>
            {showAfter && <InsertionLine />}
          </div>
        );
      })}
    </div>
  );
}

function InsertionLine() {
  return (
    <div
      aria-hidden
      className="my-1 h-0.5 rounded bg-primary/70"
      data-runner-stack-insertion
    />
  );
}
