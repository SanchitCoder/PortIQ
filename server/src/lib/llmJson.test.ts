import { describe, it, expect } from 'vitest';
import { alignStringArray, extractJsonSubstring, parseLlmJson } from './llmJson.js';
import { z } from 'zod';

describe('llmJson', () => {
  it('extracts JSON from markdown-wrapped prose', () => {
    const raw = 'Here is the result:\n```json\n{"insights":["a"],"suggestedActions":["b"]}\n```\nThanks.';
    const parsed = parseLlmJson(raw) as { insights: string[] };
    expect(parsed.insights).toEqual(['a']);
  });

  it('extracts JSON object embedded in text', () => {
    const raw = 'Sure! {"ok":true,"n":1} Hope that helps.';
    expect(parseLlmJson(raw)).toEqual({ ok: true, n: 1 });
  });

  it('validates with zod schema', () => {
    const schema = z.object({ headline: z.string() });
    const parsed = parseLlmJson('{"headline":"test"}', schema);
    expect(parsed.headline).toBe('test');
  });

  it('alignStringArray pads and trims to expected length', () => {
    expect(alignStringArray(['a', 'b', 'c'], 2, () => 'fb')).toEqual(['a', 'b']);
    expect(alignStringArray(['only'], 3, i => `fb${i}`)).toEqual(['only', 'fb1', 'fb2']);
    expect(alignStringArray(undefined, 2, () => 'x')).toEqual(['x', 'x']);
  });

  it('extractJsonSubstring handles nested braces', () => {
    const sub = extractJsonSubstring('prefix {"a":{"b":1}} suffix');
    expect(JSON.parse(sub)).toEqual({ a: { b: 1 } });
  });
});
