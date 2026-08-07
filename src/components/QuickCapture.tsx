import type { DayEntry, Protocol } from '../types';
import { addDays, nowHHMM, todayStr } from '../lib/dates';
import { emptyEntry } from '../lib/entries';
import './quickcapture.css';

/**
 * Real-time capture for facts that are easy to forget by the time the
 * retrospective TODAY form reaches them — the protocol variable (logged
 * "on the way", away from the form) and sleep bed/wake times. Writes
 * directly into the same DayEntry records the retrospective form reads,
 * so nothing here is a separate data path to reconcile later.
 *
 * A bedtime logged tonight belongs to TOMORROW's entry: the stored
 * convention is bed = the evening before the date, wake = that date's
 * morning, so a "now" bedtime pairs with tomorrow's wake.
 */
export function QuickCapture(props: {
  protocol: Protocol;
  entries: DayEntry[];
  onSave: (e: DayEntry) => void;
}) {
  const { protocol, entries, onSave } = props;
  const today = todayStr();
  const tomorrow = addDays(today, 1);
  const todayEntry = entries.find((e) => e.date === today) ?? null;
  const tomorrowEntry = entries.find((e) => e.date === tomorrow) ?? null;

  const pv = protocol.exposures.find(
    (x) => x.isProtocolVariable && x.kind !== 'enum'
  );
  const pvCount = pv ? (todayEntry?.quickLogCounts?.[pv.id] ?? 0) : 0;

  const logExposureNow = () => {
    if (!pv) return;
    const base = todayEntry ?? emptyEntry(protocol.id, today);
    const nextValue =
      pv.kind === 'count'
        ? (typeof base.exposures[pv.id] === 'number'
            ? (base.exposures[pv.id] as number)
            : 0) + 1
        : true;
    onSave({
      ...base,
      exposures: { ...base.exposures, [pv.id]: nextValue },
      quickLogCounts: {
        ...(base.quickLogCounts ?? {}),
        [pv.id]: pvCount + 1,
      },
    });
  };

  const clearExposureToday = () => {
    if (!pv || !todayEntry) return;
    const exposures = { ...todayEntry.exposures };
    delete exposures[pv.id];
    const quickLogCounts = { ...(todayEntry.quickLogCounts ?? {}) };
    delete quickLogCounts[pv.id];
    onSave({ ...todayEntry, exposures, quickLogCounts });
  };

  const wakeNow = () => {
    const base = todayEntry ?? emptyEntry(protocol.id, today);
    onSave({ ...base, sleep: { bed: base.sleep?.bed ?? '', wake: nowHHMM() } });
  };

  const bedNow = () => {
    const base = tomorrowEntry ?? emptyEntry(protocol.id, tomorrow);
    onSave({ ...base, sleep: { bed: nowHHMM(), wake: base.sleep?.wake ?? '' } });
  };

  if (!pv && !protocol.trackSleep) return null;

  return (
    <div className="quickcap">
      <p className="microlabel quickcap-label">Live capture — right now</p>
      <div className="quickcap-grid">
        {pv && (
          <div className="quickcap-item">
            <button
              type="button"
              className="quickcap-btn"
              aria-pressed={pvCount > 0}
              onClick={logExposureNow}
            >
              <span className="quickcap-btn-label">+ Log {pv.label.toLowerCase()}</span>
              <span className="quickcap-btn-state">
                {pvCount > 0 ? `Logged ${pvCount}× today` : 'Not yet logged today'}
              </span>
            </button>
            {pvCount > 0 && (
              <button
                type="button"
                className="quickcap-clear"
                onClick={clearExposureToday}
              >
                Clear today's log
              </button>
            )}
          </div>
        )}

        {protocol.trackSleep && (
          <>
            <button
              type="button"
              className="quickcap-btn"
              aria-pressed={!!todayEntry?.sleep?.wake}
              onClick={wakeNow}
            >
              <span className="quickcap-btn-label">Woke up — now</span>
              <span className="quickcap-btn-state">
                {todayEntry?.sleep?.wake
                  ? `Recorded ${todayEntry.sleep.wake} today`
                  : 'Tap on waking'}
              </span>
            </button>
            <button
              type="button"
              className="quickcap-btn"
              aria-pressed={!!tomorrowEntry?.sleep?.bed}
              onClick={bedNow}
            >
              <span className="quickcap-btn-label">Going to bed — now</span>
              <span className="quickcap-btn-state">
                {tomorrowEntry?.sleep?.bed
                  ? `Recorded ${tomorrowEntry.sleep.bed}, counts toward tomorrow`
                  : 'Tap at bedtime — counts toward tomorrow'}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
