/**
 * Placeholder full-screen agent-experience preview route.
 * Real implementation lands in a later slice and reuses the canonical
 * call-runner primitives byte-for-byte.
 */
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AscPreviewPage() {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  return (
    <div className="space-y-4 p-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/w/${workspaceId}/campaigns/new/assisted`}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to wizard
        </Link>
      </Button>
      <div
        data-testid="asc-preview-placeholder"
        className="rounded-md border border-dashed bg-muted/40 p-8 text-sm text-muted-foreground"
      >
        Agent experience preview lands in a later slice. It will mount the
        canonical call-runner primitives with the same reducer the real runner
        uses — no separate interpretation.
      </div>
    </div>
  );
}
