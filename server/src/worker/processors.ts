import { refreshThesisDecay } from '../services/convictionLedger.js';

/** BullMQ job: conviction:decay-refresh — runs once globally, not per web instance. */
export async function processDecayRefresh(): Promise<void> {
  // Future: list conviction_theses due for decay, call refreshThesisDecay per row
  console.log('[worker] conviction:decay-refresh');
  await refreshThesisDecay('stub');
}
