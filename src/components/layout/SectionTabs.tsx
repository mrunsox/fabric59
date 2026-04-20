import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { SubNavItem } from "@/config/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function SectionTabs({ items }: { items: SubNavItem[] }) {
  const { pathname } = useLocation();
  const { hasPermission } = useAuth();
  const visible = items.filter((i) => !i.permission || hasPermission(i.permission));
  if (visible.length === 0) return null;

  return (
    <div className="sticky top-14 z-20 bg-background/95 backdrop-blur border-b border-border/40">
      <div className="mx-auto max-w-[1440px] px-8">
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto scrollbar-none">
          {visible.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
