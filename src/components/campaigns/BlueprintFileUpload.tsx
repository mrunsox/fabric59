import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface BlueprintFileUploadProps {
  onTextExtracted: (text: string, fileName: string) => void;
  onFileUploaded?: (doc: { name: string; path: string; uploaded_at: string }) => void;
  label?: string;
  accept?: string;
}

export function BlueprintFileUpload({
  onTextExtracted,
  onFileUploaded,
  label = "Upload a document to extract text",
  accept = ".pdf,.docx,.doc,.txt,.md",
}: BlueprintFileUploadProps) {
  const { organization } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!organization?.id) {
        toast.error("No organization context");
        return;
      }

      setIsProcessing(true);
      setExtractedText(null);
      setFileName(file.name);

      try {
        const storagePath = `${organization.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("blueprint-documents")
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        onFileUploaded?.({
          name: file.name,
          path: storagePath,
          uploaded_at: new Date().toISOString(),
        });

        // Call edge function to extract text
        const { data, error } = await supabase.functions.invoke("parse-blueprint-doc", {
          body: { filePath: storagePath, bucket: "blueprint-documents" },
        });

        if (error) throw error;

        const text = data?.text || "";
        setExtractedText(text);
        toast.success(`Extracted text from ${file.name}`);
      } catch (err: any) {
        toast.error(`Failed to process file: ${err.message}`);
        setExtractedText(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [organization?.id, onFileUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  const useText = () => {
    if (extractedText && fileName) {
      onTextExtracted(extractedText, fileName);
      toast.success("Text applied");
      setExtractedText(null);
      setFileName(null);
    }
  };

  const dismiss = () => {
    setExtractedText(null);
    setFileName(null);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
          ${isProcessing ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
        />
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Processing {fileName}…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">
              Drag & drop or click to browse · PDF, DOCX, TXT
            </p>
          </div>
        )}
      </div>

      {/* Extracted text preview */}
      {extractedText && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{fileName}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={dismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <pre className="text-xs text-muted-foreground bg-muted rounded p-3 max-h-48 overflow-auto whitespace-pre-wrap font-mono">
              {extractedText.slice(0, 2000)}
              {extractedText.length > 2000 && "\n\n… (truncated preview)"}
            </pre>
            <Button onClick={useText} size="sm">
              <Check className="mr-1 h-3 w-3" /> Use This Text
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
