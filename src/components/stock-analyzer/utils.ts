export function scoreColor(value: number): string {
  if (value >= 70) return '#4ADE80';
  if (value >= 45) return '#FBBF24';
  return '#F87171';
}

export function pctColor(pct: number | null): string {
  if (pct == null) return '#9298B0';
  if (pct > 0) return '#4ADE80';
  if (pct < 0) return '#F87171';
  return '#9298B0';
}

export function fmtCurrency(amount: number | null, currency: string): string {
  if (amount == null) return 'data unavailable';
  const sym = currency === 'INR' ? '₹' : '$';
  return `${sym}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function fmtMarketCap(n: number | null, currency: string): string {
  if (n == null) return 'data unavailable';
  const sym = currency === 'INR' ? '₹' : '$';
  if (n >= 1e12) return `${sym}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${sym}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(2)}M`;
  return `${sym}${n.toLocaleString()}`;
}
