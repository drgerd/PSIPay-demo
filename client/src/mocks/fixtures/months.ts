export function last12Months(): string[] {
  const out: string[] = [];
  const now = new Date();
  const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    out.push(`${y}-${m}`);
  }
  return out;
}

export function makeSeries(base: number, slope: number): { month: string; value_pct: number }[] {
  return last12Months().map((month, idx) => ({
    month,
    value_pct: Math.round((base + slope * idx) * 100) / 100,
  }));
}
