-- =============================================================================
-- PortIQ — Full Supabase schema (single file)
-- Run in: Supabase Dashboard → SQL Editor → New query → Paste → Run
--
-- Covers:
--   • Auth profiles (extends auth.users)
--   • Subscriptions & Razorpay billing
--   • Feature usage limits (free tier)
--   • Portfolio holdings (backend + client)
--   • Conviction Ledger theses (future backend)
--   • schema_migrations (Express server auto-migrate compatibility)
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. PROFILES (linked to Supabase Auth)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 2. SUBSCRIPTIONS (free / monthly / quarterly / yearly)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id                  text NOT NULL CHECK (plan_id IN ('free', 'monthly', 'quarterly', 'yearly')),
  status                   text NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')) DEFAULT 'active',
  start_date               timestamptz NOT NULL DEFAULT now(),
  end_date                 timestamptz,
  razorpay_payment_id      text,
  razorpay_subscription_id text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS subscriptions_plan_id_idx ON public.subscriptions(plan_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can insert own subscriptions"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update own subscriptions"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-create free subscription when profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = NEW.id AND status = 'active'
  ) THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status, start_date, end_date)
    VALUES (NEW.id, 'free', 'active', now(), NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_subscription ON public.profiles;
CREATE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_subscription();

CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_subscriptions_updated_at();

-- =============================================================================
-- 3. FEATURE USAGE (free-tier lifetime limits)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.feature_usage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_type  text NOT NULL CHECK (feature_type IN (
    'portfolio_monitor',
    'stock_analyzer',
    'alphaedge_evaluator'
  )),
  usage_count   integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature_type)
);

CREATE INDEX IF NOT EXISTS feature_usage_user_id_idx ON public.feature_usage(user_id);
CREATE INDEX IF NOT EXISTS feature_usage_feature_type_idx ON public.feature_usage(feature_type);

ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feature usage" ON public.feature_usage;
CREATE POLICY "Users can view own feature usage"
  ON public.feature_usage FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own feature usage" ON public.feature_usage;
CREATE POLICY "Users can insert own feature usage"
  ON public.feature_usage FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own feature usage" ON public.feature_usage;
CREATE POLICY "Users can update own feature usage"
  ON public.feature_usage FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_feature_usage_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_feature_usage_updated_at ON public.feature_usage;
CREATE TRIGGER update_feature_usage_updated_at
  BEFORE UPDATE ON public.feature_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_feature_usage_updated_at();

-- =============================================================================
-- 4. PORTFOLIO HOLDINGS (Supabase — frontend CRUD with RLS; Express API optional legacy)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.holdings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  symbol         text NOT NULL,
  exchange       text NOT NULL CHECK (exchange IN ('NSE', 'BSE', 'NYSE', 'NASDAQ')),
  quantity       double precision NOT NULL CHECK (quantity > 0),
  avg_buy_price  double precision NOT NULL CHECK (avg_buy_price > 0),
  buy_date       date,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holdings_user ON public.holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_user_symbol ON public.holdings(user_id, symbol, exchange);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own holdings" ON public.holdings;
CREATE POLICY "Users can view own holdings"
  ON public.holdings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own holdings" ON public.holdings;
CREATE POLICY "Users can insert own holdings"
  ON public.holdings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own holdings" ON public.holdings;
CREATE POLICY "Users can update own holdings"
  ON public.holdings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own holdings" ON public.holdings;
CREATE POLICY "Users can delete own holdings"
  ON public.holdings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_holdings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_holdings_updated_at ON public.holdings;
CREATE TRIGGER update_holdings_updated_at
  BEFORE UPDATE ON public.holdings
  FOR EACH ROW EXECUTE FUNCTION public.update_holdings_updated_at();

-- Demo user holdings work without a profiles row (Express API uses service DB role)
ALTER TABLE public.holdings DROP CONSTRAINT IF EXISTS holdings_user_id_fkey;

-- =============================================================================
-- 5. CONVICTION LEDGER (investment theses — UI mock → future API)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.conviction_theses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticker         text NOT NULL,
  company        text,
  exchange       text CHECK (exchange IN ('NSE', 'BSE', 'NYSE', 'NASDAQ')),
  entry_date     date,
  buy_price      numeric(18, 4) NOT NULL,
  target_price   numeric(18, 4),
  thesis         text NOT NULL,
  invalidation   text,
  conviction     smallint NOT NULL DEFAULT 5 CHECK (conviction BETWEEN 1 AND 10),
  status         text NOT NULL DEFAULT 'intact' CHECK (status IN ('intact', 'weakening', 'broken')),
  thesis_decay   smallint NOT NULL DEFAULT 0 CHECK (thesis_decay BETWEEN 0 AND 100),
  last_decay_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conviction_theses_user_id_idx ON public.conviction_theses(user_id);
CREATE INDEX IF NOT EXISTS conviction_theses_status_idx ON public.conviction_theses(user_id, status);

ALTER TABLE public.conviction_theses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own theses" ON public.conviction_theses;
CREATE POLICY "Users can view own theses"
  ON public.conviction_theses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own theses" ON public.conviction_theses;
CREATE POLICY "Users can insert own theses"
  ON public.conviction_theses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own theses" ON public.conviction_theses;
CREATE POLICY "Users can update own theses"
  ON public.conviction_theses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own theses" ON public.conviction_theses;
CREATE POLICY "Users can delete own theses"
  ON public.conviction_theses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_conviction_theses_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_conviction_theses_updated_at ON public.conviction_theses;
CREATE TRIGGER update_conviction_theses_updated_at
  BEFORE UPDATE ON public.conviction_theses
  FOR EACH ROW EXECUTE FUNCTION public.update_conviction_theses_updated_at();

-- =============================================================================
-- 6. SERVER MIGRATION TRACKING (Express backend uses DATABASE_URL)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id          text PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);

-- Mark holdings migration as applied so Express does not re-run a conflicting DDL
INSERT INTO public.schema_migrations (id)
VALUES ('001_holdings.sql')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 7. GRANTS
-- =============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.feature_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holdings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conviction_theses TO authenticated;

-- =============================================================================
-- 8. BACKFILL (safe to re-run — skips existing rows)
-- =============================================================================

-- Profiles for users created before this schema was applied
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  u.created_at,
  u.updated_at
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Free subscriptions for profiles without an active plan
INSERT INTO public.subscriptions (user_id, plan_id, status, start_date, end_date)
SELECT
  p.id,
  'free',
  'active',
  COALESCE(p.created_at, now()),
  NULL
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.id AND s.status = 'active'
WHERE s.id IS NULL
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Done. Verify in Table Editor: profiles, subscriptions, feature_usage,
-- holdings, conviction_theses, schema_migrations
-- =============================================================================
