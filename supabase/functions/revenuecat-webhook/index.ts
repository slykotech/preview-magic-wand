import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    type: string;
    id: string;
    app_id: string;
    app_user_id: string;
    original_app_user_id: string;
    aliases: string[];
    is_family_share: boolean;
    country_code: string;
    currency: string;
    environment: string;
    entitlement_id: string | null;
    entitlement_ids: string[];
    original_transaction_id: string;
    period_type: string;
    presented_offering_id: string | null;
    price: number;
    price_in_purchased_currency: number;
    product_id: string;
    purchased_at_ms: number;
    store: string;
    subscriber_attributes: Record<string, any>;
    takehome_percentage: number;
    tax_percentage: number;
    transaction_id: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook authenticity (implement RevenueCat webhook signature verification)
    const authorization = req.headers.get('authorization');
    const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
    
    if (!webhookSecret || !authorization) {
      console.error('Webhook secret or authorization missing');
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    // Parse webhook payload
    const payload: RevenueCatWebhookEvent = await req.json();
    console.log('Received webhook event:', payload.event.type, 'for user:', payload.event.app_user_id);

    // Import Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different event types
    switch (payload.event.type) {
      case 'INITIAL_PURCHASE':
        await handleInitialPurchase(supabase, payload);
        break;
        
      case 'RENEWAL':
        await handleRenewal(supabase, payload);
        break;
        
      case 'CANCELLATION':
        await handleCancellation(supabase, payload);
        break;
        
      case 'NON_RENEWING_PURCHASE':
        await handleNonRenewingPurchase(supabase, payload);
        break;
        
      case 'REFUND':
        await handleRefund(supabase, payload);
        break;
        
      case 'BILLING_ISSUE':
        await handleBillingIssue(supabase, payload);
        break;
        
      case 'EXPIRATION':
        await handleExpiration(supabase, payload);
        break;
        
      case 'UNCANCELLATION':
        await handleUncancellation(supabase, payload);
        break;
        
      default:
        console.log(`Unhandled event type: ${payload.event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleInitialPurchase(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    // Find user by RevenueCat customer ID
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('revenue_cat_customer_id', event.app_user_id)
      .single();

    if (userError || !user) {
      console.error('User not found for customer ID:', event.app_user_id);
      return;
    }

    // Update subscription status
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.user_id,
        status: 'active',
        plan_type: 'premium',
        revenue_cat_customer_id: event.app_user_id,
        revenue_cat_transaction_id: event.transaction_id,
        revenue_cat_original_transaction_id: event.original_transaction_id,
        current_period_end: new Date(event.purchased_at_ms + (30 * 24 * 60 * 60 * 1000)).toISOString(), // Assume monthly
        last_synced_at: new Date().toISOString(),
        product_id: event.product_id,
        store: event.store
      }, {
        onConflict: 'user_id'
      });

    if (subscriptionError) {
      console.error('Failed to update subscription:', subscriptionError);
      return;
    }

    // Create notification
    await supabase
      .from('subscription_notifications')
      .insert({
        user_id: user.user_id,
        notification_type: 'purchase_success',
        title: 'Subscription Activated!',
        message: `Your ${event.product_id} subscription is now active. Welcome to Premium!`
      });

    console.log('Initial purchase processed successfully for user:', user.user_id);
    
  } catch (error) {
    console.error('Error handling initial purchase:', error);
  }
}

async function handleRenewal(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('revenue_cat_customer_id', event.app_user_id)
      .single();

    if (userError || !user) {
      console.error('User not found for renewal:', event.app_user_id);
      return;
    }

    // Update subscription with new period end
    const nextPeriodEnd = new Date(event.purchased_at_ms);
    if (event.period_type === 'TRIAL') {
      nextPeriodEnd.setDate(nextPeriodEnd.getDate() + 7);
    } else if (event.product_id.includes('monthly')) {
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
    } else if (event.product_id.includes('yearly')) {
      nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_end: nextPeriodEnd.toISOString(),
        last_synced_at: new Date().toISOString(),
        billing_issue: false,
        grace_period_end: null
      })
      .eq('user_id', user.user_id);

    if (updateError) {
      console.error('Failed to update subscription for renewal:', updateError);
      return;
    }

    // Create renewal notification
    await supabase
      .from('subscription_notifications')
      .insert({
        user_id: user.user_id,
        notification_type: 'renewal_success',
        title: 'Subscription Renewed',
        message: `Your subscription has been renewed successfully. Next billing: ${nextPeriodEnd.toLocaleDateString()}`
      });

    console.log('Renewal processed successfully for user:', user.user_id);
    
  } catch (error) {
    console.error('Error handling renewal:', error);
  }
}

async function handleRefund(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('revenue_cat_customer_id', event.app_user_id)
      .single();

    if (userError || !user) {
      console.error('User not found for refund:', event.app_user_id);
      return;
    }

    // Update subscription status to cancelled/refunded
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        refund_reason: 'app_store_refund',
        refunded_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .eq('user_id', user.user_id);

    if (updateError) {
      console.error('Failed to update subscription for refund:', updateError);
      return;
    }

    // Revoke partner access if any
    await supabase
      .from('partner_subscriptions')
      .update({ 
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoke_reason: 'primary_subscription_refunded'
      })
      .eq('premium_user_id', user.user_id);

    // Create refund notification
    await supabase
      .from('subscription_notifications')
      .insert({
        user_id: user.user_id,
        notification_type: 'refund_processed',
        title: 'Refund Processed',
        message: 'Your subscription has been refunded. Premium access has been revoked.'
      });

    console.log('Refund processed successfully for user:', user.user_id);
    
  } catch (error) {
    console.error('Error handling refund:', error);
  }
}

async function handleBillingIssue(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('revenue_cat_customer_id', event.app_user_id)
      .single();

    if (userError || !user) {
      console.error('User not found for billing issue:', event.app_user_id);
      return;
    }

    // Set grace period (typically 7 days)
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'billing_issue',
        billing_issue: true,
        grace_period_end: gracePeriodEnd.toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .eq('user_id', user.user_id);

    if (updateError) {
      console.error('Failed to update subscription for billing issue:', updateError);
      return;
    }

    // Create urgent notification
    await supabase
      .from('subscription_notifications')
      .insert({
        user_id: user.user_id,
        notification_type: 'billing_issue',
        title: 'Payment Method Issue',
        message: `There's an issue with your payment method. Please update it by ${gracePeriodEnd.toLocaleDateString()} to avoid service interruption.`,
        action_required: true
      });

    console.log('Billing issue processed for user:', user.user_id);
    
  } catch (error) {
    console.error('Error handling billing issue:', error);
  }
}

