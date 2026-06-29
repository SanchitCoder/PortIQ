import { config } from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { createApp, getCorsOrigins } from './app.js';
import { runMigrations } from './db/migrate.js';
import { connectRedis, isRedisConfigured } from './lib/redis.js';
import { getOpenRouterModel, isOpenRouterConfigured } from './lib/openrouter.js';

config({ path: path.resolve(process.cwd(), '.env') });
config({ path: path.resolve(process.cwd(), '../.env') });
config();

const PORT = Number(process.env.PORT ?? 3000);
const HOST = '0.0.0.0';

async function main() {
  await connectRedis();
  await runMigrations();

  const app = createApp();
  const server = createServer(app);

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[portiq-server] Port ${PORT} is already in use. `
        + `Stop the other process: lsof -ti :${PORT} | xargs kill`,
      );
      process.exit(1);
    }
    console.error('[portiq-server] server error:', err);
    process.exit(1);
  });

  server.listen(PORT, HOST, () => {
    console.log(`[portiq-server] listening on http://${HOST}:${PORT}`);
    console.log(`[portiq-server] market provider: ${process.env.MARKET_DATA_PROVIDER ?? 'yahoo'}`);
    console.log(`[portiq-server] OpenRouter: ${isOpenRouterConfigured() ? `enabled (${getOpenRouterModel()})` : 'disabled — using fallbacks'}`);
    console.log(
      `[portiq-server] cache: ${isRedisConfigured() ? 'Redis' : 'in-memory (set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for production)'}`,
    );
    console.log(`[portiq-server] CORS origins: ${getCorsOrigins().join(', ')}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[portiq-server] ${signal} — shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  console.error('[portiq-server] failed to start:', err);
  process.exit(1);
});
