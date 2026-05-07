import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck, Search, PenLine, Mail, CheckCircle2, XCircle, Loader2, RefreshCw, AlertTriangle, BookOpen,
} from "lucide-react";
import { openGuideDrawer } from "./GuideDrawer";
import { SECTION } from "@/data/legal-connect-guides";
import { cn } from "@/lib/utils";
import {
  useLegalConnections, useLegalTestHistory, useRunTest,
} from "@/hooks/useLegalConnect";
import {
  CHECKLIST_ITEMS, useClientReadiness, useUpdateClientReadiness,
  type ChecklistState,
} from "@/hooks/useClientReadiness";

interface Props {
  clientId: string;
}

type GuidedAction = "runAuthTest" | "runLookupTest" | "runWriteBackTest" | "runEmailOnlyTest";

const PROVIDERS = [
  { value: "clio_grow", label: "Clio Grow" },
  { value: "clio", label: "Clio Manage" },
  { value: "mycase", label: "MyCase" },
  { value: "post_call_email", label: "Post-call email" },
];

const TESTS: { id: GuidedAction; label: string; icon: typeof ShieldCheck; hint: string; checklist?: keyof ChecklistState }[] = [
  { id: "runAuthTest", label: "Test connection", icon: ShieldCheck, hint: "Verify the provider accepts our credentials.", checklist: "auth_valid" },
  { id: "runLookupTest", label: "Test caller lookup", icon: Search, hint: "Find a sample contact (lookup-capable providers only)." },
  { id: "runWriteBackTest", label: "Test note or task write-back", icon: PenLine, hint: "Enqueue a sample write-back through the real adapter.", checklist: "test_call_verified" },
  { id: "runEmailOnlyTest", label: "Test email-only outcome", icon: Mail, hint: "Verify the post-call email path resolves a template.", checklist: "email_templates" },
];

function statusBadge(status?: string) {
  if (status === "passed")
    return <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Passed</Badge>;
  if (status === "failed")
    return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
  return <Badge variant="outline" className="text-[10px]">Not yet run</Badge>;
}

export default function GuidedTestRunner({ clientId }: Props) {
  const { data: connections } = useLegalConnections(clientId);
  const { data: history } = useLegalTestHistory(clientId);
  const { data: readiness } = useClientReadiness(clientId);
  const updateReadiness = useUpdateClientReadiness(clientId);
  const runTest = useRunTest();

  const [provider, setProvider] = useState<string>("clio_grow");
  const [test, setTest] = useState<GuidedAction>("runAuthTest");
  const [search, setSearch] = useState("555-0001");
  const [writeAction, setWriteAction] = useState("note.create");
  const [lastResult, setLastResult] = useState<any>(null);

  const connectedProviders = useMemo(
    () => new Set((connections ?? []).filter((c: any) => c.status === "connected").map((c: any) => c.provider)),
    [connections],
  );

  // Most-recent guided test result per (provider, test_type).
  const lastByKey = useMemo(() => {
    const map = new Map<string, any>();
    for (const row of history ?? []) {
      const r: any = row;
      if (r.test_category !== "guided") continue;
      const cfg = r.test_config ?? {};
      const key = `${cfg.provider ?? "_"}::${r.test_type}`;
      if (!map.has(key)) map.set(key, r);
    }
    return map;
  }, [history]);

  const handleRun = async (overrideProvider?: string, overrideTest?: GuidedAction) => {
    const p = overrideProvider ?? provider;
    const t = overrideTest ?? test;
    const sample: Record<string, unknown> =
      t === "runLookupTest" ? { search_value: search } :
      t === "runWriteBackTest" ? { note: "Test note from guided runner" } :
      t === "runEmailOnlyTest" ? { disposition: "Qualified Lead" } : {};

    const res: any = await runTest.mutateAsync({
      action: t,
      provider: p,
      write_action: writeAction,
      sample,
      client_id: clientId,
    });
    const data = res?.data ?? res;
    setLastResult(data);

    // Auto-tick checklist items when a relevant test passes.
    const def = TESTS.find((x) => x.id === t);
    if (data?.status === "passed" && def?.checklist) {
      const cur: ChecklistState = readiness?.checklist ?? {};
      if (!cur[def.checklist]?.confirmed) {
        await updateReadiness.mutateAsync({
          checklist: { ...cur, [def.checklist]: { confirmed: true, at: new Date().toISOString() } },
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Guided test runner
          </CardTitle>
          <CardDescription className="text-xs">
            Run safe, real-path tests against each connected provider. Passing tests automatically check off matching go-live items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Provider</p>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}{p.value !== "post_call_email" && !connectedProviders.has(p.value) ? " — not connected" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Test</p>
              <Select value={test} onValueChange={(v) => setTest(v as GuidedAction)}>
                <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TESTS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {test === "runLookupTest" && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Sample phone</p>
                <Input className="w-[160px]" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            )}
            {test === "runWriteBackTest" && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Action</p>
                <Select value={writeAction} onValueChange={setWriteAction}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note.create">Add a note</SelectItem>
                    <SelectItem value="task.create">Create follow-up task</SelectItem>
                    <SelectItem value="contact.update">Update contact</SelectItem>
                    <SelectItem value="lead.create">Create intake / lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              size="sm"
              onClick={() => handleRun()}
              disabled={runTest.isPending}
              className="ml-auto"
            >
              {runTest.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              Run test
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{TESTS.find((t) => t.id === test)?.hint}</p>
        </CardContent>
      </Card>

      {/* Provider-by-provider summary cards with last test status + rerun. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PROVIDERS.map((p) => {
          const isEmail = p.value === "post_call_email";
          const isConnected = isEmail || connectedProviders.has(p.value);
          return (
            <Card key={p.value} className={cn(!isConnected && "opacity-60")}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{p.label}</CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {isConnected ? "Available" : "Not connected"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {TESTS.map((t) => {
                  if (t.id === "runLookupTest" && !["clio", "mycase"].includes(p.value)) return null;
                  if (t.id === "runEmailOnlyTest" && !isEmail) return null;
                  if (t.id !== "runEmailOnlyTest" && isEmail) return null;
                  const last = lastByKey.get(`${p.value}::${t.id}`);
                  const Icon = t.icon;
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{t.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {statusBadge(last?.status)}
                        {last?.created_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(last.created_at).toLocaleString()}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2"
                          disabled={runTest.isPending || !isConnected}
                          onClick={() => {
                            setProvider(p.value);
                            setTest(t.id);
                            handleRun(p.value, t.id);
                          }}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Last result detail */}
      {lastResult && (
        <Card className={cn("border", lastResult.status === "passed" ? "border-success/40" : "border-destructive/40")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                {lastResult.status === "passed" ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                Last result — {lastResult.test_type}
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">{lastResult.duration_ms}ms</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {lastResult.status === "failed" && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  {lastResult.detail?.plain_english ?? lastResult.error}
                </p>
                {lastResult.next_step && (
                  <p className="text-xs text-muted-foreground">Next step: {lastResult.next_step}</p>
                )}
              </div>
            )}
            <Separator />
            <pre className="text-[11px] bg-muted/40 rounded p-2 overflow-auto max-h-[260px]">
              {JSON.stringify(lastResult.detail, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
