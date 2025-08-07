-- Create the sync function with proper security settings
CREATE OR REPLACE FUNCTION public.sync_revenue_cat_customer(
  p_user_id UUID,
  p_revenue_cat_user_id TEXT,
  p_customer_info JSONB DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update or create subscriber record
  INSERT INTO public.subscribers (
    user_id, 
    revenue_cat_user_id, 
    last_seen,
    custom_attributes
  ) VALUES (
    p_user_id,
    p_revenue_cat_user_id,
    now(),
    COALESCE(p_customer_info -> 'subscriber_attributes', '{}')
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    revenue_cat_user_id = EXCLUDED.revenue_cat_user_id,
    last_seen = now(),
    custom_attributes = COALESCE(p_customer_info -> 'subscriber_attributes', '{}'),
    updated_at = now();

  -- Update entitlements from customer info if provided
  IF p_customer_info ? 'entitlements' THEN
    -- Clear existing entitlements
    UPDATE public.entitlements 
    SET is_active = false, updated_at = now()
    WHERE user_id = p_user_id;

    -- Insert/update active entitlements
    INSERT INTO public.entitlements (
      user_id,
      identifier,
      product_identifier,
      is_active,
      will_renew,
      period_type,
      latest_purchase_date,
      original_purchase_date,
      expiration_date,
      store,
      is_sandbox
    )
    SELECT 
      p_user_id,
      entitlement.key,
      entitlement.value ->> 'product_identifier',
      true,
      COALESCE((entitlement.value ->> 'will_renew')::boolean, false),
      entitlement.value ->> 'period_type',
      CASE 
        WHEN entitlement.value ->> 'latest_purchase_date_ms' IS NOT NULL 
        THEN to_timestamp((entitlement.value ->> 'latest_purchase_date_ms')::bigint / 1000)
        ELSE NULL
      END,
      CASE 
        WHEN entitlement.value ->> 'original_purchase_date_ms' IS NOT NULL 
        THEN to_timestamp((entitlement.value ->> 'original_purchase_date_ms')::bigint / 1000)
        ELSE NULL
      END,
      CASE 
        WHEN entitlement.value ->> 'expiration_date_ms' IS NOT NULL 
        THEN to_timestamp((entitlement.value ->> 'expiration_date_ms')::bigint / 1000)
        ELSE NULL
      END,
      entitlement.value ->> 'store',
      COALESCE((p_customer_info ->> 'is_sandbox')::boolean, false)
    FROM jsonb_each(p_customer_info -> 'entitlements' -> 'active') AS entitlement
    ON CONFLICT (user_id, identifier)
    DO UPDATE SET
      product_identifier = EXCLUDED.product_identifier,
      is_active = EXCLUDED.is_active,
      will_renew = EXCLUDED.will_renew,
      period_type = EXCLUDED.period_type,
      latest_purchase_date = EXCLUDED.latest_purchase_date,
      original_purchase_date = EXCLUDED.original_purchase_date,
      expiration_date = EXCLUDED.expiration_date,
      store = EXCLUDED.store,
      is_sandbox = EXCLUDED.is_sandbox,
      updated_at = now();
  END IF;
END;
$$;