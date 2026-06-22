import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";

/**
 * Phase 3 — Canonical sectioned config page primitive.
 *
 * Left section nav + right section body. Section selection is held in the
 * `?section=` query param so deep links resolve to the correct section
 * and the route does not have to fork.
 *
 * Used by the sectioned Settings shell and by the Library shell (which
 * treats Guides / Templates / Blueprints as sections of one umbrella).
 */
export interface ConfigSection {
  key: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  render: () => ReactNode;
}

interface ConfigPageProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  action?: ReactNode;
  sections: ConfigSection[];
  /** Override the param name (defaults to `section`). */
  paramKey?: string;
  className?: string;
}

export function ConfigPage({
  eyebrow,
  title,
  lede,
  action,
  sections,
  paramKey = "section",
  className,
}: ConfigPageProps) {
  const [params, setParams] = useSearchParams();
  const requested = params.get(paramKey);
  const active =
    sections.find((s) => s.key === requested) ?? sections[0];

  const setActive = (key: string) => {
    const next = new URLSearchParams(params);
    if (key === sections[0].key) next.delete(paramKey);
    else next.set(paramKey, key);
    setParams(next, { replace: true });
  };

  return (
    <div className={cn("space-y-6", className)}>
      <WorkspacePageHeader
        eyebrow={eyebrow}
        title={title}
        lede={lede}
        action={action}
      />
      <div className="grid gap-6 lg:grid-cols-[220px,1fr]">
        <nav aria-label={`${title} sections`} className="space-y-1">
          {sections.map((s) => {
            const isActive = active?.key === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setActive(s.key)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  "border border-transparent",
                  isActive
                    ? "bg-muted text-foreground border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="flex items-center gap-2">
                  {s.icon}
                  <span className="font-medium">{s.label}</span>
                </span>
                {s.description && (
                  <span className="block text-[11px] text-muted-foreground/80 mt-0.5">
                    {s.description}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="min-w-0">{active?.render()}</div>
      </div>
    </div>
  );
}

export default ConfigPage;
