import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteWorkspaceClient } from "@/hooks/useWorkspaceClientMutations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: { id: string; name: string } | null;
};

export function DeleteClientDialog({ open, onOpenChange, client }: Props) {
  const del = useDeleteWorkspaceClient();
  if (!client) return null;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {client.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the client. Campaigns linked to this client will keep running
            but will lose the client link. If the client has active campaigns, delete will be
            blocked — unlink them first.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={del.isPending}
            onClick={async (e) => {
              e.preventDefault();
              try {
                await del.mutateAsync(client.id);
                onOpenChange(false);
              } catch {
                /* toast handled in hook */
              }
            }}
          >
            {del.isPending ? "Deleting…" : "Delete client"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
