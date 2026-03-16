import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Terminal, Play, Pause, SkipForward, ChevronRight, Clock,
  PhoneCall, PhoneOff, Search, BookOpen, Send, RotateCcw, Timer,
  CheckSquare, ArrowRight, Mic, MicOff
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useScripts } from "@/hooks/useScripts";
import { useCreateScriptSession, useCompleteScriptSession } from "@/hooks/useScriptSessions";
import { useKBArticles } from "@/hooks/useKnowledgeBase";
import type { Json } from "@/integrations/supabase/types";

interface ScriptStep {
  id: string;
  question: string;
  type: "text" | "select" | "yesno" | "info";
  options?: string[];
  required?: boolean;
  nextOnYes?: string;
  nextOnNo?: string;
  next?: string;
}

const FALLBACK_SCRIPT: ScriptStep[] = [
  { id: "greeting", question: "Thank you for calling [Company]. My name is [Agent]. How may I help you today?", type: "info", next: "caller_type" },
  { id: "caller_type", question: "Is this a new or existing client?", type: "yesno", nextOnYes: "existing_lookup", nextOnNo: "new_intake" },
  { id: "existing_lookup", question: "Can I have your name or case number?", type: "text", required: true, next: "verify_info" },
  { id: "verify_info", question: "I found your record. Can you verify your phone number on file?", type: "text", next: "reason" },
  { id: "new_intake", question: "Let me get some information. What is your full name?", type: "text", required: true, next: "new_phone" },
  { id: "new_phone", question: "And the best phone number to reach you?", type: "text", required: true, next: "reason" },
  { id: "reason", question: "What is the reason for your call today?", type: "select", options: ["New consultation", "Case update", "Billing inquiry", "Schedule appointment", "Other"], next: "notes" },
  { id: "notes", question: "Any additional notes for the attorney?", type: "text", next: "closing" },
  { id: "closing", question: "Thank you for calling. Someone will follow up within [TimeFrame]. Is there anything else I can help with?", type: "yesno", nextOnYes: "reason", nextOnNo: "end" },
  { id: "end", question: "Have a great day. Goodbye!", type: "info" },
];

type CallPhase = "idle" | "ringing" | "connected" | "hold" | "transfer" | "acw";

