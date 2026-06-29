import { describe, it, expect } from 'vitest';
import {
  DEFAULT_OPENROUTER_MODEL,
  getOpenRouterModelCandidates,
  useJsonResponseFormat,
} from './openrouter.js';

describe('openrouter', () => {
  it('defaults to OpenRouter free router', () => {
    expect(DEFAULT_OPENROUTER_MODEL).toBe('openrouter/free');
  });

  it('includes primary model and free fallbacks', () => {
    const candidates = getOpenRouterModelCandidates();
    expect(candidates[0]).toBeTruthy();
    expect(candidates).toContain('openrouter/free');
    expect(candidates).toContain('google/gemma-4-26b-a4b-it:free');
  });

  it('disables json_object mode for Gemma and free models', () => {
    expect(useJsonResponseFormat('google/gemma-4-26b-a4b-it:free')).toBe(false);
    expect(useJsonResponseFormat('openrouter/free')).toBe(false);
    expect(useJsonResponseFormat('openai/gpt-4o-mini')).toBe(true);
  });
});
