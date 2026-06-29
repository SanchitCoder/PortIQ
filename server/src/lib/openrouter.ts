import OpenAI from 'openai';
import { consumeGlobalRateLimit } from './rateLimit.js';

/**
 * Centralized OpenRouter client + global Redis rate limiter.
 * Portfolio analyze, stress-test, and Conviction Ledger AI MUST use callOpenRouterChat.
 */
let client: OpenAI | null = null;

/** OpenRouter free-tier router — auto-picks an available $0 model (best for dev). */
export const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';

const MODEL_FALLBACKS = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
] as const;

export function getOpenRouterClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }
    client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL ?? 'http://localhost:5173',
        'X-Title': process.env.OPENROUTER_APP_TITLE ?? 'PortIQ',
      },
    });
  }
  return client;
}

export function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
}

/** Primary model first, then known-good free fallbacks (deduped). */
export function getOpenRouterModelCandidates(): string[] {
  const primary = getOpenRouterModel();
  return [...new Set([primary, ...MODEL_FALLBACKS])];
}

export const AI_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 25_000);
export const AI_TEMPERATURE = Number(process.env.OPENROUTER_TEMPERATURE ?? 0.2);

export function isRateLimitError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status;
    return status === 429 || status === 402;
  }
  return false;
}

function isModelNotFoundError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    return (err as { status: number }).status === 404;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /model.*not found|no endpoints found|invalid model/i.test(msg);
}

function isJsonModeUnsupported(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status;
    if (status === 400 || status === 422) return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /response_format|json_object|not support/i.test(msg);
}

/** Gemma free models do not reliably support OpenAI json_object mode — use prompt + llmJson instead. */
export function useJsonResponseFormat(model: string): boolean {
  const m = model.toLowerCase();
  if (m.includes('gemma')) return false;
  if (m.includes(':free')) return false;
  if (m.startsWith('openrouter/')) return false;
  return true;
}

/** True when OPENROUTER_API_KEY is set — AI layers skip the network call when false. */
export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export class OpenRouterNotConfiguredError extends Error {
  constructor() {
    super('OPENROUTER_API_KEY is not set');
    this.name = 'OpenRouterNotConfiguredError';
  }
}

let notConfiguredLogged = false;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isLocalRateLimitError(err: unknown): boolean {
  return err instanceof Error && err.message === 'Rate limit exceeded';
}

async function requestChatCompletionWithRetry(
  model: string,
  system: string,
  user: string,
  withJsonMode: boolean,
): Promise<string> {
  const maxAttempts = Number(process.env.OPENROUTER_429_RETRIES ?? 2);
  let lastErr: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await requestChatCompletion(model, system, user, withJsonMode);
    } catch (err) {
      lastErr = err;
      if (isRateLimitError(err) && attempt < maxAttempts - 1) {
        const delayMs = 1500 * (attempt + 1);
        console.warn(`[openrouter] Rate limited on ${model} — retry in ${delayMs}ms (${attempt + 1}/${maxAttempts - 1})`);
        await sleep(delayMs);
        continue;
      }
      throw err;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('OpenRouter request failed');
}

/** Single chat completion (no retry). */
async function requestChatCompletion(
  model: string,
  system: string,
  user: string,
  withJsonMode: boolean,
): Promise<string> {
  const openai = getOpenRouterClient();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model,
      temperature: AI_TEMPERATURE,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    };
    if (withJsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const response = await openai.chat.completions.create(body, { signal: controller.signal });
    const content = response.choices[0]?.message?.content?.trim() ?? '';
    if (!content) {
      throw new Error(`OpenRouter returned empty content (model: ${model})`);
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/** Global OpenRouter chat — Redis rate limit shared across web + worker instances. */
export async function callOpenRouterChat(
  system: string,
  user: string,
  options?: { retry?: boolean },
): Promise<string> {
  if (!isOpenRouterConfigured()) {
    if (!notConfiguredLogged) {
      console.warn(
        '[openrouter] OPENROUTER_API_KEY not set — AI features use deterministic fallbacks. Add a key to .env to enable.',
      );
      notConfiguredLogged = true;
    }
    throw new OpenRouterNotConfiguredError();
  }

  const perMinute = Number(process.env.OPENROUTER_RATE_LIMIT_PER_MINUTE ?? 20);
  const perDay = Number(process.env.OPENROUTER_RATE_LIMIT_PER_DAY ?? 200);

  try {
    await consumeGlobalRateLimit('portiq:openrouter:rl:minute', perMinute, 60);
    await consumeGlobalRateLimit('portiq:openrouter:rl:day', perDay, 86_400);
  } catch (err) {
    if (isLocalRateLimitError(err)) {
      console.warn('[openrouter] PortIQ local rate limit — wait or raise OPENROUTER_RATE_LIMIT_PER_MINUTE');
    }
    throw err;
  }

  const userMessage = options?.retry ? `${user}\n\nReturn valid JSON only. No markdown.` : user;
  const candidates = getOpenRouterModelCandidates();
  let lastErr: unknown;
  let sawApiRateLimit = false;

  for (const model of candidates) {
    const jsonModes = useJsonResponseFormat(model) ? [true, false] : [false];

    for (const withJsonMode of jsonModes) {
      try {
        const content = await requestChatCompletionWithRetry(
          model, system, userMessage, withJsonMode,
        );
        if (model !== candidates[0]) {
          console.warn(`[openrouter] Used fallback model: ${model}`);
        }
        return content;
      } catch (err) {
        lastErr = err;
        if (isJsonModeUnsupported(err) && withJsonMode) {
          continue;
        }
        if (isModelNotFoundError(err)) {
          console.warn(`[openrouter] Model unavailable: ${model}`);
          break;
        }
        if (isRateLimitError(err)) {
          sawApiRateLimit = true;
          console.warn(`[openrouter] OpenRouter rate limit on ${model} — trying next model`);
          break;
        }
      }
    }
  }

  if (sawApiRateLimit) {
    const err = new Error('OpenRouter rate limit exceeded on all models') as Error & { status: number };
    err.status = 429;
    throw err;
  }

  throw lastErr instanceof Error ? lastErr : new Error('OpenRouter request failed');
}
