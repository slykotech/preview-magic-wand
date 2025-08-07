import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-revenuecat-signature',
}

interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    id: string;
    type: string;
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
    console.log('🔗 RevenueCat webhook received');
    
    // Get webhook body
    const rawBody = await req.text();
    const payload: RevenueCatWebhookEvent = JSON.parse(rawBody);
    
    // Verify webhook signature for security
    const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
    const signature = req.headers.get('x-revenuecat-signature');
    
    if (webhookSecret && signature) {
      const hmac = createHmac('sha256', webhookSecret);
      hmac.update(rawBody);
      const computedSignature = `v1=${hmac.digest('hex')}`;
      
      if (signature !== computedSignature) {
        console.error('❌ Webhook signature verification failed');
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }
      console.log('✅ Webhook signature verified');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`📥 Processing ${payload.event.type} for user: ${payload.event.app_user_id}`);

    // Store webhook signature for security audit
    await supabase
      .from('webhook_signatures')
      .insert({
        webhook_id: payload.event.id,
        signature: signature || 'no-signature',
        verified: !!signature,
        source: 'revenuecat'
      });

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

      case 'PRODUCT_CHANGE':
        await handleProductChange(supabase, payload);
        break;

      case 'TRANSFER':
        await handleTransfer(supabase, payload);
        break;
        
      default:
        console.log(`⚠️ Unhandled event type: ${payload.event.type}`);
    }

    console.log('✅ Webhook processed successfully');
    return new Response(
      JSON.stringify({ received: true }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed', details: error.message }), 
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
    console.log('💳 Processing initial purchase');

    // Find user by RevenueCat customer ID (app_user_id should be the actual user ID)
    const userId = event.app_user_id;

    // Calculate trial and subscription periods
    const currentDate = new Date(event.purchased_at_ms);
    let trialEndDate = null;
    let currentPeriodEnd = new Date(currentDate);

    // Handle trial period
    if (event.period_type === 'TRIAL') {
      trialEndDate = new Date(currentDate);
      trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial
      currentPeriodEnd = new Date(trialEndDate);
    }

    // Calculate billing period end
    if (event.product_id.includes('monthly')) {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    } else if (event.product_id.includes('quarterly')) {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 3);
    } else if (event.product_id.includes('yearly')) {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    }

    // Update or create subscription
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        status: event.period_type === 'TRIAL' ? 'trial' : 'active',
        plan_type: 'premium',
        revenue_cat_customer_id: event.app_user_id,
        revenue_cat_transaction_id: event.transaction_id,
        revenue_cat_original_transaction_id: event.original_transaction_id,
        revenue_cat_environment: event.environment,
        current_period_end: currentPeriodEnd.toISOString(),
        trial_end_date: trialEndDate?.toISOString(),
        last_synced_at: new Date().toISOString(),
        product_id: event.product_id,
        store: event.store,
        price: event.price,
        currency: event.currency,
        country_code: event.country_code,
        is_family_share: event.is_family_share,
        takehome_percentage: event.takehome_percentage,
        tax_percentage: event.tax_percentage,
        presented_offering_id: event.presented_offering_id
      }, {
        onConflict: 'user_id'
      });

    if (subscriptionError) {
      console.error('Failed to update subscription:', subscriptionError);
      return;
    }

    // Create subscription event for analytics
    await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'initial_purchase',
        event_data: {
          transaction_id: event.transaction_id,
          product_id: event.product_id,
          price: event.price,
          currency: event.currency,
          store: event.store,
          period_type: event.period_type,
          environment: event.environment
        },
        revenue_cat_event_id: event.id
      });

    // Create notification
    const notificationMessage = event.period_type === 'TRIAL' 
      ? `Your 7-day free trial has started! Enjoy unlimited access to premium features.`
      : `Your ${event.product_id} subscription is now active. Welcome to Premium!`;

    await supabase
      .from('subscription_notifications')
      .insert({
        user_id: userId,
        notification_type: event.period_type === 'TRIAL' ? 'trial_started' : 'purchase_success',
        title: event.period_type === 'TRIAL' ? '🎉 Trial Started!' : 'Subscription Activated!',
        message: notificationMessage
      });

    console.log('✅ Initial purchase processed successfully for user:', userId);
    
  } catch (error) {
    console.error('❌ Error handling initial purchase:', error);
  }
}

