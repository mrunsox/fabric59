import { useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import Papa from "papaparse";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  FileText,
  Type,
  MessageSquare,
  Globe,
  Loader2,
  Table as TableIcon,
  ArrowLeft,
  ChevronRight,
  Inbox,
  Folder,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  useBbSources,
  useBbIngestPaste,
  useBbIngestUpload,
  useBbIngestCsv,
  useBbIngestFaq,
  type BbSourceRow,
} from "@/hooks/useBusinessBrain";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";
import {
  autoMapHeaders,
  normalizeRow,
  type CsvField,
  type CsvDirectoryRow,
} from "@/lib/business-brain/csvParser";
import { parseFaqText } from "@/lib/business-brain/faqParser";
import {
  BrainPanel,
  BrainTable,
  BrainBadge,
  type BrainBadgeTone,
} from "@/components/business-brain/ui";
import { BbStateBlock } from "@/components/business-brain/BbStateBlock";

const STATUS_META: Record<
  BbSourceRow["status"],
  { label: string; tone: BrainBadgeTone }
> = {
  pending: { label: "Pending", tone: "muted" },
  processing: { label: "Processing", tone: "warn" },
  processed: { label: "Processed", tone: "ok" },
  failed: { label: "Failed", tone: "bad" },
  superseded: { label: "Superseded", tone: "muted" },
};

function StatusPill({ status }: { status: BbSourceRow["status"] }) {
  const e = STATUS_META[status];
  return <BrainBadge tone={e.tone}>{e.label}</BrainBadge>;
}

const KIND_LABEL: Record<BbSourceRow["kind"], string> = {
  upload_doc: "Document",
  paste_text: "Pasted text",
  paste_faq: "Pasted FAQ",
  upload_csv: "Team directory (CSV)",
  url_crawl: "URL",
};

const ALL = "__all__";
const NONE = "__none__";

// selection: undefined = index/grid; null = workspace-wide; string = campaign id
type Selection = undefined | null | string;

const WORKSPACE_KEY = "__workspace__";

