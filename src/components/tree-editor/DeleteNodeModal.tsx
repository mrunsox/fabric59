import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteNodeModalProps {
  isOpen: boolean;
  nodeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteNodeModal({ isOpen, nodeName, onConfirm, onCancel }: DeleteNodeModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="bg-card border-border max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-full bg-destructive/10">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl text-foreground">
              Delete Node
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground text-base leading-relaxed">
            You are about to delete <span className="font-semibold text-foreground">"{nodeName}"</span>.
            <br /><br />
            This action cannot be undone and will remove all connections to and from this node.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 mt-4">
          <AlertDialogCancel 
            onClick={onCancel}
            className="flex-1 bg-muted hover:bg-muted/80 border-border"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Confirm Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
