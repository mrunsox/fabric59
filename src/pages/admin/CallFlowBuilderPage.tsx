import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallFlowSimulator } from "@/components/call-flow/CallFlowSimulator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Bot, User, Sparkles, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-call-flow`;

/** Extract numbered options like "1. Legal" or "2. Home Services" from AI text */
function extractQuickReplies(text: string): string[] {
  const lines = text.split("\n");
  const options: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\s*(\d+)\.\s+\*{0,2}(.+?)\*{0,2}\s*(?:—|–|-|$)/);
    if (match) {
      options.push(match[2].trim());
    }
  }
  return options.length >= 2 && options.length <= 8 ? options : [];
}

export default function CallFlowBuilderPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const streamMessage = useCallback(async (allMessages: Msg[]) => {
    setIsLoading(true);
    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          setMessages((prev) => [...prev, { role: "assistant", content: "Rate limit reached. Please try again in a moment." }]);
          setIsLoading(false);
          return;
        }
        throw new Error("Failed to get response");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      if (!assistantSoFar) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
      }
    }
    setIsLoading(false);
  }, []);

  // Auto-start conversation
  useEffect(() => {
    if (!hasAutoStarted && messages.length === 0) {
      setHasAutoStarted(true);
      const triggerMsg: Msg = { role: "user", content: "Start building a new call flow" };
      // Don't show the trigger message in UI - just send it
      streamMessage([triggerMsg]);
    }
  }, [hasAutoStarted, messages.length, streamMessage]);

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || isLoading) return;

    const userMsg: Msg = { role: "user", content: msgText };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    await streamMessage(allMessages);
  };

  const handleStartOver = () => {
    setMessages([]);
    setHasAutoStarted(false);
  };

  // Get quick replies from the last assistant message
  const lastAssistantMsg = messages.length > 0 && messages[messages.length - 1]?.role === "assistant"
    ? messages[messages.length - 1] : null;
  const quickReplies = lastAssistantMsg && !isLoading ? extractQuickReplies(lastAssistantMsg.content) : [];
  const isMultiSelect = lastAssistantMsg?.content.toLowerCase().includes("select all that apply") ?? false;

  const toggleChip = (option: string) => {
    setSelectedChips((prev) =>
      prev.includes(option) ? prev.filter((c) => c !== option) : [...prev, option]
    );
  };

  const handleContinue = () => {
    if (selectedChips.length === 0) return;
    sendMessage(selectedChips.join(", "));
    setSelectedChips([]);
  };
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Call Flow Builder</h1>
        <p className="text-muted-foreground">
          Design integration flows with AI assistance or explore interactive demos
        </p>
      </div>

      <Tabs defaultValue="ai-builder">
        <TabsList>
          <TabsTrigger value="ai-builder" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Builder
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-2">
            <Bot className="h-4 w-4" />
            Interactive Demo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-builder" className="mt-6">
          <div className="grid lg:grid-cols-1 gap-6">
            <Card className="flex flex-col" style={{ height: "calc(100vh - 280px)" }}>
              <CardHeader className="pb-3 shrink-0 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Alex — Call Flow Engineer
                </CardTitle>
                {messages.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleStartOver} className="gap-2">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Start Over
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4 pb-4">
                    {messages.length === 0 && isLoading && (
                      <div className="flex gap-3">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}

                    {messages.map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.role === "assistant" && (
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}>
                          {msg.role === "assistant" ? (
                            <div className="prose prose-sm prose-invert max-w-none">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : msg.content}
                        </div>
                        {msg.role === "user" && (
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    ))}

                    {isLoading && messages.length > 0 && messages[messages.length - 1]?.role !== "assistant" && (
                      <div className="flex gap-3">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}

                    {/* Quick-reply chips */}
                    {quickReplies.length > 0 && (
                      <div className="flex flex-wrap gap-2 pl-10">
                        {quickReplies.map((option) => (
                          <Button
                            key={option}
                            variant={isMultiSelect && selectedChips.includes(option) ? "default" : "outline"}
                            size="sm"
                            className="text-xs"
                            onClick={() => isMultiSelect ? toggleChip(option) : sendMessage(option)}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    )}
                    {isMultiSelect && selectedChips.length > 0 && (
                      <div className="pl-10">
                        <Button size="sm" onClick={handleContinue} className="gap-2">
                          <Send className="h-3.5 w-3.5" />
                          Continue ({selectedChips.length} selected)
                        </Button>
                      </div>
                    )}

                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                <div className="flex gap-2 pt-3 border-t border-border shrink-0">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your answer or click an option above..."
                    className="min-h-[48px] max-h-[120px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button onClick={() => sendMessage()} disabled={isLoading || !input.trim()} size="icon" className="shrink-0 h-12 w-12">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="simulator" className="mt-6">
          <CallFlowSimulator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
