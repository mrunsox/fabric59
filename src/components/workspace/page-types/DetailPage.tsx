import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";

/**
 * Phase 3 — Canonical detail page primitive.
 *
 * Standardizes back-link → header strip (with status/scope/action slots) →
 * tabbed or stacked body → optional side rail. Detail pages should adopt
 * this primitive instead of hand-rolling their own header treatment.
 */
interface DetailPageProps {
  /** Back link rendered above the header. */
  back?: { to: string; label: string };
  eyebrow?: string;
  title: string;
  lede?: string;
  /** Right-side primary action (e.g. Edit, Publish). */
  action?: ReactNode;
  /** Right-side secondary content (status badges, scope chips). */
  status?: ReactNode;
  /** Optional right rail (related actions, summary). */
  sideRail?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function DetailPage({
  back,
  eyebrow,
  title,
  lede,
  action,
  status,
  sideRail,
  className,
  children,
}: DetailPageProps) {
  return (
    <div className={cn("space-y-6 animate-fade-in", className)}>
      {back && (
        <Button asChild variant="ghost" size="sm">
          <Link to={back.to}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> {back.label}
          </Link>
        </Button>
      )}
      <WorkspacePageHeader
        eyebrow={eyebrow}
        title={title}
        lede={lede}
        secondary={status}
        action={action}
      />
      {sideRail ? (
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="min-w-0 space-y-6">{children}</div>
          <aside className="space-y-4">{sideRail}</aside>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export default DetailPage;