async function handleCancellation(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('revenue_cat_customer_id', event.app_user_id)
      .single();

    if (userError || !user) {
      console.error('User not found for cancellation:', event.app_user_id);
      return;
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .eq('user_id', user.user_id);

    if (updateError) {
      console.error('Failed to update subscription for cancellation:', updateError);
      return;
    }

    // Create cancellation notification
    await supabase
      .from('subscription_notifications')
      .insert({
        user_id: user.user_id,
        notification_type: 'cancellation_confirmed',
        title: 'Subscription Cancelled',
        message: 'Your subscription has been cancelled. Premium features will remain active until your current period ends.'
      });

    console.log('Cancellation processed for user:', user.user_id);
    
  } catch (error) {
    console.error('Error handling cancellation:', error);
  }
}

async function handleExpiration(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('revenue_cat_customer_id', event.app_user_id)
      .single();

    if (userError || !user) {
      console.error('User not found for expiration:', event.app_user_id);
      return;
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'expired',
        expired_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .eq('user_id', user.user_id);

    if (updateError) {
      console.error('Failed to update subscription for expiration:', updateError);
      return;
    }

    // Revoke partner access
    await supabase
      .from('partner_subscriptions')
      .update({ 
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoke_reason: 'primary_subscription_expired'
      })
      .eq('premium_user_id', user.user_id);

    // Create expiration notification
    await supabase
      .from('subscription_notifications')
      .insert({
        user_id: user.user_id,
        notification_type: 'subscription_expired',
        title: 'Subscription Expired',
        message: 'Your subscription has expired. Renew to continue enjoying premium features!'
      });

    console.log('Expiration processed for user:', user.user_id);
    
  } catch (error) {
    console.error('Error handling expiration:', error);
  }
}

async function handleUncancellation(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('revenue_cat_customer_id', event.app_user_id)
      .single();

    if (userError || !user) {
      console.error('User not found for uncancellation:', event.app_user_id);
      return;
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        cancelled_at: null,
        last_synced_at: new Date().toISOString()
      })
      .eq('user_id', user.user_id);

    if (updateError) {
      console.error('Failed to update subscription for uncancellation:', updateError);
      return;
    }

    // Create reactivation notification
    await supabase
      .from('subscription_notifications')
      .insert({
        user_id: user.user_id,
        notification_type: 'subscription_reactivated',
        title: 'Subscription Reactivated',
        message: 'Great news! Your subscription has been reactivated and will continue as scheduled.'
      });

    console.log('Uncancellation processed for user:', user.user_id);
    
  } catch (error) {
    console.error('Error handling uncancellation:', error);
  }
}

async function handleNonRenewingPurchase(supabase: any, payload: RevenueCatWebhookEvent) {
  // Handle one-time purchases if you have any
  console.log('Non-renewing purchase event received:', payload.event.product_id);
}