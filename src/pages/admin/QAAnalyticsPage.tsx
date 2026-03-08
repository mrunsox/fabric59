import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Search, Star, Flag, CheckCircle2, XCircle, MessageSquare,
  BarChart3, TrendingUp, GitBranch, Eye, AlertCircle
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MOCK_SCRIPT_PATHS = [
  { path: "greeting → caller_type(Yes) → existing_lookup → verify_info → reason → closing", count: 42, pct: 35 },
  { path: "greeting → caller_type(No) → new_intake → new_phone → reason → closing", count: 38, pct: 32 },
  { path: "greeting → caller_type(Yes) → existing_lookup → reason → notes → closing", count: 22, pct: 18 },
  { path: "greeting → caller_type(No) → new_intake (abandoned)", count: 12, pct: 10 },
  { path: "greeting (abandoned)", count: 6, pct: 5 },
];

const MOCK_COMPLETION_RATES = [
  { script: "PI Intake Script", completed: 85, abandoned: 15, total: 120 },
  { script: "Family Law Intake", completed: 78, abandoned: 22, total: 95 },
  { script: "Workers Comp Script", completed: 92, abandoned: 8, total: 60 },
  { script: "General Inquiry", completed: 70, abandoned: 30, total: 45 },
];

interface QAReview {
  id: string;
  agent: string;
  caller: string;
  campaign: string;
  date: string;
  duration: string;
  flagReason: string;
  score: number | null;
  status: "pending" | "reviewed" | "escalated";
  notes: string;
}

const MOCK_REVIEWS: QAReview[] = [
  { id: "1", agent: "Alice Johnson", caller: "John Smith", campaign: "PI Intake", date: "2026-03-08", duration: "4:22", flagReason: "Long hold time", score: null, status: "pending", notes: "" },
  { id: "2", agent: "Dan Lee", caller: "Sarah Williams", campaign: "Family Law", date: "2026-03-07", duration: "8:15", flagReason: "Call duration > 7min", score: 72, status: "reviewed", notes: "Needs improvement on script adherence" },
  { id: "3", agent: "Carol Thompson", caller: "Mike Johnson", campaign: "Workers Comp", date: "2026-03-07", duration: "2:10", flagReason: "Customer complaint", score: null, status: "pending", notes: "" },
  { id: "4", agent: "Bob Martinez", caller: "Lisa Chen", campaign: "PI Intake", date: "2026-03-06", duration: "5:30", flagReason: "Random QA sample", score: 91, status: "reviewed", notes: "Excellent call handling" },
  { id: "5", agent: "Eve Wilson", caller: "Robert Brown", campaign: "Family Law", date: "2026-03-06", duration: "3:45", flagReason: "Missed intake fields", score: 65, status: "escalated", notes: "Multiple required fields skipped" },
];

const SCORING_RUBRIC = [
  { category: "Greeting & Professionalism", weight: 15 },
  { category: "Script Adherence", weight: 20 },
  { category: "Information Gathering", weight: 25 },
  { category: "Empathy & Tone", weight: 15 },
  { category: "Closing & Disposition", weight: 15 },
  { category: "Compliance", weight: 10 },
];

