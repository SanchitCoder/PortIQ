/** Normalized API origin — strips trailing slashes so paths like `/api/...` join cleanly. */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL?.trim() ?? '';
  return raw.replace(/\/+$/, '');
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
