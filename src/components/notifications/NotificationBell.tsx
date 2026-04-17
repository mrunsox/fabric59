import { useState, useMemo } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

const READ_KEY = "fabric59_notifs_read_at";

export function NotificationBell() {
  const { organization } = useAuth();
  const { data: notifs = [] } = useNotifications();
  const [open, setOpen] = useState(false);
  const [readAt, setReadAt] = useState<number>(() => {
    const stored = localStorage.getItem(READ_KEY);
    return stored ? Number(stored) : 0;
  });

  const unreadCount = useMemo(
    () => notifs.filter((n) => new Date(n.created_at).getTime() > readAt).length,
    [notifs, readAt],
  );

  const markAllRead = () => {
    const now = Date.now();
    localStorage.setItem(READ_KEY, String(now));
    setReadAt(now);
  };

  if (!organization) return null;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) markAllRead(); }}>
      <PopoverTrigger asChild>
        <button
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          <Link to="/admin/notifications" className="text-xs text-primary hover:underline" onClick={() => setOpen(false)}>
            View all
          </Link>
        </div>
        <ScrollArea className="max-h-80">
          {notifs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No notifications</p>
          ) : (
            <ul className="divide-y divide-border">
              {notifs.slice(0, 8).map((n) => (
                <li key={n.id} className="px-4 py-3 hover:bg-muted/30">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {n.trigger_event?.replace(/_/g, " ") ?? "event"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground line-clamp-2">
                    {(n.payload?.message as string) || `${n.channel} to ${n.recipient}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
