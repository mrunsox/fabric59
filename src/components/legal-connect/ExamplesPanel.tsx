import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, ChevronDown, ChevronRight, Sparkles, Filter,
} from "lucide-react";
import { useLegalExamples, useExplainExample } from "@/hooks/useLegalConnect";

const categoryLabels: Record<string, string> = {
  webhook: "Clio Webhooks",
  call_flow: "Five9 Call Flows",
  capability: "MyCase Capabilities",
  transform: "Normalized Transforms",
  review: "Review Queue",
};

const providerColors: Record<string, string> = {
  clio: "bg-primary/15 text-primary border-primary/30",
  five9: "bg-warning/15 text-warning border-warning/30",
  mycase: "bg-success/15 text-success border-success/30",
  fabric59: "bg-accent text-accent-foreground border-border",
};

const capabilityStatusColors: Record<string, string> = {
  supported: "bg-success/15 text-success border-success/30",
  conditional: "bg-warning/15 text-warning border-warning/30",
  unsupported: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function ExamplesPanel() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedExample, setExpandedExample] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const { data: examples, isLoading } = useLegalExamples();
  const explainExample = useExplainExample();

  const providers = ["clio", "five9", "mycase", "fabric59"];

  const filtered = (examples ?? []).filter((e: any) => {
    if (selectedProvider && e.provider !== selectedProvider) return false;
    if (selectedCategory && e.category !== selectedCategory) return false;
    return true;
  });

  const categories = [...new Set((examples ?? []).map((e: any) => e.category as string))];

  const toggleExample = (id: string) => {
    setExpandedExample(expandedExample === id ? null : id);
    setExpandedSection(null);
  };

  const JsonViewer = ({ label, data }: { label: string; data: unknown }) => {
    const isExpanded = expandedSection === label;
    const isEmpty = !data || (typeof data === "object" && Object.keys(data as object).length === 0) || (Array.isArray(data) && data.length === 0);
    if (isEmpty) return null;
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          className="flex items-center gap-2 w-full p-2 text-left hover:bg-muted/50 transition-colors"
          onClick={(e) => { e.stopPropagation(); setExpandedSection(isExpanded ? null : label); }}
        >
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <span className="text-xs font-medium text-foreground">{label}</span>
        </button>
        {isExpanded && (
          <pre className="text-xs bg-muted/30 p-2 overflow-auto max-h-[200px] text-foreground border-t border-border">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Button
          size="sm"
          variant={selectedProvider === null ? "default" : "outline"}
          className="text-xs h-7"
          onClick={() => setSelectedProvider(null)}
        >
          All
        </Button>
        {providers.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={selectedProvider === p ? "default" : "outline"}
            className="text-xs h-7 capitalize"
            onClick={() => setSelectedProvider(p)}
          >
            {p === "five9" ? "Five9" : p === "fabric59" ? "Fabric59" : p.charAt(0).toUpperCase() + p.slice(1)}
          </Button>
        ))}
        <span className="text-muted-foreground text-xs mx-2">|</span>
        <Button
          size="sm"
          variant={selectedCategory === null ? "secondary" : "ghost"}
          className="text-xs h-7"
          onClick={() => setSelectedCategory(null)}
        >
          All Categories
        </Button>
        {categories.map((c: string) => (
          <Button
            key={c}
            size="sm"
            variant={selectedCategory === c ? "secondary" : "ghost"}
            className="text-xs h-7"
            onClick={() => setSelectedCategory(c)}
          >
            {categoryLabels[c] ?? c}
          </Button>
        ))}
      </div>

      {/* Examples */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center space-y-2">
              <BookOpen className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No examples match the current filter</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((ex: any) => (
            <Card
              key={ex.id}
              className={`cursor-pointer transition-colors ${expandedExample === ex.id ? "border-primary/40" : "hover:border-primary/20"}`}
              onClick={() => toggleExample(ex.id)}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {expandedExample === ex.id ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <CardTitle className="text-sm truncate">{ex.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <Badge variant="outline" className={`text-[10px] ${providerColors[ex.provider] ?? ""}`}>
                      {ex.provider}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {categoryLabels[ex.category] ?? ex.category}
                    </Badge>
                    {ex.capability_check && (
                      <Badge variant="outline" className={`text-[10px] ${capabilityStatusColors[ex.capability_check.status] ?? ""}`}>
                        {ex.capability_check.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-xs ml-6">{ex.description}</CardDescription>
              </CardHeader>

              {expandedExample === ex.id && (
                <CardContent className="pt-0 px-4 pb-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <JsonViewer label="Raw Payload" data={ex.raw_payload} />
                  <JsonViewer label="Normalized Event" data={ex.normalized_event} />
                  <JsonViewer label="Policy Decision" data={ex.policy_decision} />
                  <JsonViewer label="Sync Jobs Emitted" data={ex.sync_jobs_emitted} />
                  <JsonViewer label="Review Triggers" data={ex.review_triggers} />
                  <JsonViewer label="Capability Check" data={ex.capability_check} />
                  <JsonViewer label="Five9 Input" data={ex.five9_input} />

                  {ex.tags && ex.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      {ex.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => explainExample.mutate(ex.id)}
                      disabled={explainExample.isPending}
                    >
                      <Sparkles className="h-3 w-3 mr-1.5" />
                      {explainExample.isPending ? "Explaining..." : "Explain with AI"}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
