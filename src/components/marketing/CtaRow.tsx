import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CtaAction {
  label: string;
  to: string;
}

interface CtaRowProps {
  primary: CtaAction;
  secondary?: CtaAction;
  align?: "left" | "center";
  className?: string;
}

/**
 * Phase G — Shared marketing CTA row.
 * Primary + optional secondary. Tokens only.
 */
export function CtaRow({ primary, secondary, align = "center", className }: CtaRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row gap-3",
        align === "center" ? "items-center justify-center" : "items-start justify-start",
        className,
      )}
    >
      <Button size="lg" className="gap-1.5 h-11 px-6" asChild>
        <Link to={primary.to}>
          {primary.label} <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
      {secondary && (
        <Button size="lg" variant="outline" className="h-11 px-6" asChild>
          <Link to={secondary.to}>{secondary.label}</Link>
        </Button>
      )}
    </div>
  );
}
