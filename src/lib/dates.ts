// All dates are local-time YYYY-MM-DD strings. UTC parsing would shift the
// day for anyone west of Greenwich, so parse and format manually.

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function addDays(s: string, n: number): string {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** Whole days from a to b (positive when b is later). */
export function diffDays(a: string, b: string): number {
  return Math.round(
    (parseDateStr(b).getTime() - parseDateStr(a).getTime()) / 86400000
  );
}

/** 1-based protocol day number; 0 or negative for baseline days. */
export function dayNumber(startDate: string, date: string): number {
  return diffDays(startDate, date) + 1;
}

export function formatLong(s: string): string {
  return parseDateStr(s)
    .toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase();
}

/** Sleep duration in hours from "HH:MM" bed/wake, spanning midnight if needed. */
export function sleepHours(bed: string, wake: string): number | null {
  const p = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const b = p(bed);
  const w = p(wake);
  if (b === null || w === null) return null;
  let mins = w - b;
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}

/** Days between the scored day and when it was logged (0 = same day). */
export function recallLagDays(entry: { date: string; loggedAt: string }): number {
  const logged = toDateStr(new Date(entry.loggedAt));
  return Math.max(0, diffDays(entry.date, logged));
}
