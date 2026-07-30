import { Fragment } from 'react';
import type { DayEntry, Protocol } from '../types';
import { todayStr } from '../lib/dates';
import {
  currentCleanRun,
  exposureGrid,
  fmt,
  weeklyRows,
  type WeekRow,
} from '../lib/stats';
import { Section } from '../components/ui';
import './trends.css';

export function Trends(props: { protocol: Protocol; entries: DayEntry[] }) {
  const { protocol, entries } = props;
  const cells = exposureGrid(protocol, entries);
  const cleanRun = currentCleanRun(cells, todayStr(), protocol);
  const logged = cells.filter((c) => c !== 'unlogged').length;
  const rows = weeklyRows(protocol, entries);
  // A single day is noise; plotting it invites over-reading.
  const plottable = rows.filter((r) => r.n >= 2);
  const pv = protocol.exposures.find((e) => e.isProtocolVariable);

  return (
    <div>
      <Section num="1" title="Exposure grid">
        <div
          className="grid7"
          role="img"
          aria-label={`Exposure grid: ${logged} of ${protocol.durationDays} days logged, current clean run ${cleanRun} days.`}
        >
          {Array.from({ length: Math.ceil(cells.length / 7) }, (_, w) => (
            <Fragment key={w}>
              <span className="gweek" aria-hidden="true">
                W{w + 1}
              </span>
              {cells.slice(w * 7, w * 7 + 7).map((c, d) => (
                <span key={d} className={`gcell gcell-${c}`} aria-hidden="true">
                  {c === 'present' ? '✕' : ''}
                </span>
              ))}
            </Fragment>
          ))}
        </div>
        <div className="grid-legend mono">
          <span>
            <span className="gcell gcell-clean gcell-inline"></span> clean
          </span>
          <span>
            <span className="gcell gcell-present gcell-inline">✕</span>{' '}
            {pv ? pv.label.toLowerCase() : 'variable'}
          </span>
          <span>
            <span className="gcell gcell-unlogged gcell-inline"></span> not
            logged
          </span>
        </div>
        <p className="grid-stats mono">
          CLEAN RUN {cleanRun} D · LOGGED {logged} / {protocol.durationDays}
        </p>
      </Section>

      <Section num="2" title="Weekly means">
        {plottable.length === 0 ? (
          <p className="empty">
            Chart appears once any week holds two or more entries.
          </p>
        ) : (
          <WeeklyChart protocol={protocol} rows={plottable} />
        )}
        <div className="chart-legend">
          {protocol.metrics.map((m) => (
            <span key={m.id} className="mono" style={{ color: m.color }}>
              — {m.code} {m.name}
            </span>
          ))}
        </div>
      </Section>

      <Section num="3" title="Weekly table">
        {rows.length === 0 ? (
          <p className="empty">No entries yet. Log days on the TODAY form.</p>
        ) : (
          <div className="table-scroll">
            <table className="datatable">
              <thead>
                <tr>
                  <th scope="col">WK</th>
                  {protocol.metrics.map((m) => (
                    <th key={m.id} scope="col" title={m.name}>
                      {m.code}
                    </th>
                  ))}
                  {protocol.trackSleep && <th scope="col">SLP</th>}
                  <th scope="col">N</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.index} className={r.isBaseline ? 'baseline' : ''}>
                    <td>{r.label}</td>
                    {protocol.metrics.map((m) => (
                      <td key={m.id}>{fmt(r.metricMeans[m.id])}</td>
                    ))}
                    {protocol.trackSleep && <td>{fmt(r.sleepMean)}</td>}
                    <td>{r.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint">
          Baseline weeks marked in red. Weeks with fewer than 2 entries are
          listed here but not plotted.
        </p>
      </Section>
    </div>
  );
}

/** Hand-drawn SVG. One line per metric, x in weeks, baseline weeks marked.
    ViewBox is close to the rendered phone width so type stays legible. */
function WeeklyChart(props: { protocol: Protocol; rows: WeekRow[] }) {
  const { protocol, rows } = props;
  const W = 360;
  const H = 230;
  const PAD = { l: 24, r: 12, t: 10, b: 24 };
  const lo = Math.min(...protocol.metrics.map((m) => m.min));
  const hi = Math.max(...protocol.metrics.map((m) => m.max));
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const xFor = (i: number) =>
    PAD.l + (rows.length === 1 ? iw / 2 : (i * iw) / (rows.length - 1));
  const yFor = (v: number) => PAD.t + ih - ((v - lo) / (hi - lo)) * ih;

  const gridVals = [];
  for (let v = Math.ceil(lo); v <= hi; v += (hi - lo) > 12 ? 2 : 1) {
    gridVals.push(v);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="weekly-chart"
      role="img"
      aria-label="Weekly means, one line per metric."
    >
      {gridVals.map((v) => (
        <g key={v}>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={yFor(v)}
            y2={yFor(v)}
            stroke="var(--rule)"
            strokeWidth="0.6"
          />
          <text
            x={PAD.l - 5}
            y={yFor(v) + 3.5}
            textAnchor="end"
            className="chart-tick"
          >
            {v}
          </text>
        </g>
      ))}
      {rows.map((r, i) => (
        <text
          key={r.index}
          x={xFor(i)}
          y={H - 7}
          textAnchor="middle"
          className={r.isBaseline ? 'chart-tick chart-baseline' : 'chart-tick'}
        >
          {r.label}
        </text>
      ))}
      {rows.map(
        (r, i) =>
          r.isBaseline && (
            <line
              key={'b' + r.index}
              x1={xFor(i)}
              x2={xFor(i)}
              y1={PAD.t}
              y2={PAD.t + ih}
              stroke="var(--red)"
              strokeWidth="0.8"
              strokeDasharray="3 3"
            />
          )
      )}
      {protocol.metrics.map((m) => {
        const pts = rows
          .map((r, i) => ({ v: r.metricMeans[m.id], i }))
          .filter((p): p is { v: number; i: number } => p.v !== null);
        if (pts.length === 0) return null;
        const d = pts
          .map(
            (p, k) => `${k === 0 ? 'M' : 'L'}${xFor(p.i)},${yFor(p.v)}`
          )
          .join(' ');
        return (
          <g key={m.id}>
            <path d={d} fill="none" stroke={m.color} strokeWidth="1.8" />
            {pts.map((p) => (
              <circle
                key={p.i}
                cx={xFor(p.i)}
                cy={yFor(p.v)}
                r="3"
                fill={m.color}
              />
            ))}
          </g>
        );
      })}
      <line
        x1={PAD.l}
        x2={W - PAD.r}
        y1={PAD.t + ih}
        y2={PAD.t + ih}
        stroke="var(--ink)"
        strokeWidth="1"
      />
    </svg>
  );
}
