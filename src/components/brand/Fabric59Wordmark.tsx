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
    <img
      src={fabric59Wordmark}
      alt="Fabric59 Integration Hub"
      className={cn(sizeClasses[size], "w-auto object-contain", className)}
    />
  );
}
