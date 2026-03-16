import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StickyNote, Clock, Save, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AgentCallNotesInputProps {
  callSessionId?: string;
  className?: string;
}

interface NoteEntry {
  id: string;
  timestamp: string;
  text: string;
  saved: boolean;
}

export function AgentCallNotesInput({ callSessionId, className }: AgentCallNotesInputProps) {
  const { user } = useAuth();
  const [currentNote, setCurrentNote] = useState("");
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const MAX_CHARS = 2000;

  // Load existing notes
  useEffect(() => {
    if (!callSessionId) return;
    supabase
      .from("call_notes")
      .select("*")
      .eq("call_session_id", callSessionId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) {
          setNotes(data.map(n => ({
            id: n.id,
            timestamp: new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: n.note_text,
            saved: true,
          })));
        }
      });
  }, [callSessionId]);

  const saveNote = useCallback(async () => {
    if (!currentNote.trim() || !callSessionId || !user?.id) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("call_notes")
        .insert({ call_session_id: callSessionId, agent_id: user.id, note_text: currentNote.trim() })
        .select()
        .single();
      if (error) throw error;
      setNotes(prev => [...prev, {
        id: data.id,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: currentNote.trim(),
        saved: true,
      }]);
      setCurrentNote("");
      toast.success("Note saved");
    } catch {
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  }, [currentNote, callSessionId, user?.id]);

  // Auto-save on debounce
  const handleChange = (value: string) => {
    if (value.length > MAX_CHARS) return;
    setCurrentNote(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Auto-save indicator only, actual save on button press
    }, 1500);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <StickyNote className="h-4 w-4" /> Call Notes
          {notes.length > 0 && <Badge variant="secondary" className="ml-auto">{notes.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!callSessionId ? (
          <p className="text-sm text-muted-foreground">No active call session. Notes will appear here during a call.</p>
        ) : (
          <>
            {notes.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notes.map(note => (
                  <div key={note.id} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-mono text-muted-foreground">{note.timestamp}</span>
                      {note.saved && <Badge variant="outline" className="text-[10px] h-4">Saved</Badge>}
                    </div>
                    <p className="text-sm">{note.text}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Textarea
                placeholder="Type your call notes here..."
                value={currentNote}
                onChange={(e) => handleChange(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{currentNote.length}/{MAX_CHARS}</span>
                <Button size="sm" onClick={saveNote} disabled={!currentNote.trim() || isSaving}>
                  {isSaving ? <Save className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                  Add Note
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
