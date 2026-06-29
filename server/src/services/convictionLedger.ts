import { callOpenRouterChat } from '../lib/openrouter.js';

/**
 * Conviction Ledger AI — routes through centralized OpenRouter + Redis rate limit.
 * HTTP routes not wired yet; worker decay refresh will update conviction_theses in Postgres.
 */
export async function generateThesisNarrative(system: string, user: string): Promise<string> {
  return callOpenRouterChat(system, user);
}

export async function refreshThesisDecay(thesisId: string): Promise<void> {
  // Placeholder until conviction_theses rows are read/written here
  void thesisId;
}