export default function KnowledgeBinPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: sources = [], isLoading } = useBbSources(workspaceId ?? null);
  const { data: campaigns = [] } = useWorkspaceCampaigns();
  const [addOpen, setAddOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>(undefined);

  const campaignNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of campaigns) map.set(c.id, c.name);
    return map;
  }, [campaigns]);

  // Group sources by campaign bucket
  const sourcesByCampaign = useMemo(() => {
    const map = new Map<string, BbSourceRow[]>();
    map.set(WORKSPACE_KEY, []);
    for (const c of campaigns) map.set(c.id, []);
    for (const s of sources) {
      const key = s.campaign_id ?? WORKSPACE_KEY;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [sources, campaigns]);

  if (selection !== undefined) {
    const key = selection ?? WORKSPACE_KEY;
    const list = (sourcesByCampaign.get(key) ?? []).slice().sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
    const heading = selection ? campaignNameById.get(selection) ?? "Campaign" : "Workspace-wide";

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelection(undefined)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> All campaigns
            </Button>
            <div>
              <h2 className="text-base font-semibold tracking-tight">{heading}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {selection
                  ? "Sources here are isolated to this campaign's AI retrieval."
                  : "Sources available to every campaign in this workspace."}
              </p>
            </div>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Add source
              </Button>
            </DialogTrigger>
            <AddSourceDialog
              workspaceId={workspaceId ?? ""}
              defaultCampaignId={selection ?? null}
              lockCampaign
              onClose={() => setAddOpen(false)}
            />
          </Dialog>
        </div>

        {isLoading ? (
          <BrainPanel>
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading sources…
            </div>
          </BrainPanel>
        ) : list.length === 0 ? (
          <BbStateBlock
            kind="empty"
            title="No sources yet."
            description={
              selection
                ? "Add knowledge that should only be used for this campaign."
                : "Add a document, paste FAQ content, or upload a team directory CSV."
            }
            action={
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add source
              </Button>
            }
          />
        ) : (
          <BrainPanel className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <BrainTable density="lg">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Version</th>
                    <th>Imported</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{s.title}</span>
                        </div>
                        {s.status_message ? (
                          <div className="mt-0.5 pl-6 text-xs text-muted-foreground">
                            {s.status_message}
                          </div>
                        ) : null}
                      </td>
                      <td className="text-xs text-muted-foreground">{KIND_LABEL[s.kind]}</td>
                      <td><StatusPill status={s.status} /></td>
                      <td className="text-muted-foreground">
                        <span className="text-foreground">v{s.version}</span>
                        {s.prior_source_id ? (
                          <span className="ml-1 text-xs">(supersedes prior)</span>
                        ) : null}
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </BrainTable>
            </div>
          </BrainPanel>
        )}
      </div>
    );
  }

  // Index: card grid
  const workspaceList = sourcesByCampaign.get(WORKSPACE_KEY) ?? [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Knowledge Base</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Each campaign has its own isolated knowledge. Open a card to add and review the
            documents that power its AI retrieval.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add source
            </Button>
          </DialogTrigger>
          <AddSourceDialog
            workspaceId={workspaceId ?? ""}
            defaultCampaignId={null}
            onClose={() => setAddOpen(false)}
          />
        </Dialog>
      </div>

      {isLoading ? (
        <BrainPanel>
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        </BrainPanel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CampaignCard
            icon={<Inbox className="h-4 w-4" />}
            title="Workspace-wide"
            subtitle="Shared across every campaign"
            sources={workspaceList}
            onClick={() => setSelection(null)}
          />
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              icon={<Folder className="h-4 w-4" />}
              title={c.name}
              subtitle="Campaign-scoped knowledge"
              sources={sourcesByCampaign.get(c.id) ?? []}
              onClick={() => setSelection(c.id)}
            />
          ))}
          {campaigns.length === 0 ? (
            <Card className="flex items-center justify-center border-dashed p-6 text-center text-sm text-muted-foreground">
              Create a campaign to give it its own knowledge base.
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

function CampaignCard({
  icon,
  title,
  subtitle,
  sources,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  sources: BbSourceRow[];
  onClick: () => void;
}) {
  const ready = sources.filter((s) => s.status === "processed").length;
  const processing = sources.filter(
    (s) => s.status === "processing" || s.status === "pending",
  ).length;
  const failed = sources.filter((s) => s.status === "failed").length;
  const lastUpdated = sources.reduce<string | null>((acc, s) => {
    return !acc || s.created_at > acc ? s.created_at : acc;
  }, null);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left transition-transform hover:-translate-y-0.5 focus:outline-none"
    >
      <Card className="h-full p-4 transition-shadow group-hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-muted p-1.5 text-muted-foreground">{icon}</span>
            <div>
              <div className="text-sm font-semibold text-foreground">{title}</div>
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {sources.length}
          </span>
          <span className="text-xs text-muted-foreground">
            source{sources.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ready > 0 ? <BrainBadge tone="ok">{ready} ready</BrainBadge> : null}
          {processing > 0 ? <BrainBadge tone="warn">{processing} processing</BrainBadge> : null}
          {failed > 0 ? <BrainBadge tone="bad">{failed} failed</BrainBadge> : null}
          {sources.length === 0 ? (
            <BrainBadge tone="muted">No sources yet</BrainBadge>
          ) : null}
        </div>
        {lastUpdated ? (
          <div className="mt-3 text-xs text-muted-foreground">
            Last update {new Date(lastUpdated).toLocaleDateString()}
          </div>
        ) : null}
      </Card>
    </button>
  );
}


type Tab = "upload" | "text" | "faq" | "csv" | "url";

function AddSourceDialog({
  workspaceId,
  defaultCampaignId,
  lockCampaign = false,
  onClose,
}: {
  workspaceId: string;
  defaultCampaignId: string | null;
  lockCampaign?: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("upload");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [campaignId, setCampaignId] = useState<string>(defaultCampaignId ?? NONE);
  const { data: campaigns = [] } = useWorkspaceCampaigns();
  const ingestPaste = useBbIngestPaste();
  const ingestUpload = useBbIngestUpload();
  const ingestCsv = useBbIngestCsv();
  const ingestFaq = useBbIngestFaq();

  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRaw, setCsvRaw] = useState<Record<string, unknown>[]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, CsvField>>({});

  const submitting =
    ingestPaste.isPending ||
    ingestUpload.isPending ||
    ingestCsv.isPending ||
    ingestFaq.isPending;

  const resolvedCampaignId = campaignId === NONE ? null : campaignId;

  // FAQ live-parse preview
  const faqPairs = useMemo(() => parseFaqText(text), [text]);

  const normalizedRows: CsvDirectoryRow[] = useMemo(
    () => csvRaw.map((r) => normalizeRow(r, csvMapping)),
    [csvRaw, csvMapping],
  );

  function onCsvFile(f: File | null) {
    setCsvFile(f);
    setCsvHeaders([]);
    setCsvRaw([]);
    setCsvMapping({});
    if (!f) return;
    Papa.parse<Record<string, unknown>>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        setCsvHeaders(headers);
        setCsvRaw(result.data);
        setCsvMapping(autoMapHeaders(headers));
      },
    });
  }

  async function handleSubmit() {
    if (!workspaceId) return;
    if (tab === "upload") {
      if (!file) return;
      await ingestUpload.mutateAsync({ workspaceId, file, campaignId: resolvedCampaignId });
    } else if (tab === "csv") {
      if (!csvFile || normalizedRows.length === 0) return;
      await ingestCsv.mutateAsync({
        workspaceId,
        file: csvFile,
        title: title.trim() || csvFile.name,
        rows: normalizedRows,
        mapping: csvMapping,
        campaignId: resolvedCampaignId,
      });
    } else if (tab === "faq") {
      const trimmed = text.trim();
      if (!trimmed) return;
      await ingestFaq.mutateAsync({
        workspaceId,
        title: title.trim() || "Pasted FAQ",
        text: trimmed,
        pairs: faqPairs,
        campaignId: resolvedCampaignId,
      });
    } else {
      const trimmed = text.trim();
      if (!trimmed) return;
      await ingestPaste.mutateAsync({
        workspaceId,
        kind: "paste_text",
        title: title.trim() || "Pasted text",
        text: trimmed,
        campaignId: resolvedCampaignId,
      });
    }
    onClose();
    setTitle("");
    setText("");
    setFile(null);
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRaw([]);
    setCsvMapping({});
  }

  const FIELD_OPTIONS: CsvField[] = [
    "name",
    "role",
    "department",
    "phone",
    "extension",
    "email",
    "label",
    "notes",
    "ignore",
  ];

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Add source</DialogTitle>
        <DialogDescription>
          Sources are ingested, chunked, and extracted into suggested facts you review.
        </DialogDescription>
      </DialogHeader>

      {lockCampaign ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Attaching to{" "}
          <span className="font-medium text-foreground">
            {defaultCampaignId
              ? campaigns.find((c) => c.id === defaultCampaignId)?.name ?? "this campaign"
              : "Workspace-wide"}
          </span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="bb-campaign">Attach to campaign</Label>
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger id="bb-campaign">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Workspace-wide (no campaign)</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            When attached, this source is only retrieved during calls for the selected campaign.
          </p>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="upload"><FileText className="mr-1.5 h-4 w-4" /> Upload</TabsTrigger>
          <TabsTrigger value="text"><Type className="mr-1.5 h-4 w-4" /> Paste text</TabsTrigger>
          <TabsTrigger value="faq"><MessageSquare className="mr-1.5 h-4 w-4" /> Paste FAQ</TabsTrigger>
          <TabsTrigger value="csv"><TableIcon className="mr-1.5 h-4 w-4" /> Team CSV</TabsTrigger>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="contents">
                <TabsTrigger value="url" disabled>
                  <Globe className="mr-1.5 h-4 w-4" /> URL
                </TabsTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent>URL crawl ships in a later slice.</TooltipContent>
          </Tooltip>
        </TabsList>
        <TabsContent value="upload" className="space-y-3 pt-4">
          <Label htmlFor="bb-file">File</Label>
          <Input
            id="bb-file"
            type="file"
            accept=".txt,.md,.csv,.pdf,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">
            Plain text and Markdown extract immediately. PDF/DOCX text extraction ships in the next slice; the file is stored either way.
          </p>
        </TabsContent>
        <TabsContent value="text" className="space-y-3 pt-4">
          <Label htmlFor="bb-title">Title</Label>
          <Input id="bb-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Intake policy snapshot" />
          <Label htmlFor="bb-text">Text</Label>
          <Textarea id="bb-text" value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder="Paste business content here…" />
        </TabsContent>
        <TabsContent value="faq" className="space-y-3 pt-4">
          <Label htmlFor="bb-faq-title">Title</Label>
          <Input id="bb-faq-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Website FAQ — billing" />
          <Label htmlFor="bb-faq">FAQ content</Label>
          <Textarea
            id="bb-faq"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={"Q: What are your hours?\nA: Mon-Fri 9-5\n\nQ: Do you take cards?\nA: Yes."}
          />
          <p className="text-xs text-muted-foreground">
            Supports <code>Q:/A:</code>, numbered, and blank-line formats.{" "}
            {faqPairs.length >= 2 ? (
              <span className="font-medium text-emerald-700">
                {faqPairs.length} pair(s) detected — will skip AI and ingest directly.
              </span>
            ) : (
              <span>
                {faqPairs.length} pair(s) detected — AI will extract any FAQs from the prose.
              </span>
            )}
          </p>
        </TabsContent>
        <TabsContent value="csv" className="space-y-3 pt-4">
          <Label htmlFor="bb-csv-title">Title</Label>
          <Input
            id="bb-csv-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Q3 firm directory"
          />
          <Label htmlFor="bb-csv-file">CSV file</Label>
          <Input
            id="bb-csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => onCsvFile(e.target.files?.[0] ?? null)}
          />
          {csvHeaders.length > 0 ? (
            <div className="space-y-2 rounded border bg-muted/30 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Column mapping ({csvRaw.length} rows detected)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {csvHeaders.map((h) => (
                  <div key={h} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{h}</span>
                    <Select
                      value={csvMapping[h] ?? "ignore"}
                      onValueChange={(v) =>
                        setCsvMapping((prev) => ({ ...prev, [h]: v as CsvField }))
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Destination contacts are only extracted from labeled non-person rows (e.g. "Billing Line").
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Expected columns: name, role, department, phone, extension, email, label, notes. Headers are auto-detected.
            </p>
          )}
        </TabsContent>
        <TabsContent value="url" className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            URL crawl is not available in this slice. Paste relevant page content instead.
          </p>
        </TabsContent>
      </Tabs>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Ingest
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
