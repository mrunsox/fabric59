import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeedAssurewaySample } from "@/hooks/seed/useSeedAssurewaySample";

/**
 * One-shot dev/onboarding affordance: provisions the full Assureway
 * "General Inquiry" sample (client + campaign + guide + flow + form +
 * attachment) using only canonical hooks. Idempotent.
 */
export function SeedAssurewayButton({ variant = "outline" as const }: { variant?: "default" | "outline" | "secondary" }) {
  const seed = useSeedAssurewaySample();
  return (
    <Button
      onClick={() => seed.mutate()}
      disabled={seed.isPending}
      variant={variant}
      size="sm"
      data-testid="seed-assureway-button"
    >
      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
      {seed.isPending ? "Loading sample…" : "Load Assureway sample"}
    </Button>
  );
}
