import { Queue } from 'bullmq';
import { getBullmqConnection } from './redis.js';

export const PORTIQ_QUEUE_NAME = 'portiq-jobs';

let queue: Queue | null = null;

export function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(PORTIQ_QUEUE_NAME, {
      connection: getBullmqConnection(),
    });
  }
  return queue;
}

/**
 * Register BullMQ repeatable jobs — run once globally via worker, not per web instance.
 * No in-process setInterval/cron in the API server.
 */
export async function registerRepeatableJobs(): Promise<void> {
  const q = getQueue();
  await q.add(
    'conviction:decay-refresh',
    {},
    {
      repeat: { pattern: process.env.CONVICTION_DECAY_CRON ?? '0 6 * * *' },
      jobId: 'conviction-decay-refresh',
    },
  );
}
