import { cn } from "@/lib/utils";
import fabric59Wordmark from "@/assets/fabric59-wordmark.png";

interface Fabric59WordmarkProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Fabric59Wordmark({ className, size = "md" }: Fabric59WordmarkProps) {
  const sizeClasses = {
    sm: "h-8",
    md: "h-10",
    lg: "h-14",
    xl: "h-20",
  };

  return (
    <div className={cn("flex items-center", className)}>
      <span className={cn(
        "font-black tracking-tighter text-foreground",
        size === "sm" && "text-xl",
        size === "md" && "text-2xl",
        size === "lg" && "text-4xl",
        size === "xl" && "text-6xl"
      )}>
        Fabric59
      </span>
    </div>
  );
}
