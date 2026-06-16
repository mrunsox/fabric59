import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AscSwitchToManualLinkProps {
  workspaceId: string;
  onConfirm: () => string; // returns target URL
}

export function AscSwitchToManualLink({
  workspaceId,
  onConfirm,
}: AscSwitchToManualLinkProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="link"
        size="sm"
        data-testid="asc-switch-to-manual"
        onClick={() => setOpen(true)}
      >
        Switch to manual
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to manual builder?</DialogTitle>
            <DialogDescription>
              We'll move your progress to the manual campaign builder. You can
              come back to the assistant later — your draft stays put.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Stay in assistant
            </Button>
            <Button
              data-testid="asc-switch-to-manual-confirm"
              onClick={() => {
                const url = onConfirm();
                setOpen(false);
                navigate(url);
              }}
            >
              Switch to manual
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <span className="sr-only" data-workspaceid={workspaceId} />
    </>
  );
}
