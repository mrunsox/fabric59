/**
 * Embed shell — chromeless layout for the published campaign runner.
 *
 * Deliberately does NOT use WorkspaceShell / OrgRail / any internal nav. The
 * embed route mounts this directly so Five9 (or any future iframe consumer)
 * sees a minimal, agent-focused surface.
 */
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  header: ReactNode;
  flow: ReactNode;
  guide?: ReactNode;
  directory: ReactNode;
  notes?: ReactNode;
  theme?: "light" | "dark" | "auto";
  className?: string;
}

export function EmbedShell({
  header,
  flow,
  guide,
  directory,
  notes,
  theme = "light",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "h-dvh w-full flex flex-col bg-background text-foreground",
        theme === "dark" && "dark",
        className,
      )}
      data-testid="embed-shell"
      data-embed-shell="true"
      data-theme={theme}
    >
      <header
        className="flex-shrink-0 border-b bg-card"
        data-testid="embed-header"
      >
        {header}
      </header>
      <main className="flex-1 min-h-0 grid gap-2 p-2 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        {guide && (
          <aside
            className="hidden xl:block min-h-0 overflow-hidden"
            data-testid="embed-guide-col"
          >
            {guide}
          </aside>
        )}
        <section className="min-h-0 overflow-hidden" data-testid="embed-flow-col">
          {flow}
          {notes && <div className="mt-2">{notes}</div>}
        </section>
        <aside className="min-h-0 overflow-hidden" data-testid="embed-directory-col">
          {directory}
        </aside>
      </main>
    </div>
  );
}
