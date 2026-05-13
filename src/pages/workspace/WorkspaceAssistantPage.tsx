// Phase 10 — Workspace AI assistant page.
// Workspace-scoped grounded chat, with a knowledge-only toggle and a grounding indicator on each reply.
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Send, Sparkles, Database, Loader2 } from "lucide-react";
import {
  useCreateAiConversation,
  useSendAssistantMessage,
  useWorkspaceAiConfig,
  useWorkspaceAiConversations,
  useWorkspaceAiMessages,
} from "@/hooks/useWorkspaceAi";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";

export default function WorkspaceAssistantPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: config } = useWorkspaceAiConfig(workspaceId);
  const { data: conversations = [] } = useWorkspaceAiConversations(workspaceId);
  const create = useCreateAiConversation();
  const send = useSendAssistantMessage();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [knowledgeOnly, setKnowledgeOnly] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (config?.knowledge_only !== undefined) setKnowledgeOnly(config.knowledge_only);
  }, [config?.knowledge_only]);

  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  const { data: messages = [] } = useWorkspaceAiMessages(activeId);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, send.isPending]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeId, send.isPending]);

  const history = useMemo(
    () =>
      messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    [messages],
  );

  const newConversation = async () => {
    if (!workspaceId) return;
    const conv = await create.mutateAsync({ workspaceId });
    setActiveId(conv.id);
  };

  const handleSend = async () => {
    if (!workspaceId || !input.trim()) return;
    let convId = activeId;
    if (!convId) {
      const conv = await create.mutateAsync({ workspaceId, title: input.trim().slice(0, 48) });
      convId = conv.id;
      setActiveId(convId);
    }
    const text = input.trim();
    setInput("");
    await send.mutateAsync({
      workspaceId,
      conversationId: convId,
      message: text,
      knowledgeOnly,
      history,
    });
  };

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Assistant"
        title="Workspace assistant"
        lede="Workspace-scoped grounded chat. Pulls from KB, guides, templates, and call summaries you enable."
        action={
          <Label className="text-xs flex items-center gap-2">
            <Switch checked={knowledgeOnly} onCheckedChange={setKnowledgeOnly} /> Knowledge only
          </Label>
        }
      />

      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <Card>
          <CardContent className="p-3 space-y-2">
            <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={newConversation}>
              <Plus className="h-3.5 w-3.5" /> New conversation
            </Button>
            <ScrollArea className="h-[480px] pr-2">
              <div className="space-y-1">
                {conversations.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">No conversations yet.</p>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveId(c.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs truncate ${
                        c.id === activeId ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                      }`}
                    >
                      {c.title}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-[560px]">
          <ScrollArea className="flex-1 p-4" ref={scrollerRef as never}>
            <div className="space-y-4">
              {messages.length === 0 && !send.isPending ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Ask anything about this workspace — guides, campaigns, recent calls, KB.
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                    <div
                      className={
                        m.role === "user"
                          ? "max-w-[80%] bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm"
                          : "max-w-[90%] text-sm"
                      }
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      {m.role === "assistant" && m.grounding && Object.keys(m.grounding).length > 0 && (
                        <GroundingBadge grounding={m.grounding as never} />
                      )}
                    </div>
                  </div>
                ))
              )}
              {send.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-3 space-y-2">
            <Textarea
              ref={textareaRef}
              rows={2}
              placeholder="Ask the workspace assistant…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Scoped to this workspace. {knowledgeOnly ? "Restricted to indexed sources." : "Falls back to general guidance when needed."}
              </p>
              <Button size="sm" onClick={handleSend} disabled={send.isPending || !input.trim()} className="gap-1.5">
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function GroundingBadge({
  grounding,
}: {
  grounding: { sources?: Record<string, number>; knowledge_only?: boolean; used_workspace_knowledge?: boolean };
}) {
  const sources = grounding?.sources ?? {};
  const used = Object.entries(sources).filter(([, n]) => n > 0);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className="text-[10px] gap-1">
        <Database className="h-3 w-3" />
        {used.length === 0 ? "No workspace knowledge matched" : "Grounded"}
      </Badge>
      {used.map(([k, n]) => (
        <Badge key={k} variant="outline" className="text-[10px]">
          {k.replace("_", " ")} · {n}
        </Badge>
      ))}
      {grounding.knowledge_only && (
        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
          KB only
        </Badge>
      )}
    </div>
  );
}
