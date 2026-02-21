import { cn } from "@/lib/utils";

interface Fabric59IconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Fabric59Icon({ className, size = "md" }: Fabric59IconProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-9 w-9",
    lg: "h-12 w-12",
  };

  return (
    <img
      src="/fabric59-icon.svg"
      alt="Fabric59"
      className={cn(sizeClasses[size], "rounded", className)}
    />
  );
}