async function handleRenewal(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    console.log('🔄 Processing renewal');
    const userId = event.app_user_id;

    // Calculate new period end
    const renewalDate = new Date(event.purchased_at_ms);
    let nextPeriodEnd = new Date(renewalDate);
    
    if (event.product_id.includes('monthly')) {
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
    } else if (event.product_id.includes('quarterly')) {
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 3);
    } else if (event.product_id.includes('yearly')) {
      nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
    }

    // Update subscription
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_end: nextPeriodEnd.toISOString(),
        last_synced_at: new Date().toISOString(),
        billing_issue: false,
        grace_period_end: null,
        revenue_cat_transaction_id: event.transaction_id
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update subscription for renewal:', updateError);
      return;
    }

    // Create renewal event
    await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'renewal',
        event_data: {
          transaction_id: event.transaction_id,
          product_id: event.product_id,
          price: event.price,
          currency: event.currency,
          next_billing_date: nextPeriodEnd.toISOString()
        },
        revenue_cat_event_id: event.id
      });

    // Create renewal notification
    await supabase
      .from('subscription_notifications')
      .insert({
        user_id: userId,
        notification_type: 'renewal_success',
        title: 'Subscription Renewed',
        message: `Your subscription has been renewed successfully. Next billing: ${nextPeriodEnd.toLocaleDateString()}`
      });

    console.log('✅ Renewal processed successfully for user:', userId);
    
  } catch (error) {
    console.error('❌ Error handling renewal:', error);
  }
}

async function handleRefund(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    console.log('💸 Processing refund');
    const userId = event.app_user_id;

    // Update subscription status
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        refund_reason: 'store_refund',
        refunded_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update subscription for refund:', updateError);
      return;
    }

    // Revoke partner access
    await supabase
      .from('partner_subscriptions')
      .update({ 
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoke_reason: 'primary_subscription_refunded'
      })
      .eq('premium_user_id', userId);

    // Create refund event
    await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'refund',
        event_data: {
          transaction_id: event.transaction_id,
          product_id: event.product_id,
          refund_amount: event.price,
          currency: event.currency
        },
        revenue_cat_event_id: event.id
      });

    // Create refund notification
    await supabase
      .from('subscription_notifications')
      .insert({
        user_id: userId,
        notification_type: 'refund_processed',
        title: 'Refund Processed',
        message: 'Your subscription has been refunded. Premium access has been revoked.'
      });

    console.log('✅ Refund processed successfully for user:', userId);
    
  } catch (error) {
    console.error('❌ Error handling refund:', error);
  }
}

async function handleBillingIssue(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    console.log('⚠️ Processing billing issue');
    const userId = event.app_user_id;

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
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update subscription for billing issue:', updateError);
      return;
    }

    // Create billing issue event
    await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'billing_issue',
        event_data: {
          grace_period_end: gracePeriodEnd.toISOString(),
          product_id: event.product_id
        },
        revenue_cat_event_id: event.id
      });

    // Create urgent notification
    await supabase
      .from('subscription_notifications')
      .insert({
        user_id: userId,
        notification_type: 'billing_issue',
        title: 'Payment Method Issue',
        message: `There's an issue with your payment method. Please update it by ${gracePeriodEnd.toLocaleDateString()} to avoid service interruption.`,
        action_required: true
      });

    console.log('✅ Billing issue processed for user:', userId);
    
  } catch (error) {
    console.error('❌ Error handling billing issue:', error);
  }
}

async function handleCancellation(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    console.log('❌ Processing cancellation');
    const userId = event.app_user_id;

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update subscription for cancellation:', updateError);
      return;
    }

    // Create cancellation event
    await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'cancellation',
        event_data: {
          product_id: event.product_id,
          cancelled_at: new Date().toISOString()
        },
        revenue_cat_event_id: event.id
      });

    // Create cancellation notification
    await supabase
      .from('subscription_notifications')
      .insert({
        user_id: userId,
        notification_type: 'cancellation_confirmed',
        title: 'Subscription Cancelled',
        message: 'Your subscription has been cancelled. Premium features will remain active until your current period ends.'
      });

    console.log('✅ Cancellation processed for user:', userId);
    
  } catch (error) {
    console.error('❌ Error handling cancellation:', error);
  }
}

