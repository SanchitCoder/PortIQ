/*
  # Create Feature Usage Table

  ## Overview
  Tracks feature usage for free plan users to enforce lifetime usage limits.
  Limits are one-time only and do not reset. Upgrading to a paid plan provides unlimited access.

  ## New Tables
  1. `feature_usage`
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to profiles.id)
    - `feature_type` (text) - One of: 'portfolio_monitor', 'stock_analyzer', 'alphaedge_evaluator'
    - `usage_count` (integer) - Lifetime usage count for the feature (never resets)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Usage Limits (Free Plan - Lifetime)
  - Portfolio Monitor: 3 uses (total, lifetime)
  - Stock Analyzer: 2 uses (total, lifetime)
  - AlphaEdge Evaluator: 1 use (total, lifetime)
  
  ## Paid Plan
  - All paid plans have unlimited access to all features

  ## Security
  - Enable Row Level Security on feature_usage table
  - Add policy for users to read their own usage
  - Add policy for users to update their own usage
*/

-- Create feature_usage table
CREATE TABLE IF NOT EXISTS public.feature_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_type text NOT NULL CHECK (feature_type IN ('portfolio_monitor', 'stock_analyzer', 'alphaedge_evaluator')),
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, feature_type)
);

-- Enable Row Level Security
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own feature usage" ON public.feature_usage;
DROP POLICY IF EXISTS "Users can insert own feature usage" ON public.feature_usage;
DROP POLICY IF EXISTS "Users can update own feature usage" ON public.feature_usage;

-- Policy: Users can view their own feature usage
CREATE POLICY "Users can view own feature usage"
  ON public.feature_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own feature usage
CREATE POLICY "Users can insert own feature usage"
  ON public.feature_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own feature usage
CREATE POLICY "Users can update own feature usage"
  ON public.feature_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS feature_usage_user_id_idx ON public.feature_usage(user_id);
CREATE INDEX IF NOT EXISTS feature_usage_feature_type_idx ON public.feature_usage(feature_type);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_feature_usage_updated_at ON public.feature_usage;
CREATE TRIGGER update_feature_usage_updated_at
  BEFORE UPDATE ON public.feature_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_usage_updated_at();

