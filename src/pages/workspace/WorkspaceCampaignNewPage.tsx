import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Info, Sparkles, Megaphone, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import CampaignIntakePage from "@/pages/admin/CampaignIntakePage";
import { useWorkspaceClients } from "@/hooks/useWorkspaceClients";
import { useCreateWorkspaceCampaign } from "@/hooks/useWorkspaceCampaigns";
import type { CampaignIntakeData } from "@/types/campaign";

/**
 * Canonical workspace campaign creator.
 *
 * Default view = Quick Start: name + (optional) client → creates a draft
 * campaign and lands the user on the canonical detail page where the
 * Readiness Checklist guides them through guide / decision tree / intake
 * form / notifications. This matches the canonical scope's "creating a
 * campaign is simple" requirement.
 *
 * Advanced view = the legacy 10-section CampaignIntakePage with Five9
 * provisioning. Reachable via the "Advanced setup" tab or via `?mode=advanced`
 * (the AI blueprint handoff continues to land here automatically because it
 * needs the structured intake schema).
 *
 * AI handoff:
 *   AIBlueprintBuilder navigates here with router state
 *   `{ prefill: Partial<CampaignIntakeData>, source: "ai-blueprint" }`
 *   and `?source=ai`. We force `mode=advanced` for that path so the prefill
 *   targets the full intake form (only the advanced page reads `prefill`).
 */
export default function WorkspaceCampaignNewPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const state = (location.state ?? {}) as {
    prefill?: Partial<CampaignIntakeData>;
    source?: string;
  };
  const isAiPrefill = state.source === "ai-blueprint" && !!state.prefill;
  const initialMode = params.get("mode") === "advanced" || isAiPrefill ? "advanced" : "quick";
  const [mode, setMode] = useState<"quick" | "advanced">(initialMode);

  useEffect(() => {
    if (isAiPrefill) {
      // eslint-disable-next-line no-console
      console.info("[ai-handoff] workspace campaign intake received prefill", {
        workspaceId,
        keys: Object.keys(state.prefill ?? {}),
      });
    }
  }, [isAiPrefill, state.prefill, workspaceId]);

  return (
    <div className="space-y-4 animate-fade-in" data-testid="workspace-campaign-new">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/w/${workspaceId}/campaigns`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to campaigns
          </Link>
        </Button>
        <div className="flex items-center gap-1 rounded-md border bg-card p-0.5 text-xs">
          <Button
            size="sm"
            variant={mode === "quick" ? "default" : "ghost"}
            className="h-7 px-2.5"
            onClick={() => setMode("quick")}
            data-testid="mode-quick"
          >
            <Megaphone className="h-3.5 w-3.5 mr-1" /> Quick start
          </Button>
          <Button
            size="sm"
            variant={mode === "advanced" ? "default" : "ghost"}
            className="h-7 px-2.5"
            onClick={() => setMode("advanced")}
            data-testid="mode-advanced"
          >
            <Settings2 className="h-3.5 w-3.5 mr-1" /> Advanced setup
          </Button>
        </div>
      </div>

      {isAiPrefill && (
        <div
          data-testid="ai-prefill-banner"
          className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground flex items-start gap-2"
        >
          <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
          <span>
            AI-seeded intake. Fields below were pre-populated from your uploaded
            documents — review every section before saving.
          </span>
        </div>
      )}

      {mode === "quick" ? (
        <QuickStartCampaign workspaceId={workspaceId!} onSwitchAdvanced={() => setMode("advanced")} />
      ) : (
        <>
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Advanced setup runs the legacy 10-section intake, including Five9 provisioning,
              dispositions, schedule, and skill assignment. Most campaigns can start with
              <button
                type="button"
                onClick={() => setMode("quick")}
                className="ml-1 underline underline-offset-2 hover:text-foreground"
              >
                Quick start
              </button>
              {" "}and add operational config later.
            </span>
          </div>
          <CampaignIntakePage />
        </>
      )}
    </div>
  );
}

function QuickStartCampaign({
  workspaceId,
  onSwitchAdvanced,
}: {
  workspaceId: string;
  onSwitchAdvanced: () => void;
}) {
  const navigate = useNavigate();
  const { data: clients = [], isLoading: clientsLoading } = useWorkspaceClients();
  const create = useCreateWorkspaceCampaign();
  const NONE = "__none__";

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<string>(NONE);

  const canSubmit = name.trim().length > 0 && !create.isPending;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const created = await create.mutateAsync({
      name: name.trim(),
      clientId: clientId === NONE ? null : clientId,
    });
    navigate(`/w/${workspaceId}/campaigns/${created.id}`);
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">New campaign</CardTitle>
        <p className="text-xs text-muted-foreground">
          Give the campaign a name. You can add the firm guide, decision tree, intake form, and
          notifications from the campaign page once it's created.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="qs-name">Campaign name</Label>
            <Input
              id="qs-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Law — Inbound intake"
              autoFocus
              data-testid="quick-start-name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qs-client">Client (optional)</Label>
            <Select value={clientId} onValueChange={setClientId} disabled={clientsLoading}>
              <SelectTrigger id="qs-client" data-testid="quick-start-client">
                <SelectValue placeholder="Pick a client or leave unlinked" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— No client yet —</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              You can link a client later from the campaign page.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onSwitchAdvanced}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Need Five9 provisioning, dispositions, or skills? Use Advanced setup →
            </button>
            <Button type="submit" disabled={!canSubmit} data-testid="quick-start-submit">
              {create.isPending ? "Creating…" : "Create campaign"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
