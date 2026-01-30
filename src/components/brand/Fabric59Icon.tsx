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
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizeClasses[size], className)}
    >
      {/* Background rounded square */}
      <rect
        width="40"
        height="40"
        rx="8"
        className="fill-primary"
      />
      
      {/* Woven F pattern */}
      <path
        d="M12 10h12a2 2 0 012 2v2a2 2 0 01-2 2H16v4h6a2 2 0 012 2v2a2 2 0 01-2 2h-6v6a2 2 0 01-2 2h-2a2 2 0 01-2-2V12a2 2 0 012-2z"
        className="fill-primary-foreground"
        opacity="0.95"
      />
      
      {/* 59 subtle integration - small text */}
      <text
        x="28"
        y="34"
        className="fill-primary-foreground"
        fontSize="8"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
        opacity="0.7"
      >
        59
      </text>
    </svg>
  );
}
