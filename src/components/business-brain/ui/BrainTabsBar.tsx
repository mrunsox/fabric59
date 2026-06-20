/**
 * BrainTabsBar — Phase 2 refined tab strip.
 *
 * Presentation only. Wraps existing routing — callers pass a list of
 * { label, to, active } items. Highlights the active tab with a subtle
 * 2px cyan accent, never a loud fill.
 */
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface BrainTab {
  label: string;
  to: string;
  end?: boolean;
  badge?: React.ReactNode;
}

interface Props {
  tabs: BrainTab[];
  className?: string;
}

export function BrainTabsBar({ tabs, className }: Props) {
  return (
    <nav
      aria-label="Business Brain sections"
      className={cn(
        "flex items-center gap-1 overflow-x-auto border-b border-bb-border-subtle",
        className,
      )}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              "bb-focus-ring inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors duration-bb-fast ease-bb-emphasized",
              "border-b-2 -mb-px",
              isActive
                ? "border-bb-border-focus text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-bb-border-subtle",
            )
          }
        >
          <span>{tab.label}</span>
          {tab.badge}
        </NavLink>
      ))}
    </nav>
  );
}

export default BrainTabsBar;
