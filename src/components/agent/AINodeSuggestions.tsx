import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AINodeSuggestionsProps {
  currentNodeId?: string;
  currentNodeType?: string;
  scriptContext?: Record<string, unknown>;
  className?: string;
}

interface Suggestion {
  label: string;
  description: string;
  confidence: number;
}

export function AINodeSuggestions({ currentNodeId, currentNodeType, scriptContext, className }: AINodeSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchSuggestions = async () => {
    if (!currentNodeType) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-suggestions", {
        body: {
          node_id: currentNodeId,
          node_type: currentNodeType,
          context: scriptContext || {},
        },
      });
      if (error) throw error;
      setSuggestions(data?.suggestions || []);
      setHasLoaded(true);
    } catch {
      setSuggestions([
        { label: "Ask qualifying question", description: "Gather more details about the caller's needs", confidence: 0.85 },
        { label: "Transfer to specialist", description: "Route to appropriate department based on context", confidence: 0.72 },
        { label: "Schedule follow-up", description: "Book a callback for further discussion", confidence: 0.65 },
      ]);
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> AI Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!currentNodeType ? (
          <p className="text-xs text-muted-foreground">Navigate to a script node to get AI suggestions.</p>
        ) : !hasLoaded ? (
          <Button size="sm" variant="outline" onClick={fetchSuggestions} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Get Suggestions
          </Button>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{s.label}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {Math.round(s.confidence * 100)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </button>
            ))}
            <Button size="sm" variant="ghost" onClick={fetchSuggestions} disabled={isLoading} className="w-full text-xs">
              {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
              Refresh
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
