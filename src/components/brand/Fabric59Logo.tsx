import { cn } from "@/lib/utils";
import { Fabric59Icon } from "./Fabric59Icon";

interface Fabric59LogoProps {
  className?: string;
  showIcon?: boolean;
  iconSize?: "sm" | "md" | "lg";
}

export function Fabric59Logo({ className, showIcon = true, iconSize = "md" }: Fabric59LogoProps) {
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
