import type { Protocol } from '../types';
import { dayNumber, todayStr } from '../lib/dates';

export function dayBadge(p: Protocol, date: string): string {
  const d = dayNumber(p.startDate, date);
  if (d < 1) return `BASELINE −${1 - d}`;
  if (d > p.durationDays) return `POST +${d - p.durationDays}`;
  return `DAY ${d} / ${p.durationDays}`;
}

/** Stamp modifier class — baseline days read red everywhere else in the app. */
export function dayBadgeClass(p: Protocol, date: string): string {
  return dayNumber(p.startDate, date) < 1 ? 'stamp stamp-red' : 'stamp';
}

export function Masthead(props: { protocol: Protocol | null }) {
  const p = props.protocol;
  return (
    <header className="masthead">
      <div className="masthead-row">
        <div>
          <div className="masthead-form-id">CRF-01 / N-OF-1 / SELF-REPORT</div>
          <h1 className="masthead-name">{p ? p.name : 'ABLATION'}</h1>
        </div>
        <div className="masthead-meta">
          {p?.prereg && (
            <div className="fingerprint">[{p.prereg.fingerprint}]</div>
          )}
          {p && p.status !== 'draft' && (
            <span className={dayBadgeClass(p, todayStr())}>
              {dayBadge(p, todayStr())}
            </span>
          )}
          {p && p.status === 'draft' && <span className="stamp">DRAFT</span>}
        </div>
      </div>
    </header>
  );
}
