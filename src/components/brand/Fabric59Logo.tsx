import { cn } from "@/lib/utils";
import { Fabric59Icon } from "./Fabric59Icon";
import { Fabric59Wordmark } from "./Fabric59Wordmark";

interface Fabric59LogoProps {
  className?: string;
  showIcon?: boolean;
  iconSize?: "sm" | "md" | "lg";
  variant?: "default" | "wordmark" | "icon-only";
}

export function Fabric59Logo({ 
  className, 
  showIcon = true, 
  iconSize = "md",
  variant = "default"
}: Fabric59LogoProps) {
  if (variant === "wordmark") {
    return <Fabric59Wordmark size={iconSize === "lg" ? "lg" : "md"} className={className} />;
  }

  if (variant === "icon-only") {
    return <Fabric59Icon size={iconSize} className={className} />;
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showIcon && <Fabric59Icon size={iconSize} />}
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-foreground">
          Fabric59
        </span>
        <span className="text-xs text-muted-foreground">
          Integration Hub
        </span>
      </div>
    </div>
  );
}
