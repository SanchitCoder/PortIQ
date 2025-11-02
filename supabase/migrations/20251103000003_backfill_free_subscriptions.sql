/*
  # Backfill Free Subscriptions for Existing Users

  ## Overview
  Creates "free" subscription entries for any existing users who don't have a subscription record.
  This ensures all existing users have a subscription entry in the database.

  ## Prerequisites
  - The subscriptions table must exist
  - The profiles table must exist
  
  ## What This Migration Does
  Inserts a "free" subscription for each profile that doesn't already have an active subscription
*/

-- Insert free subscriptions for existing users who don't have one
INSERT INTO public.subscriptions (
  user_id,
  plan_id,
  status,
  start_date,
  end_date,
  razorpay_payment_id,
  razorpay_subscription_id
)
SELECT 
  p.id,
  'free',
  'active',
  COALESCE(p.created_at, now()),
  NULL,
  NULL,
  NULL
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.id AND s.status = 'active'
WHERE s.id IS NULL
ON CONFLICT DO NOTHING;

