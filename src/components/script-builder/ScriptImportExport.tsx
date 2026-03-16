import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileJson, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Node, Edge } from '@xyflow/react';
import { toast } from 'sonner';

interface ScriptMetadata { name?: string; description?: string; dnis?: string; version?: number; exportedAt?: string; }
interface ScriptExportData { version: string; exportedAt: string; metadata: ScriptMetadata; content: { nodes: Node[]; edges: Edge[] }; }

interface ScriptImportDialogProps { isOpen: boolean; onClose: () => void; onImport: (nodes: Node[], edges: Edge[], metadata?: ScriptMetadata) => void; }

export function ScriptImportDialog({ isOpen, onClose, onImport }: ScriptImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string; data?: ScriptExportData } | null>(null);

  const resetState = () => { setJsonInput(''); setValidationResult(null); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const handleClose = () => { resetState(); onClose(); };

  const handleValidate = () => {
    try {
      const data = JSON.parse(jsonInput);
      if (!data.content || !Array.isArray(data.content.nodes) || !Array.isArray(data.content.edges)) throw new Error('Invalid script format');
      setValidationResult({ valid: true, message: `Valid script with ${data.content.nodes.length} nodes and ${data.content.edges.length} edges`, data });
    } catch (error) {
      setValidationResult({ valid: false, message: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) { toast.error('Please select a JSON file'); return; }
    const reader = new FileReader();
    reader.onload = (e) => { setJsonInput(e.target?.result as string); setValidationResult(null); };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!validationResult?.valid || !validationResult.data) return;
    onImport(validationResult.data.content.nodes, validationResult.data.content.edges, validationResult.data.metadata);
    toast.success(`Imported ${validationResult.data.content.nodes.length} nodes`);
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Import Script</DialogTitle>
          <DialogDescription>Import a script from a JSON file or paste JSON content</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Upload JSON File</Label><Input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} /></div>
          <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or paste JSON</span></div></div>
          <div className="space-y-2"><Label>Script JSON</Label><Textarea placeholder='{"version": "1.0", "content": {"nodes": [...], "edges": [...]}}' value={jsonInput} onChange={(e) => { setJsonInput(e.target.value); setValidationResult(null); }} className="min-h-[200px] font-mono text-sm" /></div>
          {validationResult && (
            <Alert variant={validationResult.valid ? 'default' : 'destructive'}>
              {validationResult.valid ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{validationResult.message}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button variant="outline" onClick={handleValidate} disabled={!jsonInput.trim()}><FileJson className="h-4 w-4 mr-2" />Validate</Button>
          <Button onClick={handleImport} disabled={!validationResult?.valid}><Upload className="h-4 w-4 mr-2" />Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function exportScriptToJSON(nodes: Node[], edges: Edge[], metadata?: { name?: string; description?: string; dnis?: string; version?: number }): string {
  return JSON.stringify({ version: '1.0', exportedAt: new Date().toISOString(), metadata: { ...metadata, name: metadata?.name || 'Untitled Script', exportedAt: new Date().toISOString() }, content: { nodes, edges } }, null, 2);
}

export function downloadScriptJSON(nodes: Node[], edges: Edge[], metadata?: { name?: string; description?: string; dnis?: string; version?: number }) {
  const json = exportScriptToJSON(nodes, edges, metadata);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(metadata?.name || 'script').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-v${metadata?.version || 1}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
