import type { DayEntry, Exposure, Protocol } from '../types';
import { addDays, dayNumber, diffDays, recallLagDays, sleepHours } from './dates';

// No p-values are computed anywhere in this file or this app. Daily
// self-report from one person is heavily autocorrelated; a naive test
// would report significance that is not there.

export function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

export function fmt(x: number | null, digits = 1): string {
  return x === null ? '—' : x.toFixed(digits);
}

/** Is the protocol variable present in this entry's exposures? */
export function protocolVariablePresent(
  protocol: Protocol,
  entry: DayEntry
): boolean {
  const pv = protocol.exposures.find((e) => e.isProtocolVariable);
  if (!pv) return false;
  return exposurePresent(pv, entry.exposures[pv.id]);
}

export function exposurePresent(
  exposure: Exposure,
  value: boolean | string | number | undefined
): boolean {
  if (value === undefined) return false;
  switch (exposure.kind) {
    case 'boolean':
      return value === true;
    case 'count':
      return typeof value === 'number' && value > 0;
    case 'enum':
      // the first option is the "none" option by convention
      return value !== '' && value !== (exposure.options?.[0] ?? '');
  }
}

export type WeekRow = {
  index: number; // 0-based from startDate; negative = baseline
  label: string; // "B1", "W1", ...
  isBaseline: boolean;
  startDate: string;
  n: number; // entries in the week
  metricMeans: Record<string, number | null>; // by metric id
  sleepMean: number | null;
};

/** Group entries into 7-day weeks anchored at startDate. Baseline weeks count backwards. */
export function weeklyRows(protocol: Protocol, entries: DayEntry[]): WeekRow[] {
  const byWeek = new Map<number, DayEntry[]>();
  for (const e of entries) {
    const idx = Math.floor(diffDays(protocol.startDate, e.date) / 7);
    if (idx >= Math.ceil(protocol.durationDays / 7)) continue;
    const list = byWeek.get(idx) ?? [];
    list.push(e);
    byWeek.set(idx, list);
  }
  const rows: WeekRow[] = [];
  for (const idx of [...byWeek.keys()].sort((a, b) => a - b)) {
    const list = byWeek.get(idx)!;
    const metricMeans: Record<string, number | null> = {};
    for (const m of protocol.metrics) {
      metricMeans[m.id] = mean(
        list
          .map((e) => e.scores[m.id])
          .filter((v): v is number => typeof v === 'number')
      );
    }
    rows.push({
      index: idx,
      label: idx < 0 ? `B${-idx}` : `W${idx + 1}`,
      isBaseline: idx < 0,
      startDate: addDays(protocol.startDate, idx * 7),
      n: list.length,
      metricMeans,
      sleepMean: mean(
        list
          .map((e) => (e.sleep ? sleepHours(e.sleep.bed, e.sleep.wake) : null))
          .filter((v): v is number => v !== null)
      ),
    });
  }
  return rows;
}

export type GridCell = 'unlogged' | 'clean' | 'present';

/** One cell per protocol day, day 1 through durationDays. */
export function exposureGrid(protocol: Protocol, entries: DayEntry[]): GridCell[] {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const cells: GridCell[] = [];
  for (let d = 0; d < protocol.durationDays; d++) {
    const date = addDays(protocol.startDate, d);
    const e = byDate.get(date);
    if (!e) cells.push('unlogged');
    else cells.push(protocolVariablePresent(protocol, e) ? 'present' : 'clean');
  }
  return cells;
}

/** Consecutive most-recent logged days without the protocol variable. */
export function currentCleanRun(cells: GridCell[], today: string, protocol: Protocol): number {
  const lastDay = Math.min(
    protocol.durationDays,
    dayNumber(protocol.startDate, today)
  );
  let run = 0;
  for (let d = lastDay - 1; d >= 0; d--) {
    if (cells[d] === 'clean') run++;
    else if (cells[d] === 'present') break;
    // unlogged days neither extend nor break the run
  }
  return run;
}

export type MetricVerdict = {
  metricId: string;
  prediction: string;
  baselineMean: number | null;
  baselineN: number;
  finalMean: number | null;
  finalN: number;
  delta: number | null;
  mark: 'hit' | 'miss' | 'inconclusive';
};

const MIN_BASELINE_N = 3;
const MIN_FINAL_N = 5;
const DIRECTION_THRESHOLD = 0.5; // below this the direction call is inconclusive

/**
 * Direction-only verdict per metric. Baseline = entries before startDate;
 * final = the last 14 protocol days. Magnitude is judged by the user against
 * their own pre-registered effect size, never by the app.
 */
export function metricVerdicts(protocol: Protocol, entries: DayEntry[]): MetricVerdict[] {
  const endDate = addDays(protocol.startDate, protocol.durationDays);
  const finalStart = addDays(endDate, -14);
  const baseline = entries.filter((e) => e.date < protocol.startDate);
  const final = entries.filter((e) => e.date >= finalStart && e.date < endDate);

  return protocol.metrics.map((m) => {
    const bVals = baseline
      .map((e) => e.scores[m.id])
      .filter((v): v is number => typeof v === 'number');
    const fVals = final
      .map((e) => e.scores[m.id])
      .filter((v): v is number => typeof v === 'number');
    const b = mean(bVals);
    const f = mean(fVals);
    const delta = b !== null && f !== null ? round1(f - b) : null;
    const prediction = protocol.prereg?.predictions[m.id] ?? 'no change';

    let mark: MetricVerdict['mark'] = 'inconclusive';
    if (
      delta !== null &&
      bVals.length >= MIN_BASELINE_N &&
      fVals.length >= MIN_FINAL_N
    ) {
      if (prediction === 'no change') {
        mark = Math.abs(delta) < DIRECTION_THRESHOLD ? 'hit' : 'miss';
      } else if (Math.abs(delta) < DIRECTION_THRESHOLD) {
        mark = 'inconclusive';
      } else {
        const improved = delta > 0; // all metrics run higher-is-better
        mark =
          (prediction === 'improves') === improved ? 'hit' : 'miss';
      }
    }
    return {
      metricId: m.id,
      prediction,
      baselineMean: b !== null ? round1(b) : null,
      baselineN: bVals.length,
      finalMean: f !== null ? round1(f) : null,
      finalN: fVals.length,
      delta,
      mark,
    };
  });
}

export type LagSummary = { medianLag: number; within1Day: number; n: number };

export function lagSummary(entries: DayEntry[]): LagSummary | null {
  if (entries.length === 0) return null;
  const lags = entries.map(recallLagDays).sort((a, b) => a - b);
  const mid = Math.floor(lags.length / 2);
  const medianLag =
    lags.length % 2 ? lags[mid] : (lags[mid - 1] + lags[mid]) / 2;
  const within1Day =
    Math.round((lags.filter((l) => l <= 1).length / lags.length) * 100);
  return { medianLag, within1Day, n: lags.length };
}
