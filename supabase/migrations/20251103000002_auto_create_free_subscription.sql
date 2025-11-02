/*
  # Auto-create Free Subscription on User Signup

  ## Overview
  Automatically creates a "free" subscription entry when a new user profile is created.
  This ensures every user has a subscription record in the database from the start.

  ## Prerequisites
  - The subscriptions table must exist (created in 20251103000000_create_subscriptions_table.sql)
  - The profiles table must exist (created in 20251102093505_create_users_table.sql)
  
  ## What This Migration Does
  1. Creates a function that automatically creates a "free" subscription when a profile is inserted
  2. Adds a trigger to the profiles table to call this function on INSERT
  3. Uses SECURITY DEFINER to bypass RLS when creating subscriptions during signup
*/

-- Function to automatically create a free subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_profile_subscription()
RETURNS trigger AS $$
BEGIN
  -- Check if user already has an active subscription (safety check)
  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = NEW.id AND status = 'active'
  ) THEN
    -- Create a free subscription for the new user
    INSERT INTO public.subscriptions (
      user_id,
      plan_id,
      status,
      start_date,
      end_date,
      razorpay_payment_id,
      razorpay_subscription_id
    )
    VALUES (
      NEW.id,
      'free',
      'active',
      now(),
      NULL, -- Free plan has no end date
      NULL,
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call function when a new profile is created
DROP TRIGGER IF EXISTS on_profile_created_subscription ON public.profiles;
CREATE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_profile_subscription();

