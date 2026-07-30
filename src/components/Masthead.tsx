import type { Protocol } from '../types';
import { dayNumber, todayStr } from '../lib/dates';

export function dayBadge(p: Protocol, date: string): string {
  const d = dayNumber(p.startDate, date);
  if (d < 1) return `BASELINE −${1 - d}`;
  if (d > p.durationDays) return `POST +${d - p.durationDays}`;
  return `DAY ${d} / ${p.durationDays}`;
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
          {p && p.status !== 'draft' && <div>{dayBadge(p, todayStr())}</div>}
          {p && p.status === 'draft' && <div>DRAFT</div>}
        </div>
      </div>
    </header>
  );
}
