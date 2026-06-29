import { randomUUID } from 'crypto';
import { DEMO_USER_ID } from '../../shared/constants.js';
import type { AddHoldingInput, Holding, UpdateHoldingInput } from '../../shared/api-types.js';
import { query } from './pg.js';

interface HoldingRow {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string;
  quantity: number;
  avg_buy_price: number;
  buy_date: string | null;
}

function rowToHolding(row: HoldingRow): Holding {
  return {
    id: row.id,
    symbol: row.symbol,
    exchange: row.exchange as Holding['exchange'],
    quantity: row.quantity,
    avgBuyPrice: row.avg_buy_price,
    buyDate: row.buy_date ?? undefined,
  };
}

const DEFAULT_USER = process.env.PORTFOLIO_USER_ID ?? DEMO_USER_ID;

/** Postgres-backed holdings — shared across all web instances (was SQLite). */
export async function listHoldings(userId = DEFAULT_USER): Promise<Holding[]> {
  const result = await query<HoldingRow>(
    'SELECT * FROM holdings WHERE user_id = $1 ORDER BY created_at ASC',
    [userId],
  );
  return result.rows.map(rowToHolding);
}

export async function getHolding(id: string, userId = DEFAULT_USER): Promise<Holding | null> {
  const result = await query<HoldingRow>(
    'SELECT * FROM holdings WHERE id = $1 AND user_id = $2',
    [id, userId],
  );
  const row = result.rows[0];
  return row ? rowToHolding(row) : null;
}

export async function createHolding(input: AddHoldingInput, userId = DEFAULT_USER): Promise<Holding> {
  const id = randomUUID();
  await query(
    `INSERT INTO holdings (id, user_id, symbol, exchange, quantity, avg_buy_price, buy_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      userId,
      input.symbol.toUpperCase(),
      input.exchange,
      input.quantity,
      input.avgBuyPrice,
      input.buyDate ?? null,
    ],
  );
  return (await getHolding(id, userId))!;
}

export async function updateHolding(
  id: string,
  input: UpdateHoldingInput,
  userId = DEFAULT_USER,
): Promise<Holding | null> {
  const existing = await getHolding(id, userId);
  if (!existing) return null;

  const updated = {
    symbol: (input.symbol ?? existing.symbol).toUpperCase(),
    exchange: input.exchange ?? existing.exchange,
    quantity: input.quantity ?? existing.quantity,
    avgBuyPrice: input.avgBuyPrice ?? existing.avgBuyPrice,
    buyDate: input.buyDate !== undefined ? input.buyDate : existing.buyDate,
  };

  await query(
    `UPDATE holdings
     SET symbol = $1, exchange = $2, quantity = $3, avg_buy_price = $4, buy_date = $5, updated_at = NOW()
     WHERE id = $6 AND user_id = $7`,
    [
      updated.symbol,
      updated.exchange,
      updated.quantity,
      updated.avgBuyPrice,
      updated.buyDate ?? null,
      id,
      userId,
    ],
  );

  return getHolding(id, userId);
}

export async function deleteHoldingRecord(id: string, userId = DEFAULT_USER): Promise<boolean> {
  const result = await query('DELETE FROM holdings WHERE id = $1 AND user_id = $2', [id, userId]);
  return (result.rowCount ?? 0) > 0;
}
