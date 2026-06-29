import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'bullmq';
import { connectRedis, getBullmqConnection } from '../lib/redis.js';
import { PORTIQ_QUEUE_NAME, registerRepeatableJobs } from '../lib/queue.js';

import { processDecayRefresh } from './processors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env') });
config();

async function main() {
  await connectRedis();
  await registerRepeatableJobs();

  const worker = new Worker(
    PORTIQ_QUEUE_NAME,
    async job => {
      switch (job.name) {
        case 'conviction:decay-refresh':
          await processDecayRefresh();
          return;
        default:
          throw new Error(`Unknown job: ${job.name}`);
      }
    },
    { connection: getBullmqConnection() },
  );

  worker.on('failed', (job, err) => {
    console.error(`[worker] job ${job?.name} failed:`, err);
  });

  console.log('[portiq-worker] listening on queue:', PORTIQ_QUEUE_NAME);
}

main().catch(err => {
  console.error('[portiq-worker] fatal:', err);
  process.exit(1);
});
