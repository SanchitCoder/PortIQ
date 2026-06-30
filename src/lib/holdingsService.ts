import type { AddHoldingInput, Exchange, Holding } from '../types/portfolio';
import { supabase } from './supabase';

interface HoldingRow {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string;
  quantity: number;
  avg_buy_price: number;
  buy_date: string | null;
  created_at?: string;
}

function rowToHolding(row: HoldingRow): Holding {
  return {
    id: row.id,
    symbol: row.symbol,
    exchange: row.exchange as Exchange,
    quantity: row.quantity,
    avgBuyPrice: row.avg_buy_price,
    buyDate: row.buy_date ?? undefined,
  };
}

/** Load the signed-in user's holdings from Supabase (RLS-scoped). */
export async function fetchHoldingsFromSupabase(): Promise<Holding[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('holdings')
    .select('id, user_id, symbol, exchange, quantity, avg_buy_price, buy_date, created_at')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToHolding);
}

/** Insert a holding for the signed-in user. */
export async function createHoldingInSupabase(input: AddHoldingInput): Promise<Holding> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('holdings')
    .insert({
      user_id: user.id,
      symbol: input.symbol.trim().toUpperCase(),
      exchange: input.exchange,
      quantity: input.quantity,
      avg_buy_price: input.avgBuyPrice,
      buy_date: input.buyDate ?? null,
    })
    .select('id, user_id, symbol, exchange, quantity, avg_buy_price, buy_date')
    .single();

  if (error) throw new Error(error.message);
  return rowToHolding(data);
}

/** Delete a holding owned by the signed-in user. */
export async function deleteHoldingFromSupabase(id: string): Promise<void> {
  const { error } = await supabase.from('holdings').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
