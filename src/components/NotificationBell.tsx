import React, { useMemo, useState } from 'react';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtimeNotifications();
  const [open, setOpen] = useState(false);

  const sorted = useMemo(() => notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [notifications]);

  return (
    <div className="fixed right-3 z-[120]" style={{ top: `calc(env(safe-area-inset-top, 0px) + 8px)` }}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative rounded-full bg-card/60 backdrop-blur-sm border border-border">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-[10px] leading-5 rounded-full bg-primary text-primary-foreground">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[90vw] sm:w-96">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Button variant="secondary" size="sm" onClick={markAllAsRead} className="gap-1">
                  <CheckCheck className="h-4 w-4" /> Mark all read
                </Button>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-2">
            {sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              sorted.map(n => (
                <button
                  key={n.id}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${n.read ? 'bg-card' : 'bg-primary/5 border-primary/20'}`}
                  onClick={() => {
                    if (n.link_url) window.location.href = n.link_url;
                    markAsRead(n.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-2 w-2 rounded-full ${n.read ? 'bg-muted' : 'bg-primary'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{n.title}</p>
                        {n.link_url && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {n.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default NotificationBell;
