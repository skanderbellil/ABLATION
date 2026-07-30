import { useMemo, useState } from 'react';
import type { DayEntry, Protocol } from '../types';
import { addDays, formatLong, sleepHours, todayStr } from '../lib/dates';
import { dayBadge } from '../components/Masthead';
import { ScoreRow, Section, Seg, Stepper, Tick } from '../components/ui';
import './today.css';

function emptyEntry(protocolId: string, date: string): DayEntry {
  return {
    protocolId,
    date,
    scores: {},
    exposures: {},
    adherence: {},
    loggedAt: new Date().toISOString(),
  };
}

export function Today(props: {
  protocol: Protocol;
  entries: DayEntry[];
  onSave: (e: DayEntry) => void;
  lastSavedAt: string | null;
  persistFailed: boolean;
}) {
  const { protocol, entries } = props;
  // Opened in the morning; whole-day measures are scored retrospectively,
  // so the cursor starts on yesterday and never moves past it.
  const maxDate = addDays(todayStr(), -1);
  const [date, setDate] = useState(maxDate);

  const entry = useMemo(
    () => entries.find((e) => e.date === date) ?? null,
    [entries, date]
  );

  const update = (patch: Partial<DayEntry>) => {
    const base = entry ?? emptyEntry(protocol.id, date);
    // loggedAt records when the entry was FIRST written; edits keep it.
    props.onSave({ ...base, ...patch });
  };

  let sectionNum = 0;
  const num = () => String(++sectionNum);

  const hours =
    entry?.sleep && entry.sleep.bed && entry.sleep.wake
      ? sleepHours(entry.sleep.bed, entry.sleep.wake)
      : null;

  return (
    <div>
      {protocol.banner && <p className="notice">{protocol.banner}</p>}

      <div className="datenav">
        <button
          type="button"
          className="btn datenav-btn"
          aria-label="Previous day"
          onClick={() => setDate(addDays(date, -1))}
        >
          ←
        </button>
        <div className="datenav-date">
          <div className="datenav-long">{formatLong(date)}</div>
          <div className="datenav-badge">{dayBadge(protocol, date)}</div>
        </div>
        <button
          type="button"
          className="btn datenav-btn"
          aria-label="Next day"
          disabled={date >= maxDate}
          onClick={() => setDate(addDays(date, 1))}
        >
          →
        </button>
      </div>

      <Section num={num()} title="Exposure">
        {protocol.exposures.map((x, i) => (
          <div className="today-field" key={x.id}>
            <div className="label-row">
              <span className="field-code">X{i + 1}</span>
              <span className="name">
                {x.label}
                {x.isProtocolVariable ? ' *' : ''}
              </span>
            </div>
            {x.kind === 'boolean' && (
              <Seg
                label={x.label}
                options={['NO', 'YES']}
                value={
                  entry?.exposures[x.id] === undefined
                    ? null
                    : entry.exposures[x.id]
                      ? 'YES'
                      : 'NO'
                }
                onChange={(v) =>
                  update({
                    exposures: {
                      ...(entry?.exposures ?? {}),
                      [x.id]: v === 'YES',
                    },
                  })
                }
              />
            )}
            {x.kind === 'enum' && (
              <Seg
                label={x.label}
                options={x.options ?? []}
                value={
                  typeof entry?.exposures[x.id] === 'string'
                    ? (entry.exposures[x.id] as string)
                    : null
                }
                onChange={(v) =>
                  update({
                    exposures: { ...(entry?.exposures ?? {}), [x.id]: v },
                  })
                }
              />
            )}
            {x.kind === 'count' && (
              <Stepper
                label={x.label}
                unit={x.unit}
                step={x.unit === 'mg' ? 5 : 1}
                value={
                  typeof entry?.exposures[x.id] === 'number'
                    ? (entry.exposures[x.id] as number)
                    : null
                }
                onChange={(v) =>
                  update({
                    exposures: { ...(entry?.exposures ?? {}), [x.id]: v },
                  })
                }
              />
            )}
          </div>
        ))}
        <p className="hint">* protocol variable.</p>
      </Section>

      {protocol.trackSleep && (
        <Section num={num()} title="Sleep">
          <div className="sleep-row">
            <label className="sleep-field">
              <span className="microlabel">S1 Bed</span>
              <input
                type="time"
                className="textinput"
                value={entry?.sleep?.bed ?? ''}
                onChange={(ev) =>
                  update({
                    sleep: {
                      bed: ev.target.value,
                      wake: entry?.sleep?.wake ?? '',
                    },
                  })
                }
              />
            </label>
            <label className="sleep-field">
              <span className="microlabel">S2 Wake</span>
              <input
                type="time"
                className="textinput"
                value={entry?.sleep?.wake ?? ''}
                onChange={(ev) =>
                  update({
                    sleep: {
                      bed: entry?.sleep?.bed ?? '',
                      wake: ev.target.value,
                    },
                  })
                }
              />
            </label>
            <div className="sleep-field">
              <span className="microlabel">Hours</span>
              <div className="sleep-hours mono">
                {hours === null ? '—' : hours.toFixed(1)}
              </div>
            </div>
          </div>
        </Section>
      )}

      {protocol.adherence.length > 0 && (
        <Section num={num()} title="Adherence">
          {protocol.adherence.map((a, i) => (
            <div className="label-row" key={a.id}>
              <span className="field-code">A{i + 1}</span>
              <Tick
                label={a.label}
                checked={entry?.adherence[a.id] === true}
                onChange={(v) =>
                  update({
                    adherence: { ...(entry?.adherence ?? {}), [a.id]: v },
                  })
                }
              />
            </div>
          ))}
        </Section>
      )}

      <Section num={num()} title="Scores">
        {protocol.metrics.map((m) => (
          <div className="today-field" key={m.id}>
            <div className="label-row">
              <span className="field-code">{m.code}</span>
              <span className="name">{m.name}</span>
            </div>
            <p className="hint">{m.hint}</p>
            <ScoreRow
              label={m.name}
              min={m.min}
              max={m.max}
              value={
                typeof entry?.scores[m.id] === 'number'
                  ? entry.scores[m.id]
                  : null
              }
              onChange={(v) =>
                update({ scores: { ...(entry?.scores ?? {}), [m.id]: v } })
              }
            />
          </div>
        ))}
      </Section>

      <Section num={num()} title="Note">
        <textarea
          className="textinput"
          rows={3}
          aria-label="Note"
          placeholder="Anything that would explain an outlier."
          value={entry?.note ?? ''}
          onChange={(ev) => update({ note: ev.target.value })}
        />
      </Section>

      <p className="savestate" role="status">
        {props.persistFailed
          ? 'NOT PERSISTED — STORAGE UNAVAILABLE. DATA HELD IN MEMORY ONLY.'
          : props.lastSavedAt
            ? `SAVED ${props.lastSavedAt}`
            : entry
              ? 'ON FILE'
              : 'NO ENTRY FOR THIS DATE'}
      </p>
    </div>
  );
}
