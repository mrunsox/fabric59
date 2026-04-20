import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchClientReadiness, type ClientReadiness } from "@/lib/readiness/computeCampaignReadiness";
import { findActiveSection } from "@/config/navigation";

interface Msg { role: "user" | "assistant"; content: string }

export function GuidancePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation();
  const { organization } = useAuth();
  const [readiness, setReadiness] = useState<ClientReadiness | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // try to extract a clientId from path: /admin/clients/:id/...
  const clientMatch = pathname.match(/\/admin\/clients\/([^/]+)/);
  const clientId = clientMatch?.[1];

  useEffect(() => {
    if (!open || !clientId) return;
    fetchClientReadiness(clientId).then(setReadiness);
  }, [open, clientId]);

  const section = findActiveSection(pathname);

  const ask = async (q?: string) => {
    const text = (q ?? input).trim();
    if (!text || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const ctxBlock = `Current page: ${pathname}\nSection: ${section?.label ?? "Unknown"}\nWorkspace: ${organization?.name ?? ""}\n${readiness ? `Readiness signals: ${JSON.stringify({
        status: readiness.status,
        domain_connected: readiness.domain_connected,
        campaign_exists: readiness.campaign_exists,
        variable_group_exists: readiness.variable_group_exists,
        dispositions_configured: readiness.dispositions_configured,
        provider_connected: readiness.provider_connected,
        ready_route_count: readiness.ready_route_count,
      })}` : ""}`;

      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          messages: next,
          knowledgeContext: ctxBlock,
          assistantName: "Fabric Guide",
          mode: "guidance",
        },
      });

      if (error) throw error;
      const reply = (data as any)?.reply ?? (data as any)?.choices?.[0]?.message?.content ?? "I couldn't generate a response. Try the AI Assistant button instead.";
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: "Guidance is temporarily unavailable. Try the floating AI Assistant in the bottom right." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "What should I do next on this page?",
    "What's blocking my campaign from going live?",
    "Explain the Five9 setup steps in order",
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <SheetTitle className="text-base">AI Guidance</SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            Context-aware help for {section?.label || "this page"}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            {/* state summary */}
            {readiness && (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                  Current state
                </p>
                <p className="text-xs text-foreground">
                  Status: <span className="font-semibold">{readiness.status}</span> · {readiness.ready_route_count} ready of {readiness.route_count} routes
                </p>
              </div>
            )}

            {/* suggestions */}
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Try asking
                </p>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="block w-full text-left px-3 py-2.5 rounded-lg border border-border text-xs text-foreground hover:bg-muted/50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* messages */}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "mr-auto max-w-[90%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm text-foreground whitespace-pre-wrap"
                }
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border/40 p-4 space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
            placeholder="Ask about this page…"
            className="min-h-[60px] text-sm resize-none"
            disabled={loading}
          />
          <Button onClick={() => ask()} disabled={loading || !input.trim()} className="w-full" size="sm">
            Ask
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
