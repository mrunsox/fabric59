import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Search, Star, Flag, CheckCircle2, AlertCircle, Eye
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useQAReviews, useUpdateQAReview } from "@/hooks/useQAReviews";
import { useScriptSessions } from "@/hooks/useScriptSessions";
import type { Json } from "@/integrations/supabase/types";

const SCORING_RUBRIC = [
  { category: "Greeting & Professionalism", weight: 15 },
  { category: "Script Adherence", weight: 20 },
  { category: "Information Gathering", weight: 25 },
  { category: "Empathy & Tone", weight: 15 },
  { category: "Closing & Disposition", weight: 15 },
  { category: "Compliance", weight: 10 },
];

export default function QAAnalyticsPage() {
  const { data: reviews = [], isLoading } = useQAReviews();
  const { data: sessions = [] } = useScriptSessions(100);
  const updateReview = useUpdateQAReview();

  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [reviewNotes, setReviewNotes] = useState("");

  const selectedReview = reviews.find(r => r.id === selectedReviewId);

  const totalScore = Object.keys(scores).length > 0
    ? Math.round(Object.entries(scores).reduce((sum, [cat, score]) => {
        const rubric = SCORING_RUBRIC.find(r => r.category === cat);
        return sum + (score / 100) * (rubric?.weight || 0);
      }, 0))
    : 0;

  const handleSubmitReview = () => {
    if (!selectedReviewId) return;
    updateReview.mutate({
      id: selectedReviewId,
      scores: scores as unknown as Json,
      total_score: totalScore,
      status: "reviewed",
      notes: reviewNotes,
    });
    setSelectedReviewId(null);
    setScores({});
    setReviewNotes("");
  };

  // Script path analysis from sessions
  const pathData = useMemo(() => {
    const paths: Record<string, number> = {};
    sessions.forEach(s => {
      const vars = s.variables as Record<string, unknown> | null;
      const path = vars && typeof vars === "object" ? (Object.keys(vars).join(" → ") || "empty") : "no data";
      paths[path] = (paths[path] || 0) + 1;
    });
    return Object.entries(paths)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([path, count]) => ({ path, count, pct: sessions.length ? Math.round((count / sessions.length) * 100) : 0 }));
  }, [sessions]);

  const pendingCount = reviews.filter(r => r.status === "pending").length;
  const reviewedWithScore = reviews.filter(r => r.total_score !== null);
  const avgScore = reviewedWithScore.length ? Math.round(reviewedWithScore.reduce((s, r) => s + (r.total_score || 0), 0) / reviewedWithScore.length) : 0;
  const escalatedCount = reviews.filter(r => r.status === "escalated").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Search className="h-6 w-6" /> QA & Analytics</h1>
        <p className="text-sm text-muted-foreground">Script path analysis, completion rates, and call quality scoring</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Flag className="h-4 w-4" /><span className="text-xs">Pending Reviews</span></div>
          <p className="text-2xl font-bold">{pendingCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Star className="h-4 w-4" /><span className="text-xs">Avg QA Score</span></div>
          <p className="text-2xl font-bold">{avgScore}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><CheckCircle2 className="h-4 w-4" /><span className="text-xs">Total Sessions</span></div>
          <p className="text-2xl font-bold">{sessions.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><AlertCircle className="h-4 w-4" /><span className="text-xs">Escalated</span></div>
          <p className="text-2xl font-bold text-destructive">{escalatedCount}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">QA Review Queue</TabsTrigger>
          <TabsTrigger value="scoring">Call Scoring</TabsTrigger>
          <TabsTrigger value="paths">Script Path Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : reviews.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No QA reviews yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent ID</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.agent_id?.slice(0, 8) || "—"}</TableCell>
                        <TableCell>
                          {r.total_score !== null ? (
                            <Badge variant={(r.total_score || 0) >= 80 ? "default" : (r.total_score || 0) >= 60 ? "secondary" : "destructive"}>
                              {r.total_score}
                            </Badge>
                          ) : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.status === "pending" ? "outline" : r.status === "escalated" ? "destructive" : "default"} className="capitalize">{r.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setSelectedReviewId(r.id);
                            setScores({});
                            setReviewNotes(r.notes || "");
                          }}><Eye className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoring" className="space-y-4">
          {selectedReview ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Scoring Review</CardTitle>
                  <CardDescription>Agent: {selectedReview.agent_id?.slice(0, 8) || "Unknown"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {SCORING_RUBRIC.map(rubric => (
                    <div key={rubric.category} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{rubric.category} <span className="text-muted-foreground">({rubric.weight}%)</span></span>
                        <span className="font-mono">{scores[rubric.category] || 0}/100</span>
                      </div>
                      <Slider value={[scores[rubric.category] || 0]} onValueChange={([v]) => setScores(prev => ({ ...prev, [rubric.category]: v }))} min={0} max={100} step={5} />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Overall Score</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className={`text-6xl font-bold ${totalScore >= 80 ? "text-success" : totalScore >= 60 ? "text-warning" : "text-destructive"}`}>{totalScore}</p>
                    <p className="text-sm text-muted-foreground mt-1">Weighted Total</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reviewer Notes</label>
                    <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Add review notes…" rows={4} />
                  </div>
                  <Button className="w-full" onClick={handleSubmitReview}>Submit Review</Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card><CardContent className="pt-6 text-center text-muted-foreground py-12">
              <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Select a call from the Review Queue tab to begin scoring.</p>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="paths" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Most Common Script Paths</CardTitle></CardHeader>
            <CardContent>
              {pathData.length === 0 ? <p className="text-sm text-muted-foreground">No session data to analyze yet.</p> : (
                <div className="space-y-3">
                  {pathData.map((p, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-mono text-xs truncate flex-1 mr-4">{p.path}</span>
                        <span className="text-muted-foreground flex-shrink-0">{p.count} ({p.pct}%)</span>
                      </div>
                      <Progress value={p.pct} className="h-1.5" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
