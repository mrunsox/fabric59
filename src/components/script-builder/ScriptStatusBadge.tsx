import { Badge } from "@/components/ui/badge";
import { Circle, CircleDot } from "lucide-react";

interface ScriptStatusBadgeProps {
  isLive: boolean;
  hasUnsavedChanges?: boolean;
  version: number;
  className?: string;
}

export function ScriptStatusBadge({ isLive, hasUnsavedChanges, version, className }: ScriptStatusBadgeProps) {
  if (hasUnsavedChanges) {
    return (
      <Badge variant="outline" className={`border-warning/50 bg-warning/10 text-warning ${className}`}>
        <Circle className="h-2 w-2 fill-current mr-1.5 animate-pulse" /> Unsaved Changes
      </Badge>
    );
  }
  if (isLive) {
    return (
      <Badge variant="outline" className={`border-success/50 bg-success/10 text-success ${className}`}>
        <CircleDot className="h-2 w-2 fill-current mr-1.5" /> Live v{version}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className={className}>
      <Circle className="h-2 w-2 mr-1.5" /> Draft v{version}
    </Badge>
  );
}
