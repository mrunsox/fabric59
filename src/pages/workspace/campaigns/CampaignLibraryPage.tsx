import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Link2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { BlueprintFileUpload } from "@/components/campaigns/BlueprintFileUpload";
import { useWorkspaceCampaign } from "@/hooks/useWorkspaceCampaigns";
import {
  useCampaignLibrarySources,
  useAddCampaignLibrarySource,
  useDeleteCampaignLibrarySource,
} from "@/hooks/useCampaignLibrary";

export default function CampaignLibraryPage() {
  const { workspaceId, campaignId } = useParams<{ workspaceId: string; campaignId: string }>();
  const { data: campaign } = useWorkspaceCampaign(campaignId);
  const { data: sources = [], isLoading } = useCampaignLibrarySources(campaignId);
  const add = useAddCampaignLibrarySource(campaignId);
  const del = useDeleteCampaignLibrarySource();

  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [textTitle, setTextTitle] = useState("");

  async function addUrl() {
    if (!url.trim()) return;
    await add.mutateAsync({
      kind: "url_crawl",
      title: url.trim(),
      uri: url.trim(),
    });
    setUrl("");
  }

  async function addText() {
    if (!text.trim()) return;
    await add.mutateAsync({
      kind: "paste_text",
      title: textTitle.trim() || "Pasted note",
      content: text.trim(),
    });
    setText("");
    setTextTitle("");
  }

  async function handleFileExtracted(extracted: string, fileName?: string) {
    await add.mutateAsync({
      kind: "upload_doc",
      title: fileName || "Uploaded document",
      content: extracted,
      metadata: { filename: fileName ?? null },
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/w/${workspaceId}/campaigns/${campaignId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to campaign
          </Link>
        </Button>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Campaign library</p>
        <h1 className="text-2xl font-semibold">{campaign?.name ?? "Library"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Knowledge base for this campaign. The AI fetches answers from these sources during calls
          — isolated to this campaign only.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Upload a document</CardTitle>
          </CardHeader>
          <CardContent>
            <BlueprintFileUpload
              onTextExtracted={handleFileExtracted}
              accept=".pdf,.docx,.doc,.txt,.md"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add a URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={add.isPending}
            />
            <Button size="sm" onClick={addUrl} disabled={!url.trim() || add.isPending} className="w-full">
              <Link2 className="h-3.5 w-3.5 mr-1.5" /> Add URL
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Paste text</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Title (optional)"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              disabled={add.isPending}
            />
            <Textarea
              placeholder="Paste FAQ, policy, script snippet…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              disabled={add.isPending}
            />
            <Button size="sm" onClick={addText} disabled={!text.trim() || add.isPending} className="w-full">
              Add note
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sources ({sources.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading sources…
            </p>
          ) : sources.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No sources yet"
              description="Upload a doc, add a URL, or paste text to start building this campaign's knowledge base."
            />
          ) : (
            <ul className="divide-y">
              {sources.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{s.kind}</Badge>
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                      <Badge
                        variant={s.status === "processed" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {s.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => del.mutate(s.id)}
                    disabled={del.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
