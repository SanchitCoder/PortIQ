# Supabase Migration Setup Guide

## Issue: feature_usage table doesn't exist

The `feature_usage` table needs to be created in your Supabase database. Follow these steps:

## Option 1: Run Migration via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of `supabase/migrations/20251103000001_create_feature_usage_table.sql`
6. Paste it into the SQL Editor
7. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

## Option 2: Run Migration via Supabase CLI

If you have Supabase CLI installed:

```bash
# Login to Supabase (if not already logged in)
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## Option 3: Run SQL Directly

Copy and paste this SQL into your Supabase SQL Editor:

```sql
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own feature usage" ON public.feature_usage;
DROP POLICY IF EXISTS "Users can insert own feature usage" ON public.feature_usage;
DROP POLICY IF EXISTS "Users can update own feature usage" ON public.feature_usage;

-- Create policies
CREATE POLICY "Users can view own feature usage"
  ON public.feature_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feature usage"
  ON public.feature_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feature usage"
  ON public.feature_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS feature_usage_user_id_idx ON public.feature_usage(user_id);
CREATE INDEX IF NOT EXISTS feature_usage_feature_type_idx ON public.feature_usage(feature_type);

-- Create function for updated_at
CREATE OR REPLACE FUNCTION update_feature_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_feature_usage_updated_at ON public.feature_usage;
CREATE TRIGGER update_feature_usage_updated_at
  BEFORE UPDATE ON public.feature_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_usage_updated_at();
```

## Verify Table Creation

After running the migration, verify the table exists:

1. Go to **Table Editor** in Supabase Dashboard
2. You should see `feature_usage` table listed
3. The table should have columns: id, user_id, feature_type, usage_count, created_at, updated_at

## Important Notes

- The `profiles` table must exist before creating `feature_usage` (it has a foreign key reference)
- Make sure RLS (Row Level Security) is enabled on the `feature_usage` table
- The policies ensure users can only see and modify their own usage records

## Troubleshooting

If you still get 404 errors after running the migration:

1. Check that the table is in the `public` schema
2. Verify RLS policies are created correctly
3. Ensure you're using the correct Supabase project URL and anon key
4. Check browser console for detailed error messages

