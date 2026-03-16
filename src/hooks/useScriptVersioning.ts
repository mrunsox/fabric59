import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Node, Edge } from "@xyflow/react";

interface ScriptContent { nodes: Node[]; edges: Edge[]; }

export function useScriptVersioning(options: { scriptId?: string } = {}) {
  const [script, setScript] = useState<any | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const fetchScript = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const [scriptResult, versionsResult] = await Promise.all([
        supabase.from("scripts").select("*").eq("id", id).single(),
        supabase.from("script_versions").select("*").eq("script_id", id).order("version", { ascending: false }),
      ]);
      if (scriptResult.error) throw scriptResult.error;
      if (versionsResult.error) throw versionsResult.error;
      setScript(scriptResult.data);
      setVersions(versionsResult.data || []);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Error fetching script:", err);
      toast.error("Failed to load script");
    } finally { setIsLoading(false); }
  }, []);

  const saveDraft = useCallback(async (content: ScriptContent, metadata?: { name?: string; description?: string }) => {
    if (!script) return null;
    try {
      setIsSaving(true);
      const updateData: any = { definition: content, updated_at: new Date().toISOString() };
      if (metadata?.name) updateData.name = metadata.name;
      if (metadata?.description) updateData.description = metadata.description;
      const { data, error } = await supabase.from("scripts").update(updateData).eq("id", script.id).select().single();
      if (error) throw error;
      setScript(data);
      setHasUnsavedChanges(false);
      toast.success("Draft saved");
      return data;
    } catch (err) { console.error("Error saving:", err); toast.error("Failed to save draft"); return null; }
    finally { setIsSaving(false); }
  }, [script]);

  const publish = useCallback(async (content: ScriptContent) => {
    if (!script) return null;
    try {
      setIsPublishing(true);
      const newVersion = (script.version || 0) + 1;
      const { data: { user } } = await supabase.auth.getUser();
      const { error: versionError } = await supabase.from("script_versions").insert({ script_id: script.id, version: newVersion, content: content as any, created_by: user?.id || null });
      if (versionError) throw versionError;
      const { data, error } = await supabase.from("scripts").update({ definition: content as any, version: newVersion, is_live: true, updated_at: new Date().toISOString() }).eq("id", script.id).select().single();
      if (error) throw error;
      const { data: updatedVersions } = await supabase.from("script_versions").select("*").eq("script_id", script.id).order("version", { ascending: false });
      setScript(data);
      setVersions(updatedVersions || []);
      setHasUnsavedChanges(false);
      toast.success(`Version ${newVersion} is now live`);
      return data;
    } catch (err) { console.error("Error publishing:", err); toast.error("Failed to publish"); return null; }
    finally { setIsPublishing(false); }
  }, [script]);

  const rollbackToVersion = useCallback(async (versionNumber: number) => {
    if (!script) return null;
    try {
      setIsLoading(true);
      const { data: versionData, error: versionError } = await supabase.from("script_versions").select("*").eq("script_id", script.id).eq("version", versionNumber).single();
      if (versionError) throw versionError;
      const { data, error } = await supabase.from("scripts").update({ definition: versionData.content, is_live: false, updated_at: new Date().toISOString() }).eq("id", script.id).select().single();
      if (error) throw error;
      setScript(data);
      setHasUnsavedChanges(false);
      toast.success(`Restored to version ${versionNumber}`);
      return data;
    } catch (err) { console.error("Error rolling back:", err); toast.error("Failed to rollback"); return null; }
    finally { setIsLoading(false); }
  }, [script]);

  const markAsChanged = useCallback(() => { setHasUnsavedChanges(true); }, []);

  return { script, versions, isLoading, isSaving, isPublishing, hasUnsavedChanges, fetchScript, saveDraft, publish, rollbackToVersion, markAsChanged };
}
