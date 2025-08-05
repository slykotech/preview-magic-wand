import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Setup cron jobs for automated event scraping
    const cronJobs = [
      {
        name: 'event-scraping-every-4-hours',
        schedule: '0 */4 * * *', // Every 4 hours
        function_name: 'event-scraper-master',
        description: 'Automated event scraping from all sources'
      },
      {
        name: 'cleanup-expired-events-daily',
        schedule: '0 2 * * *', // Every day at 2 AM
        function_name: 'cleanup-expired-events',
        description: 'Daily cleanup of expired events'
      }
    ];

    const results = [];

    for (const job of cronJobs) {
      try {
        // Create cron job using pg_cron
        const { data, error } = await supabase.rpc('pg_cron_schedule', {
          job_name: job.name,
          cron_schedule: job.schedule,
          sql_command: `
            SELECT net.http_post(
              url := '${Deno.env.get('SUPABASE_URL')}/functions/v1/${job.function_name}',
              headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}"}'::jsonb,
              body := '{"mode": "batch", "automated": true}'::jsonb
            );
          `
        });

        if (error) {
          console.error(`Error setting up cron job ${job.name}:`, error);
          results.push({
            job: job.name,
            success: false,
            error: error.message
          });
        } else {
          console.log(`Successfully set up cron job: ${job.name}`);
          results.push({
            job: job.name,
            success: true,
            schedule: job.schedule,
            description: job.description
          });
        }
      } catch (error) {
        console.error(`Exception setting up cron job ${job.name}:`, error);
        results.push({
          job: job.name,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Cron job setup completed',
      results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error setting up cron jobs:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});