export default function QAAnalyticsPage() {
  const [selectedReview, setSelectedReview] = useState<QAReview | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [reviewNotes, setReviewNotes] = useState("");

  const totalScore = Object.keys(scores).length > 0
    ? Math.round(Object.entries(scores).reduce((sum, [cat, score]) => {
        const rubric = SCORING_RUBRIC.find(r => r.category === cat);
        return sum + (score / 100) * (rubric?.weight || 0);
      }, 0))
    : 0;

  const pathChartData = MOCK_SCRIPT_PATHS.map(p => ({
    name: p.path.length > 40 ? p.path.slice(0, 40) + "…" : p.path,
    count: p.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="h-6 w-6" /> QA & Analytics
        </h1>
        <p className="text-sm text-muted-foreground">Script path analysis, completion rates, and call quality scoring</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Flag className="h-4 w-4" /><span className="text-xs">Pending Reviews</span></div>
          <p className="text-2xl font-bold">{MOCK_REVIEWS.filter(r => r.status === "pending").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Star className="h-4 w-4" /><span className="text-xs">Avg QA Score</span></div>
          <p className="text-2xl font-bold">{Math.round(MOCK_REVIEWS.filter(r => r.score).reduce((s, r) => s + (r.score || 0), 0) / MOCK_REVIEWS.filter(r => r.score).length)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><CheckCircle2 className="h-4 w-4" /><span className="text-xs">Script Completion</span></div>
          <p className="text-2xl font-bold text-success">83%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><AlertCircle className="h-4 w-4" /><span className="text-xs">Escalated</span></div>
          <p className="text-2xl font-bold text-destructive">{MOCK_REVIEWS.filter(r => r.status === "escalated").length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">QA Review Queue</TabsTrigger>
          <TabsTrigger value="scoring">Call Scoring</TabsTrigger>
          <TabsTrigger value="paths">Script Path Analysis</TabsTrigger>
          <TabsTrigger value="completion">Completion Rates</TabsTrigger>
        </TabsList>

        {/* QA Review Queue */}
        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Caller</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Flag Reason</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_REVIEWS.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.agent}</TableCell>
                      <TableCell>{r.caller}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.campaign}</Badge></TableCell>
                      <TableCell className="text-sm">{r.date}</TableCell>
                      <TableCell className="font-mono text-sm">{r.duration}</TableCell>
                      <TableCell className="text-sm">{r.flagReason}</TableCell>
                      <TableCell>
                        {r.score !== null ? (
                          <Badge variant={r.score >= 80 ? "default" : r.score >= 60 ? "secondary" : "destructive"}>
                            {r.score}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === "pending" ? "outline" : r.status === "escalated" ? "destructive" : "default"} className="capitalize">
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedReview(r); setScores({}); setReviewNotes(r.notes); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Call Scoring */}
        <TabsContent value="scoring" className="space-y-4">
          {selectedReview ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Scoring: {selectedReview.agent} — {selectedReview.caller}</CardTitle>
                  <CardDescription>{selectedReview.campaign} · {selectedReview.date} · {selectedReview.duration}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {SCORING_RUBRIC.map(rubric => (
                    <div key={rubric.category} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{rubric.category} <span className="text-muted-foreground">({rubric.weight}%)</span></span>
                        <span className="font-mono">{scores[rubric.category] || 0}/100</span>
                      </div>
                      <Slider
                        value={[scores[rubric.category] || 0]}
                        onValueChange={([v]) => setScores(prev => ({ ...prev, [rubric.category]: v }))}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Overall Score</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className={`text-6xl font-bold ${totalScore >= 80 ? "text-success" : totalScore >= 60 ? "text-warning" : "text-destructive"}`}>{totalScore}</p>
                    <p className="text-sm text-muted-foreground mt-1">Weighted Total</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reviewer Notes</label>
                    <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Add review notes…" rows={4} />
                  </div>
                  <Button className="w-full">Submit Review</Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground py-12">
                <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select a call from the Review Queue tab to begin scoring.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Script Path Analysis */}
        <TabsContent value="paths" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4" /> Most Common Script Paths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_SCRIPT_PATHS.map((p, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-mono text-xs truncate flex-1 mr-4">{p.path}</span>
                        <span className="text-muted-foreground flex-shrink-0">{p.count} ({p.pct}%)</span>
                      </div>
                      <Progress value={p.pct} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Path Volume</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pathChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Completion Rates */}
        <TabsContent value="completion" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {MOCK_COMPLETION_RATES.map((s, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium">{s.script}</h4>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-success">{s.completed}% completed</span>
                        <span className="text-destructive">{s.abandoned}% abandoned</span>
                        <Badge variant="outline">{s.total} calls</Badge>
                      </div>
                    </div>
                    <div className="h-3 rounded-full bg-destructive/20 overflow-hidden">
                      <div className="h-full bg-success rounded-full transition-all" style={{ width: `${s.completed}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
