import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const fcmKey = Deno.env.get('FCM_SERVER_KEY');

    if (!url || !serviceKey || !fcmKey) {
      return new Response(JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or FCM_SERVER_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(url, serviceKey);

    // Users inactive for 3+ days
    const threshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: inactiveSessions, error: sessErr } = await supabase
      .from('device_sessions')
      .select('user_id, last_active_at')
      .lt('last_active_at', threshold);

    if (sessErr) throw sessErr;

    const userIds = Array.from(new Set((inactiveSessions || []).map((s: any) => s.user_id))).filter(Boolean);

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No inactive users found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: tokens, error: tokErr } = await supabase
      .from('push_subscriptions')
      .select('user_id, token')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (tokErr) throw tokErr;

    // Group tokens per user
    const tokenMap = new Map<string, string[]>();
    (tokens || []).forEach((row: any) => {
      const list = tokenMap.get(row.user_id) || [];
      list.push(row.token);
      tokenMap.set(row.user_id, list);
    });

    let sent = 0;
    for (const [userId, tks] of tokenMap.entries()) {
      if (!tks.length) continue;
      const payload = {
        registration_ids: tks,
        notification: {
          title: 'We miss you at LoveSync',
          body: 'Open the app to check in, plan a date, or leave a sweet note 💕',
        },
        data: { route: '/dashboard' },
        priority: 'high',
      };
      const resp = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `key=${fcmKey}` },
        body: JSON.stringify(payload),
      });
      await resp.json().catch(() => ({}));
      sent += tks.length;
    }

    return new Response(JSON.stringify({ success: true, users: tokenMap.size, tokens_sent: sent }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('engagement-notifier error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
