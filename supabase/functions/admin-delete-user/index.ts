import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Strict, dynamic CORS with an allowlist
const allowedOrigins = new Set<string>([
  "http://127.0.0.1:3000",
  "https://f135fec0-7ff2-4c8c-a0e2-4c5badf6f0b1.lovableproject.com",
]);

const buildCorsHeaders = (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = allowedOrigins.has(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  } as const;
};

interface DeleteUserRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = buildCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require JWT auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Anon client to identify the caller (uses JWT from header)
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      },
    );

    const { data: userData, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !userData?.user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const requesterEmail = userData.user.email ?? "";

    // Check admin whitelist
    const { data: whitelistEntry, error: whitelistError } = await supabaseUser
      .from("admin_whitelist")
      .select("email, full_access")
      .eq("email", requesterEmail)
      .eq("full_access", true)
      .maybeSingle();

    if (whitelistError) {
      console.error("Whitelist check error:", whitelistError);
      return new Response(
        JSON.stringify({ success: false, error: "Authorization check failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!whitelistEntry) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { email }: DeleteUserRequest = await req.json();
    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Service-role client for privileged operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    console.log(`Admin ${requesterEmail} attempting to delete user with email: ${email}`);

    // Find the user
    const { data: existingUsers, error: listErr } = await supabaseService.auth.admin.listUsers({
      filter: `email.eq.${email}`,
    });

    if (listErr) {
      console.error("Error listing users:", listErr);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to query users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!existingUsers.users || existingUsers.users.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No user found with this email", found_users: 0 }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const user = existingUsers.users[0];
    console.log(`Found user: ${user.id}, email: ${user.email}`);

    // Delete the user using admin API
    const { error: deleteError } = await supabaseService.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to delete user: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Clean up any remaining data
    await supabaseService.from("pending_verifications").delete().eq("email", email);

    console.log(`Successfully deleted user: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${email} has been completely deleted`,
        deleted_user_id: user.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error in admin-delete-user function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } },
    );
  }
};

serve(handler);
