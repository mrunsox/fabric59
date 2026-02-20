import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Integration } from "@/data/integrations-catalog";

interface IntegrationCardProps {
  integration: Integration;
  onSelect: (integration: Integration) => void;
}

const statusConfig = {
  available: { label: "Available", className: "bg-success/10 text-success border-success/30" },
  coming_soon: { label: "Coming Soon", className: "bg-muted text-muted-foreground border-border" },
  beta: { label: "Beta", className: "bg-warning/10 text-warning border-warning/30" },
};

export function IntegrationCard({ integration, onSelect }: IntegrationCardProps) {
  const Icon = integration.icon;
  const status = statusConfig[integration.status];

  return (
    <Card
      className="group relative flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30"
      onClick={() => onSelect(integration)}
    >
      <CardContent className="flex-1 pt-6 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <Badge variant="outline" className={cn("text-[10px] font-medium", status.className)}>
            {status.label}
          </Badge>
        </div>

        <h3 className="font-semibold text-sm text-foreground mb-1 leading-tight">
          {integration.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {integration.description}
        </p>

        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-[10px] font-normal">
            {integration.apiType}
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {integration.authMethod}
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(integration);
          }}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
