/*
  # Create Subscriptions Table

  ## Overview
  Sets up subscription management system for PortIQ platform to track user plans and payments.

  ## Prerequisites
  - The profiles table must exist (created in 20251102093505_create_users_table.sql)
  - Run this migration AFTER the profiles migration

  ## New Tables
  1. `subscriptions`
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to profiles.id)
    - `plan_id` (text) - One of: 'free', 'monthly', 'quarterly', 'yearly'
    - `status` (text) - One of: 'active', 'cancelled', 'expired'
    - `start_date` (timestamptz) - Subscription start date
    - `end_date` (timestamptz, nullable) - Subscription end date
    - `razorpay_payment_id` (text, nullable) - Razorpay payment ID
    - `razorpay_subscription_id` (text, nullable) - Razorpay subscription ID (for recurring)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - Enable Row Level Security on subscriptions table
  - Add policy for users to read their own subscriptions
  - Add policy for users to insert their own subscriptions
  - Add policy for users to update their own subscriptions
*/

-- Ensure profiles table exists (if not, create a basic one)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    CREATE TABLE IF NOT EXISTS public.profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email text NOT NULL,
      full_name text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id text NOT NULL CHECK (plan_id IN ('free', 'monthly', 'quarterly', 'yearly')),
  status text NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')) DEFAULT 'active',
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  razorpay_payment_id text,
  razorpay_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS subscriptions_plan_id_idx ON public.subscriptions(plan_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

