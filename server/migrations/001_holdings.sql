-- Portfolio holdings (Postgres — shared across web instances; was SQLite)

CREATE TABLE IF NOT EXISTS holdings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL CHECK (exchange IN ('NSE', 'BSE', 'NYSE', 'NASDAQ')),
  quantity DOUBLE PRECISION NOT NULL,
  avg_buy_price DOUBLE PRECISION NOT NULL,
  buy_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holdings_user ON holdings(user_id);
