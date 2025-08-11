import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  link_url: string | null;
  read: boolean;
  created_at: string;
};

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const initializedRef = useRef(false);

  const fetchInitial = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setLoading(false);
    if (error) return;
    setNotifications((data || []) as AppNotification[]);
    setUnreadCount((data || []).filter(n => !n.read).length);
  }, [user?.id]);

  // Mark one notification as read
  const markAsRead = useCallback(async (id: string) => {
    const existing = notifications.find(n => n.id === id);
    if (!existing || existing.read) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    const ids = notifications.filter(n => !n.read).map(n => n.id);
    if (!ids.length) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    await supabase.from('notifications').update({ read: true }).in('id', ids);
  }, [notifications]);

  useEffect(() => {
    if (!user?.id) return;
    if (!initializedRef.current) {
      initializedRef.current = true;
      fetchInitial();
    }

    // Subscribe to realtime inserts
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, payload => {
        const n = payload.new as AppNotification;
        // RLS should ensure only our rows come through, but double-check
        if (n.user_id !== user.id) return;
        setNotifications(prev => [n, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + (n.read ? 0 : 1));
        toast(n.title, { description: n.body || undefined, action: n.link_url ? { label: 'Open', onClick: () => { window.location.href = n.link_url!; } } : undefined });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchInitial]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh: fetchInitial };
};
