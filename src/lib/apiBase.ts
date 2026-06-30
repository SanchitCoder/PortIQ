/** Normalize API origin — must be absolute (https://...) or browser POSTs to Vercel → 405. */
export function getApiBase(): string {
  let raw = import.meta.env.VITE_API_URL?.trim() ?? '';
  raw = raw.replace(/\/+$/, '');

  if (!raw) return '';

  // e.g. portiq-production.up.railway.app → https://portiq-production.up.railway.app
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw.replace(/^\/+/, '')}`;
  }

  return raw;
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (import.meta.env.PROD && !base) {
    throw new Error(
      'VITE_API_URL is not set. Add it in Vercel → Settings → Environment Variables '
      + '(e.g. https://portiq-production.up.railway.app) and redeploy.',
    );
  }

  return `${base}${normalizedPath}`;
}
