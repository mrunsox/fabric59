import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { History, RotateCcw, Eye, X, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface ScriptVersion { id: string; script_id: string; version: number; content: unknown; created_by: string | null; created_at: string; }

interface VersionHistoryPanelProps {
  versions: ScriptVersion[];
  currentVersion: number;
  isOpen: boolean;
  onClose: () => void;
  onRollback: (version: number) => Promise<void>;
  onPreview?: (version: ScriptVersion) => void;
}

export function VersionHistoryPanel({ versions, currentVersion, isOpen, onClose, onRollback, onPreview }: VersionHistoryPanelProps) {
  const [rollbackVersion, setRollbackVersion] = useState<number | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUserNames = async () => {
      const userIds = [...new Set(versions.map((v) => v.created_by).filter(Boolean))] as string[];
      if (userIds.length === 0) return;
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      if (data) { const names: Record<string, string> = {}; data.forEach((p: any) => { names[p.id] = p.full_name || p.email || "Unknown"; }); setUserNames(names); }
    };
    if (isOpen && versions.length > 0) fetchUserNames();
  }, [isOpen, versions]);

  const handleRollback = async () => {
    if (rollbackVersion === null) return;
    setIsRollingBack(true);
    try { await onRollback(rollbackVersion); setRollbackVersion(null); onClose(); } finally { setIsRollingBack(false); }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.aside initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed right-0 top-16 bottom-0 w-80 border-l border-border bg-card z-50 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /><h3 className="font-semibold">Version History</h3></div>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>
            <ScrollArea className="h-[calc(100%-65px)]">
              <div className="p-4 space-y-3">
                {versions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground"><History className="h-12 w-12 mx-auto mb-3 opacity-50" /><p className="text-sm">No published versions yet</p></div>
                ) : versions.map((version, index) => (
                  <motion.div key={version.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-lg border transition-colors ${version.version === currentVersion ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/30"}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">v{version.version}</span>
                        {version.version === currentVersion && <Badge variant="secondary" className="text-xs">Current</Badge>}
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /><span>{format(new Date(version.created_at), "MMM d, yyyy 'at' h:mm a")}</span></div>
                      {version.created_by && <div className="flex items-center gap-1.5"><User className="h-3 w-3" /><span>Published by {userNames[version.created_by] || "Unknown"}</span></div>}
                    </div>
                    <div className="flex gap-2">
                      {onPreview && <Button variant="outline" size="sm" className="flex-1" onClick={() => onPreview(version)}><Eye className="h-3.5 w-3.5" />Preview</Button>}
                      {version.version !== currentVersion && <Button variant="outline" size="sm" className="flex-1" onClick={() => setRollbackVersion(version.version)}><RotateCcw className="h-3.5 w-3.5" />Restore</Button>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </motion.aside>
        )}
      </AnimatePresence>
      <AlertDialog open={rollbackVersion !== null} onOpenChange={() => setRollbackVersion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Restore Version {rollbackVersion}?</AlertDialogTitle><AlertDialogDescription>This will replace your current draft with the content from version {rollbackVersion}.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isRollingBack}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleRollback} disabled={isRollingBack}>{isRollingBack ? "Restoring..." : "Restore Version"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
