/** Normalized API origin — strips trailing slashes so paths like `/api/...` join cleanly. */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL?.trim() ?? '';
  return raw.replace(/\/+$/, '');
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
