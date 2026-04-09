import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles, Play, Eye, Users, Headphones, Shield, Map, CheckCircle2,
  AlertTriangle, RotateCcw, Megaphone, Plug, TestTube2,
} from "lucide-react";
import { useLegalPromptTemplates, useExecutePrompt } from "@/hooks/useLegalConnect";

interface AISetupPanelProps {
  clientId?: string;
}

const categoryIcons: Record<string, React.ElementType> = {
  onboarding: Users,
  operations: Shield,
  troubleshooting: AlertTriangle,
  call_support: Headphones,
};

const categoryLabels: Record<string, string> = {
  onboarding: "Onboarding",
  operations: "Operations",
  troubleshooting: "Troubleshooting",
  call_support: "Call Support",
};

export default function AISetupPanel({ clientId }: AISetupPanelProps) {
  const [aiTab, setAiTab] = useState("admin");
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [contextInput, setContextInput] = useState("");
  const [aiOutput, setAiOutput] = useState<string | null>(null);

  const { data: templates, isLoading } = useLegalPromptTemplates();
  const executePrompt = useExecutePrompt();

  const adminTemplates = (templates ?? []).filter((t: any) => t.role === "admin");
  const agentTemplates = (templates ?? []).filter((t: any) => t.role === "agent");

  const handleExecute = (promptKey: string) => {
    let context: unknown;
    try {
      context = contextInput ? JSON.parse(contextInput) : {};
    } catch {
      context = contextInput || "No additional context provided.";
    }

    executePrompt.mutate(
      { prompt_key: promptKey, context, client_id: clientId },
      {
        onSuccess: (data) => {
          setAiOutput(data?.data?.content ?? "No response");
        },
      }
    );
  };

  const renderTemplateCards = (tpls: any[]) => {
    const grouped: Record<string, any[]> = tpls.reduce((acc: Record<string, any[]>, t: any) => {
      const cat = t.category ?? "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(grouped).map(([cat, items]) => {
      const Icon = categoryIcons[cat] ?? Sparkles;
      return (
        <div key={cat} className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">{categoryLabels[cat] ?? cat}</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {items.map((t: any) => (
              <Card
                key={t.id}
                className={`cursor-pointer transition-colors ${selectedPrompt === t.prompt_key ? "border-primary" : "hover:border-primary/30"}`}
                onClick={() => setSelectedPrompt(t.prompt_key === selectedPrompt ? null : t.prompt_key)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">{t.title}</h4>
                    <Badge variant="outline" className="text-[10px]">v{t.version}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.description}</p>

                  {selectedPrompt === t.prompt_key && (
                    <div className="space-y-3 pt-2 border-t border-border mt-2">
                      <Textarea
                        placeholder='Enter context (JSON or plain text)...'
                        value={contextInput}
                        onChange={(e) => setContextInput(e.target.value)}
                        className="text-xs min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleExecute(t.prompt_key); }}
                          disabled={executePrompt.isPending || !clientId}
                        >
                          <Play className="h-3 w-3 mr-1.5" />
                          {executePrompt.isPending ? "Running..." : "Execute"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); setSelectedPrompt(null); setContextInput(""); setAiOutput(null); }}
                        >
                          Cancel
                        </Button>
                      </div>
                      {!clientId && <p className="text-xs text-muted-foreground">Select a client to execute prompts</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-4">
      <Tabs value={aiTab} onValueChange={setAiTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="admin" className="text-xs">Admin Prompts</TabsTrigger>
          <TabsTrigger value="agent" className="text-xs">Agent Prompts</TabsTrigger>
        </TabsList>

        <TabsContent value="admin" className="mt-4 space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : (
            renderTemplateCards(adminTemplates)
          )}
        </TabsContent>

        <TabsContent value="agent" className="mt-4 space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : (
            renderTemplateCards(agentTemplates)
          )}
        </TabsContent>
      </Tabs>

      {/* AI Output */}
      {aiOutput && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Response
              </CardTitle>
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setAiOutput(null)}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-foreground">
              <pre className="whitespace-pre-wrap text-xs bg-muted/30 rounded-lg p-4 overflow-auto max-h-[500px]">
                {aiOutput}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
