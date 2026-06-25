import { Button } from "@/components/ui/button";
import { useSeedAssurewaySample } from "@/hooks/seed/useSeedAssurewaySample";
import { Loader2, Download, RotateCw } from "lucide-react";

export function SeedAssurewayButton({
  variant = "outline" as const,
  hasExistingAssureway = false,
}: {
  variant?: "default" | "outline" | "secondary";
  hasExistingAssureway?: boolean;
}) {
  const seed = useSeedAssurewaySample();
  const label = hasExistingAssureway ? "Re-sync Assureway" : "Load Assureway client";
  const Icon = hasExistingAssureway ? RotateCw : Download;

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={() => seed.mutate()}
      disabled={seed.isPending}
      aria-label={label}
      data-testid="seed-assureway-button"
    >
      {seed.isPending ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
      )}
      {seed.isPending ? "Loading client…" : label}
    </Button>
  );
}
