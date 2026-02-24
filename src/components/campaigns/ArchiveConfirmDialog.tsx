import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Archive, AlertTriangle } from "lucide-react";

interface ArchiveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName: string;
  onConfirm: () => void;
}

export function ArchiveConfirmDialog({
  open,
  onOpenChange,
  campaignName,
  onConfirm,
}: ArchiveConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const isValid = confirmText === campaignName;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Archive Campaign
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This will deprovision <strong>{campaignName}</strong> from Five9:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Stop the campaign if running</li>
              <li>Release all DNIS numbers</li>
              <li>Decouple all skills</li>
              <li>Remove agents from campaign skills</li>
              <li>Snapshot full configuration for future restoration</li>
            </ul>
            <p className="font-medium text-foreground">
              Type the campaign name to confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={campaignName}
              className="mt-1"
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!isValid}
            onClick={() => {
              setConfirmText("");
              onConfirm();
            }}
            className="gap-1.5"
          >
            <Archive className="h-4 w-4" /> Archive Campaign
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
