import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileStack, GitFork, Search } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import {
  useWorkspaceTemplates,
  useForkTemplate,
  type TemplateKind,
} from "@/hooks/useWorkspaceTemplates";

const KINDS: Array<{ value: TemplateKind | "all"; label: string }> = [
  { value: "all", label: "All kinds" },
  { value: "guide", label: "Guide" },
  { value: "flow", label: "Flow" },
  { value: "campaign", label: "Campaign" },
  { value: "email", label: "Email" },
  { value: "summary", label: "Summary" },
  { value: "prompt", label: "Prompt" },
  { value: "report", label: "Report" },
];

export default function WorkspaceTemplatesPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [kind, setKind] = useState<TemplateKind | "all">("all");
  const [scope, setScope] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: templates = [], isLoading } = useWorkspaceTemplates({ kind });
  const fork = useForkTemplate();

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (scope !== "all" && t.scope_type !== scope) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [templates, scope, search]);

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Templates"
        title="Templates"
        lede="Reusable building blocks — guides, flows, campaigns, emails, summaries, prompts, reports. Inherited from platform and your organization; fork to make a workspace-owned copy."
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={kind} onValueChange={(v) => setKind(v as TemplateKind | "all")}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scopes</SelectItem>
            <SelectItem value="platform">Platform</SelectItem>
            <SelectItem value="org">Organization</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="workspace">Workspace</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">Loading templates…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">
          No templates match these filters. Legacy template tables are mirrored automatically; new canonical
          templates can be created by forking an existing one.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((t) => (
            <Card key={t.id} className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/w/${workspaceId}/templates/${t.id}`}
                    className="min-w-0 flex-1"
                  >
                    <CardTitle className="text-base truncate hover:text-primary">{t.name}</CardTitle>
                    {t.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                    )}
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    disabled={fork.isPending}
                    onClick={() => fork.mutate(t)}
                  >
                    <GitFork className="h-3.5 w-3.5" /> Fork
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="outline" className="capitalize text-[10px]">{t.kind}</Badge>
                  <Badge variant="secondary" className="capitalize text-[10px]">{t.scope_type}</Badge>
                  {t.parent_template_id && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <GitFork className="h-3 w-3" /> forked
                    </Badge>
                  )}
                  {t.source_type && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      legacy: {t.source_type}
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
