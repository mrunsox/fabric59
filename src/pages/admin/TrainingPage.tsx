import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GraduationCap, Plus, BookOpen, Clock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTrainingModules, useTrainingLessons, useTrainingProgress, useCreateTrainingModule, useCreateTrainingLesson } from "@/hooks/useTraining";

export default function TrainingPage() {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const { data: modules = [], isLoading } = useTrainingModules();
  const { data: progress = [] } = useTrainingProgress();
  const createModule = useCreateTrainingModule();
  const createLesson = useCreateTrainingLesson();

  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const { data: lessons = [] } = useTrainingLessons(selectedModule || undefined);

  const [newModOpen, setNewModOpen] = useState(false);
  const [modForm, setModForm] = useState({ name: "", description: "" });
  const [newLessonOpen, setNewLessonOpen] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: "", content: "", duration_minutes: 0 });

  const getModuleProgress = (moduleId: string) => {
    const moduleProgress = progress.filter(p => p.module_id === moduleId);
    const completed = moduleProgress.filter(p => p.status === "completed").length;
    const total = lessons.length || moduleProgress.length || 1;
    return Math.round((completed / total) * 100);
  };

  const handleCreateModule = () => {
    if (!orgId || !modForm.name.trim()) return;
    createModule.mutate({ name: modForm.name, description: modForm.description, organization_id: orgId, status: "active" });
    setNewModOpen(false);
    setModForm({ name: "", description: "" });
  };

  const handleCreateLesson = () => {
    if (!selectedModule || !lessonForm.title.trim()) return;
    createLesson.mutate({ module_id: selectedModule, title: lessonForm.title, content: lessonForm.content, duration_minutes: lessonForm.duration_minutes || undefined, sort_order: lessons.length });
    setNewLessonOpen(false);
    setLessonForm({ title: "", content: "", duration_minutes: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="h-6 w-6" /> Training Center</h1>
          <p className="text-sm text-muted-foreground">Manage training modules, lessons, and track agent progress</p>
        </div>
        <Dialog open={newModOpen} onOpenChange={setNewModOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Module</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Training Module</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Module name" value={modForm.name} onChange={e => setModForm(f => ({ ...f, name: e.target.value }))} />
              <Textarea placeholder="Description" value={modForm.description} onChange={e => setModForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              <Button onClick={handleCreateModule} className="w-full">Create Module</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading modules…</p>}

      {!selectedModule ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.length === 0 && !isLoading && (
            <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No training modules yet. Create one to get started.</p>
            </CardContent></Card>
          )}
          {modules.map(mod => {
            const pct = getModuleProgress(mod.id);
            return (
              <Card key={mod.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedModule(mod.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{mod.name}</CardTitle>
                    <Badge variant={mod.status === "active" ? "default" : "secondary"}>{mod.status}</Badge>
                  </div>
                  {mod.description && <CardDescription className="text-xs">{mod.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{pct}% complete</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedModule(null)}>← Back to Modules</Button>
            <h2 className="text-lg font-semibold">{modules.find(m => m.id === selectedModule)?.name}</h2>
            <Dialog open={newLessonOpen} onOpenChange={setNewLessonOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="ml-auto gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Lesson</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Lesson</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Lesson title" value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} />
                  <Textarea placeholder="Lesson content (markdown)" value={lessonForm.content} onChange={e => setLessonForm(f => ({ ...f, content: e.target.value }))} rows={6} />
                  <Input type="number" placeholder="Duration (minutes)" value={lessonForm.duration_minutes || ""} onChange={e => setLessonForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 0 }))} />
                  <Button onClick={handleCreateLesson} className="w-full">Create Lesson</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {lessons.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No lessons in this module yet.</CardContent></Card>}

          <div className="space-y-3">
            {lessons.map((lesson, i) => {
              const prog = progress.find(p => p.lesson_id === lesson.id);
              return (
                <Card key={lesson.id}>
                  <CardContent className="pt-4 pb-4 flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium">{lesson.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {lesson.duration_minutes && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{lesson.duration_minutes} min</span>}
                        <span className="flex items-center gap-1">
                          {prog?.status === "completed" ? <CheckCircle2 className="h-3 w-3 text-success" /> : <BookOpen className="h-3 w-3" />}
                          {prog?.status || "not_started"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
