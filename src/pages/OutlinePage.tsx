import { useState, useCallback } from "react";
import { ArrowLeft, CheckCircle2, Circle, KeyRound, LayoutDashboard, Loader2, Lock, Map, Unlock, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { buildMap, requiredSecrets, type ItemStatus } from "@/data/buildMap";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { SEOHead } from "@/components/seo/SEOHead";

const STORAGE_KEY = "fabric59_tested_features";
const KB_STORAGE_KEY = "fabric59_kb_features";

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === "done") {
    return <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />;
  }
  if (status === "in-progress") {
    return <Loader2 className="h-4 w-4 text-warning animate-spin flex-shrink-0" />;
  }
  return <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
}

export default function OutlinePage() {
  const [tested, setTested] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    buildMap.forEach(cat =>
      cat.items.forEach(item => {
        if (item.tested) defaults[`${cat.name}:${item.name}`] = true;
      })
    );
    try {
      const overrides = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return { ...defaults, ...overrides };
    } catch {
      return defaults;
    }
  });

  const [kbReady, setKbReady] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    buildMap.forEach(cat =>
      cat.items.forEach(item => {
        if (item.kbReady) defaults[`${cat.name}:${item.name}`] = true;
      })
    );
    try {
      const overrides = JSON.parse(localStorage.getItem(KB_STORAGE_KEY) || "{}");
      return { ...defaults, ...overrides };
    } catch {
      return defaults;
    }
  });

  const toggleTested = useCallback((key: string) => {
    setTested((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleKb = useCallback((key: string) => {
    setKbReady((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const allItems = buildMap.flatMap((c) => c.items);
  const total = allItems.length;
  const done = allItems.filter((i) => i.status === "done").length;
  const inProgress = allItems.filter((i) => i.status === "in-progress").length;
  const progressPct = Math.round((done / total) * 100);

  // Sort categories: unfinished first
  const sortedCategories = [...buildMap].sort((a, b) => {
    const aComplete = a.items.every(i => i.status === "done");
    const bComplete = b.items.every(i => i.status === "done");
    if (aComplete === bComplete) return 0;
    return aComplete ? 1 : -1;
  });

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Build Outline — Fabric59 Feature Roadmap"
        description="See every feature planned and built for Fabric59 — the Five9 integration platform for agent lifecycle management and CRM field mapping."
        canonical="https://fabric59.lovable.app/outline"
      />
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Fabric59Icon size="md" className="glow-primary" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Fabric59 Build Outline</h1>
            <p className="text-xs text-muted-foreground">Living map of all planned and built features</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" className="flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Landing</span>
              </Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link to="/admin" className="flex items-center gap-1.5">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Go to Dashboard</span>
              </Link>
            </Button>
            <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-border">
              <Map className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{done} of {total} built</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Overall Progress */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Overall Progress</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {done} done · {inProgress} in progress · {total - done - inProgress} planned
              </p>
            </div>
            <span className="text-2xl font-bold text-primary">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Done
            </span>
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 text-warning" /> In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <Circle className="h-3.5 w-3.5 text-muted-foreground" /> Planned
            </span>
          </div>
        </div>

        {/* Required Secrets */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium text-foreground">Required Secrets and API Keys</p>
            <span className="text-xs text-muted-foreground ml-auto">{requiredSecrets.length} keys</span>
          </div>
          <div className="grid gap-2">
            {requiredSecrets.map((secret) => (
              <div key={secret.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                {secret.isPublic ? (
                  <Unlock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <Lock className="h-4 w-4 text-destructive flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-foreground">{secret.name}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{secret.service}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{secret.description}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {secret.isPublic ? "public" : "private"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        {sortedCategories.map((category) => {
          const catDone = category.items.filter((i) => i.status === "done").length;
          const catTotal = category.items.length;
          const catPct = Math.round((catDone / catTotal) * 100);

          // Sort items within category: untested/incomplete first
          const sortedItems = [...category.items].sort((a, b) => {
            const aKey = `${category.name}:${a.name}`;
            const bKey = `${category.name}:${b.name}`;
            const aComplete = a.status === "done" && !!tested[aKey];
            const bComplete = b.status === "done" && !!tested[bKey];
            if (aComplete === bComplete) return 0;
            return aComplete ? 1 : -1;
          });

          return (
            <div key={category.name} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">{category.name}</h2>
                <span className="text-xs text-muted-foreground">
                  {catDone} / {catTotal}
                </span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${catPct}%` }}
                />
              </div>

              {/* Items */}
              <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                {sortedItems.map((item) => {
                  const testedKey = `${category.name}:${item.name}`;
                  return (
                  <div key={item.name} className="flex items-center gap-3 px-4 py-3">
                    <StatusIcon status={item.status} />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          item.status === "done"
                            ? "text-foreground"
                            : item.status === "in-progress"
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        item.status === "done"
                          ? "bg-success/10 text-success border-success/20"
                          : item.status === "in-progress"
                          ? "bg-warning/10 text-warning border-warning/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {item.status === "in-progress" ? "in progress" : item.status}
                    </span>
                    {/* KB checkbox */}
                    <div className="flex items-center gap-1.5 pl-3 border-l border-border flex-shrink-0">
                      <Checkbox
                        checked={!!kbReady[testedKey]}
                        onCheckedChange={() => toggleKb(testedKey)}
                        aria-label={`Mark ${item.name} KB as ready`}
                      />
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                      <span className="text-xs text-muted-foreground hidden sm:inline">KB</span>
                    </div>
                    {/* Tested checkbox */}
                    <div className="flex items-center gap-1.5 pl-3 border-l border-border flex-shrink-0">
                      <Checkbox
                        checked={!!tested[testedKey]}
                        onCheckedChange={() => toggleTested(testedKey)}
                        aria-label={`Mark ${item.name} as tested`}
                      />
                      <span className="text-xs text-muted-foreground hidden sm:inline">Tested</span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
