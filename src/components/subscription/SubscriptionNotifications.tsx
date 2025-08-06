import { useState } from 'react';
import { Bell, X, Crown, AlertTriangle, CreditCard, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';

export const SubscriptionNotifications = () => {
  const { notifications, markNotificationAsRead } = useEnhancedSubscription();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'trial_start':
        return <Crown className="w-4 h-4 text-primary" />;
      case 'trial_ending':
      case 'trial_ended':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'charge_upcoming':
      case 'charge_processed':
        return <CreditCard className="w-4 h-4 text-primary" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-destructive" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = async (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      await markNotificationAsRead(notificationId);
    }
  };

  if (notifications.length === 0) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-white text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b border-border">
          <div className="font-semibold text-foreground">Subscription Updates</div>
          <div className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up!'}
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`border-none rounded-none border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                !notification.is_read ? 'bg-primary/5' : ''
              }`}
              onClick={() => handleNotificationClick(notification.id, notification.is_read)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm text-foreground truncate">
                        {notification.title}
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </div>
                    
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};