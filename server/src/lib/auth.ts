import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';

let supabaseAuth: SupabaseClient | null = null;

function getSupabaseAuth(): SupabaseClient | null {
  if (supabaseAuth) return supabaseAuth;

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_ANON_KEY?.trim()
    ?? process.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    console.warn('[auth] SUPABASE_URL and SUPABASE_ANON_KEY not set — portfolio API cannot verify users');
    return null;
  }

  supabaseAuth = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseAuth;
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export async function resolveUserId(req: Request): Promise<string | null> {
  const token = bearerToken(req);
  if (!token) return null;

  const supabase = getSupabaseAuth();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return data.user.id;
}

/** Require a valid Supabase JWT; sets req.userId for downstream handlers. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized — sign in required' });
      return;
    }
    req.userId = userId;
    next();
  } catch (err) {
    console.error('[auth] verify failed:', err);
    res.status(401).json({ error: 'Unauthorized' });
  }
}
