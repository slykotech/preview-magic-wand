import { supabase } from "@/integrations/supabase/client";

export const triggerEventFetch = async () => {
  try {
    console.log('Triggering event fetch...');
    
    const { data, error } = await supabase.functions.invoke('scheduled-event-fetcher', {
      body: { 
        manual_trigger: true,
        timestamp: new Date().toISOString()
      }
    });
    
    if (error) {
      console.error('Error triggering event fetch:', error);
      throw error;
    }
    
    console.log('Event fetch triggered successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to trigger event fetch:', error);
    throw error;
  }
};