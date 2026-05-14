import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  to: string;
  icon: LucideIcon;
  label: string;
  hint?: string;
  /** Defaults to a Plus glyph; pass `null` to omit. */
  trailingIcon?: LucideIcon | null;
  className?: string;
}

/**
 * Canonical create/CTA tile primitive.
 *
 * Promoted from WorkspaceHomePage in the Outline + Data convergence slice.
 * Use across workspace index pages whenever a card needs to advertise a
 * create-style action (e.g. "New campaign", "New guide").
 */
export function ActionCard({
  to,
  icon: Icon,
  label,
  hint,
  trailingIcon,
  className,
}: ActionCardProps) {
  const Trailing = trailingIcon === undefined ? Plus : trailingIcon;
  return (
    <Link to={to} className={cn("group block", className)}>
      <Card className="h-full hover:border-primary/60 transition-colors">
        <CardContent className="pt-5 pb-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            {Trailing && (
              <Trailing className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            )}
          </div>
          <div>
            <div className="font-medium text-sm">{label}</div>
            {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
