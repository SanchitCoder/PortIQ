import { z } from 'zod';

/** Strip markdown code fences from LLM output. */
export function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/** Extract the first JSON object or array from messy LLM prose. */
export function extractJsonSubstring(text: string): string {
  const cleaned = stripJsonFences(text);
  if (!cleaned) return '';

  const firstObj = cleaned.indexOf('{');
  const firstArr = cleaned.indexOf('[');
  let start = -1;
  if (firstObj >= 0 && (firstArr < 0 || firstObj < firstArr)) start = firstObj;
  else if (firstArr >= 0) start = firstArr;
  if (start < 0) return cleaned;

  const open = cleaned[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === open) depth++;
    if (cleaned[i] === close) depth--;
    if (depth === 0) return cleaned.slice(start, i + 1);
  }
  return cleaned.slice(start);
}

export function parseLlmJson<T>(raw: string, schema?: z.ZodType<T>): T {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Empty LLM response');

  const attempts = [trimmed, stripJsonFences(trimmed), extractJsonSubstring(trimmed)];
  let lastErr: unknown;

  for (const candidate of attempts) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as T;
      return schema ? schema.parse(parsed) : parsed;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Failed to parse LLM JSON');
}

/**
 * Pad or trim LLM string arrays so they align 1:1 with deterministic L2 items.
 * Free models (e.g. Gemma) often return the wrong array length.
 */
export function alignStringArray(
  items: string[] | undefined,
  length: number,
  fallback: (index: number) => string,
): string[] {
  const out: string[] = [];
  for (let i = 0; i < length; i++) {
    const candidate = items?.[i]?.trim();
    out.push(candidate && candidate.length > 0 ? candidate : fallback(i));
  }
  return out;
}

/** Coerce unknown LLM values to non-empty strings with fallback. */
export function coerceString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return fallback;
}

/** Coerce unknown LLM values to string arrays with at least one item. */
export function coerceStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map(v => (typeof v === 'string' ? v.trim() : ''))
    .filter(v => v.length > 0);
  return cleaned.length > 0 ? cleaned : fallback;
}
