import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Unlink, Trash2, X } from 'lucide-react';

interface EdgeContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  edgeId: string;
  onDisconnect: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function EdgeContextMenu({
  isOpen,
  position,
  edgeId,
  onDisconnect,
  onDelete,
  onClose,
}: EdgeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 150),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.1 }}
          className="fixed z-[9999] min-w-[180px] rounded-xl bg-card border border-border shadow-2xl overflow-hidden"
          style={{
            left: adjustedPosition.x,
            top: adjustedPosition.y,
          }}
        >
          {/* Header */}
          <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Connection
            </span>
            <button
              onClick={onClose}
              className="w-5 h-5 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>

          {/* Menu items */}
          <div className="p-1">
            <button
              onClick={() => {
                onDisconnect();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                <Unlink className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-left">
                <div className="font-medium">Disconnect</div>
                <div className="text-xs text-muted-foreground">Remove this connection</div>
              </div>
            </button>

            <button
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-destructive/10 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                <Trash2 className="w-4 h-4 text-destructive" />
              </div>
              <div className="text-left">
                <div className="font-medium text-destructive">Delete</div>
                <div className="text-xs text-muted-foreground">Permanently remove</div>
              </div>
            </button>
          </div>

          {/* Footer hint */}
          <div className="px-3 py-2 bg-muted/30 border-t border-border">
            <p className="text-[10px] text-muted-foreground text-center">
              Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Del</kbd> to quick-delete
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
