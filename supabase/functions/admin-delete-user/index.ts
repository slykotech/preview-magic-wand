import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: DeleteUserRequest = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    // Create supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log(`Attempting to delete user with email: ${email}`);

    // First, find the user
    const { data: existingUsers } = await supabase.auth.admin.listUsers({
      filter: `email.eq.${email}`
    });

    if (!existingUsers.users || existingUsers.users.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No user found with this email',
          found_users: 0
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const user = existingUsers.users[0];
    console.log(`Found user: ${user.id}, email: ${user.email}`);

    // Delete the user using admin API
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    // Clean up any remaining data
    await supabase
      .from('pending_verifications')
      .delete()
      .eq('email', email);

    console.log(`Successfully deleted user: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${email} has been completely deleted`,
        deleted_user_id: user.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in admin-delete-user function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);