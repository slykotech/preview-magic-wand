import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendPushRequest {
  target_user_id?: string;
  tokens?: string[];
  title: string;
  body?: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");

    if (!FCM_SERVER_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing FCM_SERVER_KEY secret in Edge Functions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const { target_user_id, tokens: directTokens, title, body, data } = (await req.json()) as SendPushRequest;

    if (!title) {
      return new Response(JSON.stringify({ error: "title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let tokens: string[] = directTokens || [];

    if (!tokens.length) {
      if (!target_user_id) {
        return new Response(
          JSON.stringify({ error: "Provide target_user_id or tokens[]" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // RLS: caller can read partner's tokens due to policy
      const { data: tokenRows, error } = await supabase
        .from("push_subscriptions")
        .select("token")
        .eq("user_id", target_user_id)
        .eq("is_active", true);

      if (error) {
        console.error("DB error fetching tokens", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      tokens = (tokenRows || []).map((r: any) => r.token).filter(Boolean);
    }

    if (!tokens.length) {
      return new Response(JSON.stringify({ error: "No tokens to send" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      registration_ids: tokens,
      notification: {
        title,
        body: body || undefined,
      },
      data: data || {},
      priority: "high",
    };

    const fcmResp = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const fcmJson = await fcmResp.json().catch(() => ({}));

    return new Response(
      JSON.stringify({ success: true, tokens_sent: tokens.length, fcm: fcmJson }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-push error", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
