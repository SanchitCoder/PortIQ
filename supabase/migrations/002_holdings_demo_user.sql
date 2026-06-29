-- Demo holdings: allow user_id without a profiles row (static demo login uses a fixed UUID)
ALTER TABLE public.holdings DROP CONSTRAINT IF EXISTS holdings_user_id_fkey;
