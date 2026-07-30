import type { DayEntry, Protocol } from '../types';
import { dayNumber, sleepHours } from './dates';
import { fmt, lagSummary, weeklyRows } from './stats';

function csvField(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** One row per day; metric columns use the metric codes (M1, M2, …). */
export function toCsv(protocol: Protocol, entries: DayEntry[]): string {
  const header = [
    'date',
    'day',
    ...protocol.metrics.map((m) => m.code),
    ...protocol.exposures.map((e) => 'X_' + e.label.replace(/[^A-Za-z0-9]+/g, '_')),
    ...protocol.adherence.map((a) => 'A_' + a.label.replace(/[^A-Za-z0-9]+/g, '_')),
    'sleep_bed',
    'sleep_wake',
    'sleep_hours',
    'note',
    'logged_at',
  ];
  const rows = entries.map((e) => [
    e.date,
    dayNumber(protocol.startDate, e.date),
    ...protocol.metrics.map((m) => e.scores[m.id] ?? ''),
    ...protocol.exposures.map((x) => {
      const v = e.exposures[x.id];
      return v === undefined ? '' : v;
    }),
    ...protocol.adherence.map((a) => {
      const v = e.adherence[a.id];
      return v === undefined ? '' : v;
    }),
    e.sleep?.bed ?? '',
    e.sleep?.wake ?? '',
    e.sleep ? sleepHours(e.sleep.bed, e.sleep.wake) ?? '' : '',
    e.note ?? '',
    e.loggedAt,
  ]);
  return [header, ...rows].map((r) => r.map(csvField).join(',')).join('\n');
}

/** Plain-text summary suitable for pasting into an email to a clinician. */
export function clinicalSummary(protocol: Protocol, entries: DayEntry[]): string {
  const lines: string[] = [];
  const p = protocol;
  lines.push('N-OF-1 SELF-REPORT SUMMARY');
  lines.push('==========================');
  lines.push(`Protocol:  ${p.name}`);
  lines.push(`Variable:  ${p.variable}`);
  lines.push(
    `Period:    ${p.startDate}, ${p.durationDays} days (status: ${p.status})`
  );
  if (p.prereg) {
    lines.push('');
    lines.push(`PRE-REGISTERED ${p.prereg.committedAt.slice(0, 10)}  [${p.prereg.fingerprint}]`);
    for (const m of p.metrics) {
      lines.push(
        `  ${m.code}  ${m.name}: predicted ${p.prereg.predictions[m.id] ?? '—'}`
      );
    }
    lines.push(`  Effect size threshold (own words): ${p.prereg.effectSize}`);
    lines.push(`  Falsifier (own words): ${p.prereg.falsifier}`);
  } else {
    lines.push('');
    lines.push('No pre-registration was locked for this protocol.');
  }

  lines.push('');
  lines.push('WEEKLY MEANS');
  const rows = weeklyRows(p, entries);
  const head = ['WEEK', ...p.metrics.map((m) => m.code)];
  if (p.trackSleep) head.push('SLEEP');
  head.push('N');
  lines.push('  ' + head.map((h) => h.padEnd(6)).join(''));
  for (const r of rows) {
    const cells = [r.label, ...p.metrics.map((m) => fmt(r.metricMeans[m.id]))];
    if (p.trackSleep) cells.push(fmt(r.sleepMean));
    cells.push(String(r.n));
    lines.push('  ' + cells.map((c) => c.padEnd(6)).join(''));
  }

  const lag = lagSummary(entries);
  if (lag) {
    lines.push('');
    lines.push(
      `DATA QUALITY: ${lag.n} entries; median recall lag ${lag.medianLag} day(s); ` +
        `${lag.within1Day}% logged within 1 day of the scored day.`
    );
  }

  const notes = entries.filter((e) => e.note?.trim());
  if (notes.length > 0) {
    lines.push('');
    lines.push('NOTES');
    for (const e of notes) lines.push(`  ${e.date}: ${e.note!.trim()}`);
  }

  lines.push('');
  lines.push(
    'All data self-reported, unblinded, n=1. No inferential statistics were'
  );
  lines.push(
    'computed; daily self-report is autocorrelated and naive tests overstate'
  );
  lines.push('significance.');
  return lines.join('\n');
}
