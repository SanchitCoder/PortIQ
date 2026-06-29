import dns from 'dns';
import pg from 'pg';

const { Pool } = pg;

/**
 * Shared Postgres pool — durable state lives here (not in process memory).
 * Replaces SQLite for horizontal scaling across web instances.
 */
let pool: pg.Pool | null = null;

function poolSsl(connectionString: string): pg.PoolConfig['ssl'] {
  if (process.env.PG_SSL === 'false') return undefined;
  if (process.env.PG_SSL === 'true') return { rejectUnauthorized: false };
  // Supabase (and most hosted Postgres) require SSL
  if (
    connectionString.includes('supabase.co')
    || connectionString.includes('sslmode=require')
    || connectionString.includes('ssl=true')
  ) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

/** Prefer IPv4 — Railway and similar hosts often cannot reach Supabase over IPv6. */
function ipv4Lookup(
  hostname: string,
  _options: unknown,
  callback: (err: NodeJS.ErrnoException | null, address: string, family?: number) => void,
): void {
  dns.lookup(hostname, { family: 4 }, callback);
}

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required (Postgres / Supabase)');
    }
    pool = new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX ?? 10),
      ssl: poolSsl(connectionString),
      lookup: ipv4Lookup,
    } as pg.PoolConfig);
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
