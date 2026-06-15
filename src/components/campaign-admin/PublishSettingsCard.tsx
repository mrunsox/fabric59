/**
 * Publish settings card — admin surface for the canonical campaign detail.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, Copy, RefreshCw, ExternalLink, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  useCampaignPublishConfig,
  useUpdateCampaignPublishConfig,
  useRegeneratePublishToken,
} from "@/hooks/useCampaignPublishConfig";
import {
  buildEmbedUrl,
  buildIframeSnippet,
} from "@/lib/campaign-publish/publishConfig";
import type { PublishAccessMode, PublishTheme } from "@/lib/campaign-publish/types";
import { SUPPORTED_EMBED_PARAMS } from "@/lib/campaign-publish/types";

interface Props {
  campaignId: string;
  workspaceId: string;
}

export function PublishSettingsCard({ campaignId, workspaceId }: Props) {
  const { data: config, isLoading } = useCampaignPublishConfig(campaignId);
  const update = useUpdateCampaignPublishConfig(campaignId);
  const regen = useRegeneratePublishToken(campaignId);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = useMemo(
    () =>
      buildEmbedUrl({
        origin,
        campaignId,
        token: config?.access === "token" ? config.token : null,
      }),
    [origin, campaignId, config?.access, config?.token],
  );
  const snippet = useMemo(() => buildIframeSnippet({ embedUrl: url }), [url]);

  if (isLoading || !config) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Publish</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  const copy = (val: string, label: string) =>
    navigator.clipboard?.writeText(val).then(
      () => toast.success(`${label} copied`),
      () => toast.error("Copy failed"),
    );

  return (
    <Card data-testid="publish-settings-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" /> Publish
        </CardTitle>
        <Badge variant={config.enabled ? "default" : "secondary"}>
          {config.enabled ? "Published" : "Unpublished"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label className="text-sm">Publishing enabled</Label>
            <p className="text-xs text-muted-foreground">
              When on, this campaign is reachable at its public embed URL.
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(v) => update.mutate({ enabled: v })}
            data-testid="publish-enabled-toggle"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Access mode</Label>
            <Select
              value={config.access}
              onValueChange={(v) => update.mutate({ access: v as PublishAccessMode })}
            >
              <SelectTrigger data-testid="publish-access-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public link</SelectItem>
                <SelectItem value="token">Token-gated link</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Token gating is convenience protection, not strong authorization.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Theme</Label>
            <Select
              value={config.theme}
              onValueChange={(v) => update.mutate({ theme: v as PublishTheme })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {config.access === "token" && (
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs flex items-center gap-1.5">
                <KeyRound className="h-3 w-3" /> Access token
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const res = await regen.mutateAsync();
                  setRevealedToken(res.token);
                }}
                disabled={regen.isPending}
                data-testid="regen-token-btn"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
              </Button>
            </div>
            {revealedToken ? (
              <div className="space-y-1.5">
                <Input
                  readOnly
                  value={revealedToken}
                  className="font-mono text-xs"
                  data-testid="revealed-token"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <p className="text-[11px] text-muted-foreground">
                  Copy now — this is the only time the token will be displayed.
                  Regenerate if it's lost or leaked.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Token stored. Click Regenerate to issue a new one and view it.
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">Embed URL</Label>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={config.enabled ? url : "(publish to generate URL)"}
              className="font-mono text-xs"
              data-testid="embed-url-input"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => copy(url, "Embed URL")}
              disabled={!config.enabled}
              data-testid="copy-url-btn"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={!config.enabled}
              data-testid="preview-embed-btn"
            >
              <a
                href={`/w/${workspaceId}/campaigns/${campaignId}/embed-preview${
                  config.access === "token" && config.token
                    ? `?t=${encodeURIComponent(config.token)}`
                    : ""
                }`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Five9 iframe snippet</Label>
          <pre
            className="text-[11px] bg-muted/40 rounded-md p-2 overflow-x-auto font-mono"
            data-testid="iframe-snippet"
          >
            {snippet}
          </pre>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copy(snippet, "Iframe snippet")}
            disabled={!config.enabled}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy snippet
          </Button>
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            Supported query parameters
          </summary>
          <ul className="mt-2 space-y-0.5 pl-4 list-disc">
            {SUPPORTED_EMBED_PARAMS.filter((p) => p !== "t").map((p) => (
              <li key={p}>
                <code className="font-mono">{p}</code>
              </li>
            ))}
            <li>
              <code className="font-mono">t</code> — access token (only when access
              mode is "token")
            </li>
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