export default function ScripterPage() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  // Load scripts from DB
  const { data: scripts = [] } = useScripts();
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const selectedScript = scripts.find(s => s.id === selectedScriptId);

  // Parse script definition or use fallback
  const scriptSteps: ScriptStep[] = (() => {
    if (selectedScript?.definition && typeof selectedScript.definition === "object" && !Array.isArray(selectedScript.definition)) {
      const def = selectedScript.definition as { steps?: ScriptStep[] };
      if (Array.isArray(def.steps) && def.steps.length > 0) return def.steps;
    }
    return FALLBACK_SCRIPT;
  })();

  // KB from DB
  const { data: kbArticles = [] } = useKBArticles();

  // Session management
  const createSession = useCreateScriptSession();
  const completeSession = useCompleteScriptSession();
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [callPhase, setCallPhase] = useState<CallPhase>("idle");
  const [callSeconds, setCallSeconds] = useState(0);
  const [holdSeconds, setHoldSeconds] = useState(0);
  const [acwSeconds, setAcwSeconds] = useState(0);
  const [currentStepId, setCurrentStepId] = useState("greeting");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentInput, setCurrentInput] = useState("");
  const [scriptHistory, setScriptHistory] = useState<string[]>(["greeting"]);
  const [kbSearch, setKbSearch] = useState("");
  const [disposition, setDisposition] = useState("");
  const [acwNotes, setAcwNotes] = useState("");
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackTime, setCallbackTime] = useState("");
  const [callbackNotes, setCallbackNotes] = useState("");
  const [muted, setMuted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (callPhase === "connected" || callPhase === "hold" || callPhase === "transfer") {
      timerRef.current = setInterval(() => {
        setCallSeconds(s => s + 1);
        if (callPhase === "hold") setHoldSeconds(s => s + 1);
      }, 1000);
    } else if (callPhase === "acw") {
      timerRef.current = setInterval(() => setAcwSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [callPhase]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const currentStep = scriptSteps.find(s => s.id === currentStepId);

  const startCall = async () => {
    setCallPhase("ringing");
    setTimeout(() => setCallPhase("connected"), 1500);
    if (orgId) {
      try {
        const session = await createSession.mutateAsync({
          script_id: selectedScriptId || undefined,
          organization_id: orgId,
        });
        setSessionId(session.id);
      } catch {}
    }
  };

  const endCall = () => setCallPhase("acw");

  const finishACW = async () => {
    if (sessionId) {
      try {
        await completeSession.mutateAsync({
          id: sessionId,
          duration_seconds: callSeconds,
          variables: answers as unknown as Json,
          disposition,
          post_call_status: "completed",
        });
      } catch {}
    }
    setCallPhase("idle");
    setCallSeconds(0);
    setHoldSeconds(0);
    setAcwSeconds(0);
    setCurrentStepId(scriptSteps[0]?.id || "greeting");
    setAnswers({});
    setScriptHistory([scriptSteps[0]?.id || "greeting"]);
    setDisposition("");
    setAcwNotes("");
    setSessionId(null);
  };

  const advanceStep = (answer?: string) => {
    if (!currentStep) return;
    if (answer) setAnswers(prev => ({ ...prev, [currentStepId]: answer }));
    let nextId: string | undefined;
    if (currentStep.type === "yesno") {
      nextId = answer === "Yes" ? currentStep.nextOnYes : currentStep.nextOnNo;
    } else {
      nextId = currentStep.next;
    }
    if (nextId) {
      setCurrentStepId(nextId);
      setScriptHistory(prev => [...prev, nextId!]);
      setCurrentInput("");
    }
  };

  const goBack = () => {
    if (scriptHistory.length > 1) {
      const prev = [...scriptHistory];
      prev.pop();
      setScriptHistory(prev);
      setCurrentStepId(prev[prev.length - 1]);
    }
  };

  const filteredKB = kbArticles.filter(a =>
    !kbSearch || a.title.toLowerCase().includes(kbSearch.toLowerCase()) || (a.content || "").toLowerCase().includes(kbSearch.toLowerCase())
  );

  const phaseColors: Record<CallPhase, string> = {
    idle: "text-muted-foreground",
    ringing: "text-warning animate-pulse",
    connected: "text-success",
    hold: "text-warning",
    transfer: "text-primary",
    acw: "text-destructive",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Terminal className="h-6 w-6" /> Scripter</h1>
          <p className="text-sm text-muted-foreground">Agent call script console with guided workflows</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Script selector */}
          {scripts.length > 0 && (
            <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select script…" /></SelectTrigger>
              <SelectContent>
                {scripts.filter(s => s.status === "active" || s.status === "draft").map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {callPhase !== "idle" && (
            <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-2">
              <div className="flex items-center gap-1.5">
                <Timer className={`h-4 w-4 ${phaseColors[callPhase]}`} />
                <span className="font-mono text-lg font-bold">{formatTime(callSeconds)}</span>
              </div>
              {holdSeconds > 0 && <div className="text-xs text-muted-foreground">Hold: {formatTime(holdSeconds)}</div>}
              {callPhase === "acw" && <div className="text-xs text-destructive">ACW: {formatTime(acwSeconds)}</div>}
              <Badge className={phaseColors[callPhase]} variant="outline">{callPhase.toUpperCase()}</Badge>
            </div>
          )}

          {callPhase === "idle" && (
            <Button onClick={startCall} className="gap-1.5"><PhoneCall className="h-4 w-4" /> Start Call</Button>
          )}
          {(callPhase === "connected" || callPhase === "hold") && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setMuted(!muted)}>
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCallPhase(callPhase === "hold" ? "connected" : "hold")}>
                {callPhase === "hold" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button variant="destructive" size="sm" onClick={endCall} className="gap-1.5">
                <PhoneOff className="h-4 w-4" /> End Call
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: "calc(100vh - 14rem)" }}>
        <div className="lg:col-span-3 flex flex-col">
          <Tabs defaultValue="wizard" className="flex-1 flex flex-col">
            <TabsList className="w-fit">
              <TabsTrigger value="wizard">Script Wizard</TabsTrigger>
              <TabsTrigger value="console">Console View</TabsTrigger>
              <TabsTrigger value="acw">After-Call Work</TabsTrigger>
              <TabsTrigger value="callback">Callback Scheduler</TabsTrigger>
            </TabsList>

            <TabsContent value="wizard" className="flex-1">
              <Card className="h-full flex flex-col bg-zinc-950 border-zinc-800">
                <CardContent className="flex-1 p-6 flex flex-col">
                  <div className="flex items-center gap-2 mb-6 flex-wrap">
                    {scriptHistory.map((sid, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <button
                          onClick={() => { setCurrentStepId(sid); setScriptHistory(scriptHistory.slice(0, i + 1)); }}
                          className={`text-xs px-2 py-1 rounded font-mono ${sid === currentStepId ? "bg-primary text-primary-foreground" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
                        >{sid}</button>
                        {i < scriptHistory.length - 1 && <ChevronRight className="h-3 w-3 text-zinc-600" />}
                      </div>
                    ))}
                  </div>

                  {currentStep && (
                    <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
                      <div className="space-y-6">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                            <Terminal className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 font-mono mb-1">{currentStep.id}</p>
                            <p className="text-lg text-zinc-100 font-mono leading-relaxed">{currentStep.question}</p>
                            {currentStep.required && <Badge variant="destructive" className="mt-2 text-xs">Required</Badge>}
                          </div>
                        </div>

                        {currentStep.type === "text" && (
                          <div className="flex gap-2">
                            <Input value={currentInput} onChange={e => setCurrentInput(e.target.value)} placeholder="Type response…"
                              className="bg-zinc-900 border-zinc-700 text-zinc-100 font-mono"
                              onKeyDown={e => { if (e.key === "Enter" && currentInput) advanceStep(currentInput); }} />
                            <Button onClick={() => advanceStep(currentInput)} disabled={currentStep.required && !currentInput}><ArrowRight className="h-4 w-4" /></Button>
                          </div>
                        )}
                        {currentStep.type === "select" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {currentStep.options?.map(opt => (
                              <Button key={opt} variant="outline" className="justify-start font-mono text-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => advanceStep(opt)}>
                                <ChevronRight className="h-3.5 w-3.5 mr-2" /> {opt}
                              </Button>
                            ))}
                          </div>
                        )}
                        {currentStep.type === "yesno" && (
                          <div className="flex gap-3">
                            <Button variant="outline" className="flex-1 border-success text-success hover:bg-success/10 font-mono" onClick={() => advanceStep("Yes")}>Yes</Button>
                            <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10 font-mono" onClick={() => advanceStep("No")}>No</Button>
                          </div>
                        )}
                        {currentStep.type === "info" && (
                          <Button onClick={() => advanceStep("acknowledged")} className="gap-1.5 font-mono"><SkipForward className="h-4 w-4" /> Continue</Button>
                        )}
                        {scriptHistory.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={goBack} className="text-zinc-500 gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Back</Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="console" className="flex-1">
              <Card className="h-full bg-zinc-950 border-zinc-800">
                <ScrollArea className="h-full p-6">
                  <div className="font-mono text-sm space-y-2">
                    <p className="text-zinc-500">// Scripter Console v1.0</p>
                    <p className="text-zinc-500">// Call session log</p>
                    <p className="text-zinc-500">---</p>
                    {scriptHistory.map((sid, i) => {
                      const step = scriptSteps.find(s => s.id === sid);
                      const answer = answers[sid];
                      return (
                        <div key={i} className="space-y-1">
                          <p className="text-primary">{'>'} [{sid}] {step?.question}</p>
                          {answer && <p className="text-zinc-300 pl-4">→ {answer}</p>}
                        </div>
                      );
                    })}
                    <p className="text-zinc-600 animate-pulse">█</p>
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>

            <TabsContent value="acw" className="flex-1">
              <Card className="h-full">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckSquare className="h-4 w-4" /> After-Call Work</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Disposition</label>
                    <Select value={disposition} onValueChange={setDisposition}>
                      <SelectTrigger><SelectValue placeholder="Select disposition…" /></SelectTrigger>
                      <SelectContent>
                        {["Intake Complete", "Callback Requested", "Wrong Number", "Voicemail", "No Answer", "Transferred", "Spam/Robocall"].map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Call Notes</label>
                    <Textarea value={acwNotes} onChange={e => setAcwNotes(e.target.value)} placeholder="Enter call notes…" rows={6} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Captured Answers</label>
                    <div className="rounded border border-border p-3 space-y-1">
                      {Object.entries(answers).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-muted-foreground">{k}:</span><span>{v}</span>
                        </div>
                      ))}
                      {Object.keys(answers).length === 0 && <p className="text-sm text-muted-foreground">No answers captured yet.</p>}
                    </div>
                  </div>
                  {callPhase === "acw" && (
                    <Button onClick={finishACW} disabled={!disposition} className="w-full gap-1.5"><Send className="h-4 w-4" /> Submit & End ACW</Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="callback" className="flex-1">
              <Card className="h-full">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Schedule Callback</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-sm font-medium">Date</label><Input type="date" value={callbackDate} onChange={e => setCallbackDate(e.target.value)} /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Time</label><Input type="time" value={callbackTime} onChange={e => setCallbackTime(e.target.value)} /></div>
                  </div>
                  <div className="space-y-2"><label className="text-sm font-medium">Notes</label><Textarea value={callbackNotes} onChange={e => setCallbackNotes(e.target.value)} placeholder="Callback reason…" rows={3} /></div>
                  <Button className="w-full gap-1.5" disabled={!callbackDate || !callbackTime}><Clock className="h-4 w-4" /> Schedule Callback</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* KB Sidebar - now from database */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Knowledge Base</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search KB…" value={kbSearch} onChange={e => setKbSearch(e.target.value)} className="pl-8 h-8 text-sm" />
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 px-4 pb-4">
              <div className="space-y-3">
                {filteredKB.length === 0 && <p className="text-xs text-muted-foreground">No KB articles found. Add articles in Knowledge Base.</p>}
                {filteredKB.map((article) => (
                  <div key={article.id} className="rounded-lg border border-border p-3 space-y-1">
                    <h4 className="text-sm font-medium">{article.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-3">{article.content || "No content"}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
}
