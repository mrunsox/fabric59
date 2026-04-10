import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw, Phone, PhoneOff, CheckCircle2, Loader2, Zap } from "lucide-react";

interface SimStep {
  phase: "pre-call" | "during-call" | "post-call";
  callerMessage?: string;
  agentMessage?: string;
  action?: string;
  integration?: string;
  dataPoints?: string[];
  delay: number;
}

const scenarios: Record<string, { name: string; steps: SimStep[] }> = {
  "personal-injury": {
    name: "Personal Injury Intake",
    steps: [
      { phase: "pre-call", action: "ANI lookup triggered, searching CRM", integration: "Five9 → CRM", delay: 1200 },
      { phase: "pre-call", action: "Contact found: John Smith (existing client)", integration: "Salesforce", dataPoints: ["Name: John Smith", "Phone: (416) 555-0199"], delay: 800 },
      { phase: "pre-call", action: "Screen pop delivered to agent workstation", integration: "Five9 Agent Desktop", delay: 600 },
      { phase: "during-call", callerMessage: "Hi, I was in a car accident last week and I need help.", agentMessage: "I'm sorry to hear that, John. I'd be happy to help you. Can you tell me when the accident happened?", delay: 2000 },
      { phase: "during-call", callerMessage: "It was last Tuesday, February 14th.", action: "Incident date captured: 2026-02-14", integration: "Data Capture", dataPoints: ["Incident Date: 02/14/2026"], delay: 1500 },
      { phase: "during-call", callerMessage: "I was rear-ended at a traffic light on Highway 401.", action: "Accident type + location captured", integration: "Data Capture", dataPoints: ["Type: Rear-end collision", "Location: Highway 401"], delay: 1500 },
      { phase: "during-call", agentMessage: "Were there any injuries? Did you seek medical attention?", delay: 1000 },
      { phase: "during-call", callerMessage: "Yes, I went to the ER. I have whiplash and back pain.", action: "Medical info captured", integration: "Data Capture", dataPoints: ["Injuries: Whiplash, Back pain", "Medical: ER visit"], delay: 1500 },
      { phase: "during-call", action: "Disposition set: Qualified Lead, Personal Injury", integration: "Five9", delay: 800 },
      { phase: "post-call", action: "Creating new matter in CRM", integration: "Salesforce", delay: 1000 },
      { phase: "post-call", action: "Matter created: PI-2026-0847", integration: "Salesforce", dataPoints: ["Matter ID: PI-2026-0847", "Practice Area: Personal Injury"], delay: 800 },
      { phase: "post-call", action: "Slack notification sent to #intake-leads", integration: "Slack", delay: 600 },
      { phase: "post-call", action: "Follow-up appointment scheduled", integration: "Calendly", delay: 700 },
      { phase: "post-call", action: "Confirmation email sent to client", integration: "Email", delay: 500 },
    ],
  },
  "hvac-service": {
    name: "HVAC Service Dispatch",
    steps: [
      { phase: "pre-call", action: "ANI lookup, searching client database", integration: "Five9 → Workiz", delay: 1200 },
      { phase: "pre-call", action: "New caller, no existing record", integration: "Workiz", delay: 800 },
      { phase: "during-call", callerMessage: "Hi, my AC stopped working and it's really hot. Can someone come today?", agentMessage: "I can absolutely help with that! Let me get some information from you.", delay: 2000 },
      { phase: "during-call", callerMessage: "My name is Sarah Chen, I'm at 123 Oak Street.", action: "Contact info captured", integration: "Data Capture", dataPoints: ["Name: Sarah Chen", "Address: 123 Oak Street"], delay: 1500 },
      { phase: "during-call", callerMessage: "The unit is a Carrier, about 5 years old. It just stopped blowing cold air.", action: "Equipment details captured", integration: "Data Capture", dataPoints: ["Brand: Carrier", "Age: 5 years", "Issue: No cooling"], delay: 1500 },
      { phase: "during-call", action: "Disposition set: Service Call — HVAC Repair", integration: "Five9", delay: 800 },
      { phase: "post-call", action: "New client created in Workiz", integration: "Workiz", delay: 1000 },
      { phase: "post-call", action: "Job dispatched: HVAC-2026-1234", integration: "Workiz", dataPoints: ["Job ID: HVAC-2026-1234", "Priority: Urgent"], delay: 800 },
      { phase: "post-call", action: "Technician notified via SMS", integration: "Twilio", delay: 600 },
      { phase: "post-call", action: "Confirmation text sent to customer", integration: "Twilio", delay: 500 },
    ],
  },
};