async function handleExpiration(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    console.log('⏰ Processing expiration');
    const userId = event.app_user_id;

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'expired',
        expired_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .eq('user_id', userId);

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
      .eq('premium_user_id', userId);

    // Create expiration event
    await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'expiration',
        event_data: {
          product_id: event.product_id,
          expired_at: new Date().toISOString()
        },
        revenue_cat_event_id: event.id
      });

    // Create expiration notification
    await supabase
      .from('subscription_notifications')
      .insert({
        user_id: userId,
        notification_type: 'subscription_expired',
        title: 'Subscription Expired',
        message: 'Your subscription has expired. Renew to continue enjoying premium features!'
      });

    console.log('✅ Expiration processed for user:', userId);
    
  } catch (error) {
    console.error('❌ Error handling expiration:', error);
  }
}

async function handleUncancellation(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    console.log('🔄 Processing uncancellation');
    const userId = event.app_user_id;

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        cancelled_at: null,
        last_synced_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update subscription for uncancellation:', updateError);
      return;
    }

    // Create reactivation event
    await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'uncancellation',
        event_data: {
          product_id: event.product_id,
          reactivated_at: new Date().toISOString()
        },
        revenue_cat_event_id: event.id
      });

    // Create reactivation notification
    await supabase
      .from('subscription_notifications')
      .insert({
        user_id: userId,
        notification_type: 'subscription_reactivated',
        title: 'Subscription Reactivated',
        message: 'Great news! Your subscription has been reactivated and will continue as scheduled.'
      });

    console.log('✅ Uncancellation processed for user:', userId);
    
  } catch (error) {
    console.error('❌ Error handling uncancellation:', error);
  }
}

async function handleProductChange(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    console.log('🔄 Processing product change');
    const userId = event.app_user_id;

    // Calculate new period end based on new product
    const changeDate = new Date(event.purchased_at_ms);
    let nextPeriodEnd = new Date(changeDate);
    
    if (event.product_id.includes('monthly')) {
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
    } else if (event.product_id.includes('quarterly')) {
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 3);
    } else if (event.product_id.includes('yearly')) {
      nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        product_id: event.product_id,
        price: event.price,
        current_period_end: nextPeriodEnd.toISOString(),
        last_synced_at: new Date().toISOString(),
        revenue_cat_transaction_id: event.transaction_id
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update subscription for product change:', updateError);
      return;
    }

    // Create product change event
    await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'product_change',
        event_data: {
          new_product_id: event.product_id,
          new_price: event.price,
          currency: event.currency,
          next_billing_date: nextPeriodEnd.toISOString()
        },
        revenue_cat_event_id: event.id
      });

    console.log('✅ Product change processed for user:', userId);
    
  } catch (error) {
    console.error('❌ Error handling product change:', error);
  }
}

async function handleTransfer(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    console.log('🔄 Processing transfer');
    const userId = event.app_user_id;

    // Create transfer event for tracking
    await supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'transfer',
        event_data: {
          product_id: event.product_id,
          transferred_at: new Date().toISOString(),
          store: event.store
        },
        revenue_cat_event_id: event.id
      });

    console.log('✅ Transfer processed for user:', userId);
    
  } catch (error) {
    console.error('❌ Error handling transfer:', error);
  }
}

async function handleNonRenewingPurchase(supabase: any, payload: RevenueCatWebhookEvent) {
  const { event } = payload;
  
  try {
    console.log('💰 Processing non-renewing purchase');
    
    // Create event for tracking
    await supabase
      .from('subscription_events')
      .insert({
        user_id: event.app_user_id,
        event_type: 'non_renewing_purchase',
        event_data: {
          product_id: event.product_id,
          price: event.price,
          currency: event.currency,
          store: event.store
        },
        revenue_cat_event_id: event.id
      });

    console.log('✅ Non-renewing purchase logged for user:', event.app_user_id);
    
  } catch (error) {
    console.error('❌ Error handling non-renewing purchase:', error);
  }
}