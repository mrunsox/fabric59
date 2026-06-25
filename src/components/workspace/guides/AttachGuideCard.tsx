import { Link } from "react-router-dom";
import { BookOpen, Library } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceGuideList, useAttachGuide } from "@/hooks/useGuideAttachments";

type Props = {
  workspaceId: string;
  scope: "campaign" | "client";
  scopeId: string;
};

const NONE = "__none__";

/**
 * Attach a workspace guide to a campaign or client.
 * Lists guides not currently attached elsewhere on the same scope; current
 * attachment is selectable to unset.
 */
export function AttachGuideCard({ workspaceId, scope, scopeId }: Props) {
  const { data: guides = [], isLoading } = useWorkspaceGuideList();
  const attach = useAttachGuide();

  const currentlyAttached = guides.filter((g) =>
    scope === "campaign" ? g.campaign_id === scopeId : g.client_id === scopeId,
  );
  const available = guides.filter((g) => {
    if (scope === "campaign") return !g.campaign_id || g.campaign_id === scopeId;
    return !g.client_id || g.client_id === scopeId;
  });

  const selected = currentlyAttached[0]?.id ?? NONE;

  function onChange(value: string) {
    const newGuideId = value === NONE ? null : value;
    // Detach any currently attached
    currentlyAttached.forEach((g) => {
      if (g.id !== newGuideId) {
        attach.mutate({
          guideId: g.id,
          ...(scope === "campaign" ? { campaignId: null } : { clientId: null }),
        });
      }
    });
    if (newGuideId) {
      attach.mutate({
        guideId: newGuideId,
        ...(scope === "campaign" ? { campaignId: scopeId } : { clientId: scopeId }),
      });
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5" /> Attached guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          The attached guide is what agents follow in the cockpit for this {scope}.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selected} onValueChange={onChange} disabled={attach.isPending || isLoading}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Select a guide" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— None —</SelectItem>
              {available.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name} <span className="text-muted-foreground">({g.status})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline" size="sm">
            <Link to={`/w/${workspaceId}/guide`}>
              <Library className="h-3.5 w-3.5 mr-1" /> Campaign guide
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
