import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { knowledgeBase } from "@/data/knowledgeBase";
import { useAssistantConfig } from "@/hooks/useAssistantConfig";
import { toast } from "sonner";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

function buildKnowledgeContext(query: string): string {
  const q = query.toLowerCase();
  const scored = knowledgeBase.map((entry) => {
    const haystack = `${entry.featureName} ${entry.publicTitle} ${entry.summary} ${entry.howItWorks}`.toLowerCase();
    const score = q
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .reduce((s, w) => (haystack.includes(w) ? s + 1 : s), 0);
    return { entry, score };
  });
  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .filter((s) => s.score > 0)
    .map((s) => s.entry);
  const final = top.length > 0 ? top : knowledgeBase.slice(0, 6);
  return final
    .map(
      (e) =>
        `## ${e.publicTitle} (${e.category})\n${e.summary}\nHow it works: ${e.howItWorks}\nWhen to use: ${e.whenToUseIt}`,
    )
    .join("\n\n");
}

export function AssistantPanel({ onClose }: { onClose: () => void }) {
  const { data: config } = useAssistantConfig();
  const assistantName = config?.assistant_name || "Fabric Assistant";
  const greeting = config?.greeting || "Hi! I'm here to help you navigate Fabric59. Ask me anything.";

  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: greeting }]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const knowledgeContext = buildKnowledgeContext(text);
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: next,
          knowledgeContext,
          assistantName,
        }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Too many requests. Wait a moment and try again.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Please add funds.");
        else toast.error("Assistant unavailable.");
        setMessages((m) => m.slice(0, -1));
        setIsStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, idx);
          textBuffer = textBuffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantSoFar += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistantSoFar };
                return copy;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error("Assistant error");
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{assistantName}</p>
            <p className="text-[10px] text-muted-foreground">Grounded in your knowledge base</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as never}>
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "mr-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm text-foreground whitespace-pre-wrap"
              }
            >
              {m.content || (isStreaming && i === messages.length - 1 ? "..." : "")}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-3 bg-card">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Ask about Fabric59..."
            disabled={isStreaming}
            className="flex-1 h-9 text-sm"
          />
          <Button size="icon" className="h-9 w-9" onClick={send} disabled={isStreaming || !input.trim()}>
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function AssistantButton() {
  const [open, setOpen] = useState(false);
  const { data: config } = useAssistantConfig();
  if (config && config.enabled === false) return null;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open assistant"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>
      <AnimatePresence>{open && <AssistantPanel onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}