export function CallFlowSimulator() {
  const [selectedScenario, setSelectedScenario] = useState("personal-injury");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [dataPointCount, setDataPointCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scenario = scenarios[selectedScenario];
  const visibleSteps = scenario.steps.filter((_, i) => completedSteps.includes(i) || i === currentStepIndex);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [completedSteps, currentStepIndex]);

  useEffect(() => {
    if (!isPlaying || currentStepIndex >= scenario.steps.length) {
      if (currentStepIndex >= scenario.steps.length) setIsPlaying(false);
      return;
    }

    const step = scenario.steps[currentStepIndex];
    timeoutRef.current = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, currentStepIndex]);
      if (step.dataPoints) setDataPointCount((c) => c + step.dataPoints!.length);
      setCurrentStepIndex((i) => i + 1);
    }, step.delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPlaying, currentStepIndex, scenario.steps]);

  const handlePlay = () => {
    if (currentStepIndex >= scenario.steps.length) {
      handleRestart();
    }
    setIsPlaying(true);
    if (currentStepIndex < 0) setCurrentStepIndex(0);
  };

  const handlePause = () => setIsPlaying(false);

  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentStepIndex(-1);
    setCompletedSteps([]);
    setDataPointCount(0);
  };

  const currentPhase = currentStepIndex >= 0 && currentStepIndex < scenario.steps.length
    ? scenario.steps[currentStepIndex].phase
    : completedSteps.length > 0
    ? scenario.steps[completedSteps[completedSteps.length - 1]]?.phase
    : "pre-call";

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Select value={selectedScenario} onValueChange={(v) => { setSelectedScenario(v); handleRestart(); }}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(scenarios).map(([key, s]) => (
                <SelectItem key={key} value={key}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="outline" className={`${
            currentPhase === "pre-call" ? "border-primary/40 text-primary" :
            currentPhase === "during-call" ? "border-success/40 text-success" :
            "border-warning/40 text-warning"
          }`}>
            {currentPhase === "pre-call" ? "🔍 Pre-Call" :
             currentPhase === "during-call" ? "📞 During Call" :
             "📋 Post-Call"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Zap className="h-3 w-3" /> {dataPointCount} data points
          </Badge>
          <Button variant="outline" size="icon" onClick={handleRestart}><RotateCcw className="h-4 w-4" /></Button>
          {isPlaying ? (
            <Button variant="outline" size="icon" onClick={handlePause}><Pause className="h-4 w-4" /></Button>
          ) : (
            <Button size="icon" onClick={handlePlay}><Play className="h-4 w-4" /></Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Conversation Panel */}
        <Card className="lg:row-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4 text-success" />
              Caller Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              <AnimatePresence>
                {visibleSteps.filter((s) => s.callerMessage || s.agentMessage).map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${step.callerMessage ? "justify-start" : "justify-end"}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      step.callerMessage
                        ? "bg-muted text-foreground rounded-bl-md"
                        : "bg-primary text-primary-foreground rounded-br-md"
                    }`}>
                      {step.callerMessage || step.agentMessage}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {currentStepIndex >= 0 && currentStepIndex < scenario.steps.length && isPlaying && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>
          </CardContent>
        </Card>

        {/* Action Feed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-warning" />
              Behind the Scenes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              <AnimatePresence>
                {visibleSteps.filter((s) => s.action).map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <div>
                      <p className="text-foreground">{step.action}</p>
                      {step.integration && (
                        <span className="text-xs text-muted-foreground">{step.integration}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {visibleSteps.filter((s) => s.action).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Press play to see integrations in action
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Points */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Captured Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2">
              <AnimatePresence>
                {visibleSteps
                  .filter((s) => s.dataPoints)
                  .flatMap((s) => s.dataPoints!)
                  .map((dp, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-xs font-mono text-muted-foreground py-0.5"
                    >
                      {dp}
                    </motion.div>
                  ))}
              </AnimatePresence>
              {dataPointCount === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Data points will appear as the call progresses
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
