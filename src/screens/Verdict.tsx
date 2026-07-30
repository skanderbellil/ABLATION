import type { DayEntry, Protocol } from '../types';
import { addDays, diffDays, todayStr } from '../lib/dates';
import { fmt, lagSummary, metricVerdicts } from '../lib/stats';
import { Section } from '../components/ui';
import './verdict.css';

export function Verdict(props: { protocol: Protocol; entries: DayEntry[] }) {
  const { protocol, entries } = props;
  const endDate = addDays(protocol.startDate, protocol.durationDays);
  const today = todayStr();
  const remaining = diffDays(today, endDate);

  // Locked until the protocol runs its course. Reading a result at week 2
  // is how a trial gets talked out of — no partial verdicts.
  if (remaining > 0 && protocol.status !== 'abandoned') {
    return (
      <div className="verdict-locked">
        <p className="verdict-remaining mono">{remaining}</p>
        <p className="microlabel">days remaining</p>
        <p className="verdict-until mono">VERDICT AVAILABLE {endDate}</p>
      </div>
    );
  }

  if (!protocol.prereg) {
    return (
      <p className="empty">
        No pre-registration was locked for this protocol, so there is nothing
        to score the outcome against.
      </p>
    );
  }

  const verdicts = metricVerdicts(protocol, entries);
  const lag = lagSummary(entries);
  const marks: Record<string, string> = {
    hit: 'HIT',
    miss: 'MISS',
    inconclusive: 'INCONCLUSIVE',
  };

  return (
    <div>
      {protocol.status === 'abandoned' && (
        <p className="notice">
          Protocol abandoned before completion. Results below cover the data
          that exists.
        </p>
      )}

      <Section num="1" title="Predictions vs outcome">
        <div className="table-scroll">
          <table className="datatable">
            <thead>
              <tr>
                <th scope="col">METRIC</th>
                <th scope="col">PREDICTED</th>
                <th scope="col">BASE</th>
                <th scope="col">FINAL</th>
                <th scope="col">Δ</th>
                <th scope="col">MARK</th>
              </tr>
            </thead>
            <tbody>
              {verdicts.map((v) => {
                const m = protocol.metrics.find((x) => x.id === v.metricId)!;
                return (
                  <tr key={v.metricId}>
                    <td>
                      {m.code} {m.name}
                    </td>
                    <td>{v.prediction}</td>
                    <td>
                      {fmt(v.baselineMean)}
                      <span className="verdict-n"> n{v.baselineN}</span>
                    </td>
                    <td>
                      {fmt(v.finalMean)}
                      <span className="verdict-n"> n{v.finalN}</span>
                    </td>
                    <td>
                      {v.delta === null
                        ? '—'
                        : (v.delta > 0 ? '+' : '') + v.delta.toFixed(1)}
                    </td>
                    <td className={`mark mark-${v.mark}`}>{marks[v.mark]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="hint">
          Baseline = entries before day 1. Final = last 14 protocol days. Marks
          are direction-only; whether the magnitude counts is judged against
          the pre-registered effect size below, by you, not by this app.
        </p>
      </Section>

      <Section num="2" title="Pre-registered effect size">
        <blockquote className="verdict-quote">
          {protocol.prereg.effectSize || '(none stated)'}
        </blockquote>
        <p className="hint">
          Read the deltas above against this, as written at lock time [
          {protocol.prereg.fingerprint}].
        </p>
      </Section>

      <Section num="3" title="Falsifier">
        <blockquote className="verdict-quote">
          {protocol.prereg.falsifier || '(none stated)'}
        </blockquote>
        <p className="verdict-question">Does this result meet it?</p>
      </Section>

      <Section num="4" title="Statistics note">
        <p className="hint">
          Means, deltas and observation counts only. No p-values are computed:
          daily self-report from one person is heavily autocorrelated, and a
          naive significance test would report certainty that is not there.
        </p>
        {lag && (
          <p className="hint">
            Data quality: {lag.n} entries, median recall lag {lag.medianLag}{' '}
            day(s), {lag.within1Day}% logged within one day of the scored day.
            Entries written long after the day carry less weight.
          </p>
        )}
      </Section>
    </div>
  );
}
