function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function formatYmd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseYmd(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function addDays(ymd: string, delta: number): string {
  const base = parseYmd(ymd);
  if (!base) return formatYmd(new Date());
  const next = new Date(base);
  next.setDate(next.getDate() + delta);
  return formatYmd(next);
}
