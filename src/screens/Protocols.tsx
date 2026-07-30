import { useMemo, useState } from 'react';
import type {
  DayEntry,
  Exposure,
  Prediction,
  Protocol,
  ScaleMetric,
} from '../types';
import {
  blankProtocol,
  looksInverted,
  METRIC_COLORS,
  TEMPLATES,
  uid,
} from '../templates';
import { fingerprintPrereg } from '../lib/prereg';
import { clinicalSummary, toCsv } from '../lib/exporters';
import { Section, Seg, Tick } from '../components/ui';
import './protocols.css';

type Props = {
  protocols: Protocol[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onSaveProtocol: (p: Protocol) => Promise<void>;
  getEntries: (pid: string) => Promise<DayEntry[]>;
  exportAll: () => Promise<string>;
  importAll: (json: string) => Promise<void>;
};

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const STATUS_ORDER: Record<Protocol['status'], number> = {
  active: 0,
  draft: 1,
  complete: 2,
  abandoned: 3,
};

export function Protocols(props: Props) {
  const [message, setMessage] = useState('');
  const [pendingImport, setPendingImport] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...props.protocols].sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      ),
    [props.protocols]
  );
  const current = sorted.filter(
    (p) => p.status === 'active' || p.status === 'draft'
  );
  const archive = sorted.filter(
    (p) => p.status === 'complete' || p.status === 'abandoned'
  );
  const selected = props.protocols.find((p) => p.id === props.activeId) ?? null;

  const say = (m: string) => setMessage(m);

  // Sections are conditional, so numbers are assigned in render order —
  // a numbered form must not skip.
  let n = 1;
  const protocolsNum = String(n++);
  const draftNums: [string, string] | null =
    selected?.status === 'draft'
      ? [String(n++), String(n++)]
      : null;
  const recordNum =
    selected && selected.status !== 'draft' ? String(n++) : null;
  const archiveNum = archive.length > 0 ? String(n++) : null;
  const dataNum = String(n++);
  const reminderNum = String(n++);

  const startFrom = async (make: () => Protocol) => {
    const p = make();
    await props.onSaveProtocol(p);
    props.onSelect(p.id);
    say(`Draft created: ${p.name}. Configure it below, then lock.`);
  };

  return (
    <div>
      {message && (
        <p className="savestate" role="status">
          {message.toUpperCase()}
        </p>
      )}

      <Section num={protocolsNum} title="Protocols">
        {current.length === 0 && (
          <p className="empty">
            No protocol on file. Start one from a template below.
          </p>
        )}
        {current.map((p) => (
          <ProtocolRow
            key={p.id}
            p={p}
            selected={p.id === props.activeId}
            onSelect={() => props.onSelect(p.id)}
          />
        ))}
        <p className="microlabel tpl-head">Start new — from template</p>
        <div className="tpl-list">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="tplrow"
              onClick={() => startFrom(t.make)}
            >
              <span className="tplrow-title">{t.title}</span>
              <span className="tplrow-sum">{t.summary}</span>
            </button>
          ))}
          <button
            type="button"
            className="tplrow"
            onClick={() => startFrom(blankProtocol)}
          >
            <span className="tplrow-title">Blank protocol</span>
            <span className="tplrow-sum">
              Define your own variable, metrics and duration.
            </span>
          </button>
        </div>
      </Section>

      {selected && selected.status === 'draft' && draftNums && (
        <DraftEditor
          key={selected.id}
          nums={draftNums}
          protocol={selected}
          onSave={props.onSaveProtocol}
          say={say}
        />
      )}

      {selected && selected.status !== 'draft' && recordNum && (
        <LockedDetail
          num={recordNum}
          protocol={selected}
          onSave={props.onSaveProtocol}
          say={say}
        />
      )}

      {archiveNum && (
        <Section num={archiveNum} title="Archive">
          {archive.map((p) => (
            <ProtocolRow
              key={p.id}
              p={p}
              selected={p.id === props.activeId}
              onSelect={() => props.onSelect(p.id)}
            />
          ))}
          <p className="hint">
            Trials are never deleted. What gets abandoned is itself data.
          </p>
        </Section>
      )}

      <Section num={dataNum} title="Data">
        <div className="row-gap">
          <button
            type="button"
            className="btn"
            onClick={async () =>
              download(
                'ablation-export.json',
                await props.exportAll(),
                'application/json'
              )
            }
          >
            Export JSON
          </button>
          <button
            type="button"
            className="btn"
            disabled={!selected}
            onClick={async () => {
              if (!selected) return;
              const entries = await props.getEntries(selected.id);
              download(
                `ablation-${selected.name.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}.csv`,
                toCsv(selected, entries),
                'text/csv'
              );
            }}
          >
            Export CSV
          </button>
          <label className="btn btn-file">
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                if (!f) return;
                f.text().then(setPendingImport);
                ev.target.value = '';
              }}
            />
          </label>
        </div>
        {pendingImport !== null && (
          <div className="confirm-box">
            <p>
              Import replaces every protocol and entry on this device with the
              file's contents. This cannot be undone.
            </p>
            <div className="row-gap">
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  try {
                    await props.importAll(pendingImport);
                    setPendingImport(null);
                    say('Import complete.');
                  } catch (err) {
                    setPendingImport(null);
                    say(
                      err instanceof Error
                        ? `Import failed: ${err.message}`
                        : 'Import failed: file is not valid JSON.'
                    );
                  }
                }}
              >
                Replace all data
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setPendingImport(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="row-gap" style={{ marginTop: 10 }}>
          <button
            type="button"
            className="btn"
            disabled={!selected}
            onClick={async () => {
              if (!selected) return;
              const entries = await props.getEntries(selected.id);
              const ok = await copyText(clinicalSummary(selected, entries));
              say(
                ok
                  ? 'Clinical summary copied. Paste into an email.'
                  : 'Copy failed. Use Export JSON instead.'
              );
            }}
          >
            Copy clinical summary
          </button>
        </div>
      </Section>

      <Section num={reminderNum} title="Reminder">
        <p className="hint">
          This app cannot notify you. Installed iOS web apps cannot schedule
          local notifications, and web push needs a server this app does not
          have. Create the reminder yourself: copy the text below, open iOS
          Reminders, make a new reminder, paste, set it to repeat daily at
          your wake time.
        </p>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            const ok = await copyText(
              'ABLATION: log yesterday. 30 seconds. ' + location.href
            );
            say(
              ok
                ? 'Reminder text copied. Now create the daily reminder in iOS Reminders.'
                : 'Copy failed. Type the reminder manually.'
            );
          }}
        >
          Copy reminder text
        </button>
      </Section>
    </div>
  );
}

function ProtocolRow(props: {
  p: Protocol;
  selected: boolean;
  onSelect: () => void;
}) {
  const { p } = props;
  return (
    <button
      type="button"
      className={`protorow ${props.selected ? 'protorow-selected' : ''}`}
      onClick={props.onSelect}
      aria-pressed={props.selected}
    >
      <span className="protorow-name">{p.name}</span>
      <span className="protorow-meta mono">
        <span className={`st st-${p.status}`}>{p.status.toUpperCase()}</span> ·{' '}
        {p.startDate} · {p.durationDays}D
        {p.prereg ? ` · [${p.prereg.fingerprint}]` : ''}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */

function DraftEditor(props: {
  nums: [string, string];
  protocol: Protocol;
  onSave: (p: Protocol) => Promise<void>;
  say: (m: string) => void;
}) {
  const [p, setP] = useState<Protocol>(props.protocol);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>(
    {}
  );
  const [effectSize, setEffectSize] = useState('');
  const [falsifier, setFalsifier] = useState('');
  const [confirmLock, setConfirmLock] = useState(false);

  const save = async (next: Protocol) => {
    setP(next);
    await props.onSave(next);
  };

  const setMetric = (id: string, patch: Partial<ScaleMetric>) =>
    save({
      ...p,
      metrics: p.metrics.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });

  const setExposure = (id: string, patch: Partial<Exposure>) =>
    save({
      ...p,
      exposures: p.exposures.map((x) =>
        x.id === id ? { ...x, ...patch } : x
      ),
    });

  const allPredicted =
    p.metrics.length > 0 && p.metrics.every((m) => predictions[m.id]);
  const lockable =
    allPredicted &&
    effectSize.trim() !== '' &&
    falsifier.trim() !== '' &&
    p.variable.trim() !== '';

  const lock = async () => {
    const committedAt = new Date().toISOString();
    const block = {
      predictions,
      effectSize: effectSize.trim(),
      falsifier: falsifier.trim(),
      committedAt,
    };
    const fingerprint = await fingerprintPrereg(block);
    await props.onSave({
      ...p,
      status: 'active',
      prereg: { ...block, fingerprint },
    });
    props.say(`Locked. Fingerprint ${fingerprint}.`);
  };

  return (
    <>
    <Section num={props.nums[0]} title="Draft configuration">
      {p.banner && <p className="notice">{p.banner}</p>}

      <div className="draft-grid">
        <label>
          <span className="microlabel">Name</span>
          <input
            className="textinput"
            value={p.name}
            onChange={(e) => save({ ...p, name: e.target.value })}
          />
        </label>
        <label>
          <span className="microlabel">Variable being ablated</span>
          <input
            className="textinput"
            value={p.variable}
            placeholder="the one thing removed or changed"
            onChange={(e) => save({ ...p, variable: e.target.value })}
          />
        </label>
        <div className="row-gap">
          <label>
            <span className="microlabel">Day 1</span>
            <input
              type="date"
              className="textinput"
              value={p.startDate}
              onChange={(e) =>
                e.target.value && save({ ...p, startDate: e.target.value })
              }
            />
          </label>
          <label>
            <span className="microlabel">Duration (days)</span>
            <input
              type="number"
              min={7}
              max={365}
              className="textinput draft-days"
              value={p.durationDays}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n >= 1) {
                  save({ ...p, durationDays: Math.round(n) });
                }
              }}
            />
          </label>
        </div>
        <Tick
          label="Track sleep (bed / wake times)"
          checked={p.trackSleep}
          onChange={(v) => save({ ...p, trackSleep: v })}
        />
      </div>

      <h3 className="draft-subhead">
        {props.nums[0]}.1 Metrics — 1–10, higher is better
      </h3>
      {p.metrics.map((m) => (
        <div key={m.id} className="draft-item">
          <div className="label-row label-row-full">
            <span className="field-code">{m.code}</span>
            <input
              className="textinput"
              value={m.name}
              aria-label={`Metric ${m.code} name`}
              onChange={(e) => setMetric(m.id, { name: e.target.value })}
            />
            <button
              type="button"
              className="btn btn-small row-remove"
              aria-label={`Remove metric ${m.code}`}
              disabled={p.metrics.length <= 1}
              onClick={() =>
                save({
                  ...p,
                  metrics: p.metrics
                    .filter((x) => x.id !== m.id)
                    .map((x, i) => ({ ...x, code: `M${i + 1}` })),
                })
              }
            >
              ✕
            </button>
          </div>
          {looksInverted(m.name) && (
            <p className="invert-warn">
              This reads as a lower-is-better metric. All metrics must run
              higher-is-better or the charts become unreadable. Invert it —
              track the positive pole (irritability → evenness, anxiety →
              anxiety-free).
            </p>
          )}
          <input
            className="textinput"
            value={m.hint}
            aria-label={`Metric ${m.code} anchors`}
            placeholder="1 = worst anchor · 10 = best anchor"
            onChange={(e) => setMetric(m.id, { hint: e.target.value })}
          />
        </div>
      ))}
      <button
        type="button"
        className="btn"
        onClick={() =>
          save({
            ...p,
            metrics: [
              ...p.metrics,
              {
                id: uid('m'),
                code: `M${p.metrics.length + 1}`,
                name: `Metric ${p.metrics.length + 1}`,
                hint: '1 = worst · 10 = best',
                min: 1,
                max: 10,
                higherIsBetter: true,
                color: METRIC_COLORS[p.metrics.length % METRIC_COLORS.length],
              },
            ],
          })
        }
      >
        + Metric
      </button>

      <h3 className="draft-subhead">{props.nums[0]}.2 Exposures</h3>
      {p.exposures.map((x, i) => (
        <div key={x.id} className="draft-item">
          <div className="label-row label-row-full">
            <span className="field-code">X{i + 1}</span>
            <input
              className="textinput"
              value={x.label}
              aria-label={`Exposure ${i + 1} label`}
              onChange={(e) => setExposure(x.id, { label: e.target.value })}
            />
            <button
              type="button"
              className="btn btn-small row-remove"
              aria-label={`Remove exposure ${x.label}`}
              disabled={p.exposures.length <= 1}
              onClick={() =>
                save({
                  ...p,
                  exposures: p.exposures.filter((e) => e.id !== x.id),
                })
              }
            >
              ✕
            </button>
          </div>
          <div className="row-gap">
            <Seg
              label={`Exposure ${x.label} kind`}
              options={['boolean', 'enum', 'count']}
              value={x.kind}
              onChange={(kind) =>
                setExposure(x.id, {
                  kind: kind as Exposure['kind'],
                  options:
                    kind === 'enum'
                      ? x.options ?? ['none', 'some']
                      : undefined,
                })
              }
            />
            <Tick
              label="Protocol variable"
              checked={x.isProtocolVariable === true}
              onChange={(v) =>
                // only one exposure can be the protocol variable
                save({
                  ...p,
                  exposures: p.exposures.map((e) => ({
                    ...e,
                    isProtocolVariable:
                      e.id === x.id ? v : v ? false : e.isProtocolVariable,
                  })),
                })
              }
            />
          </div>
          {x.kind === 'enum' && (
            <input
              className="textinput"
              value={(x.options ?? []).join(', ')}
              aria-label={`Exposure ${x.label} options`}
              placeholder="none, light, heavy — first option means none"
              onChange={(e) =>
                setExposure(x.id, {
                  options: e.target.value.split(',').map((s) => s.trim()),
                })
              }
            />
          )}
        </div>
      ))}
      <button
        type="button"
        className="btn"
        onClick={() =>
          save({
            ...p,
            exposures: [
              ...p.exposures,
              { id: uid('x'), label: 'New exposure', kind: 'boolean' },
            ],
          })
        }
      >
        + Exposure
      </button>

      <h3 className="draft-subhead">{props.nums[0]}.3 Adherence checklist</h3>
      {p.adherence.map((a, i) => (
        <div key={a.id} className="draft-item">
          <div className="label-row label-row-full">
            <span className="field-code">A{i + 1}</span>
            <input
              className="textinput"
              value={a.label}
              aria-label={`Adherence item ${i + 1}`}
              onChange={(e) =>
                save({
                  ...p,
                  adherence: p.adherence.map((it) =>
                    it.id === a.id ? { ...it, label: e.target.value } : it
                  ),
                })
              }
            />
            <button
              type="button"
              className="btn btn-small row-remove"
              aria-label={`Remove adherence item ${i + 1}`}
              onClick={() =>
                save({
                  ...p,
                  adherence: p.adherence.filter((it) => it.id !== a.id),
                })
              }
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn"
        onClick={() =>
          save({
            ...p,
            adherence: [...p.adherence, { id: uid('a'), label: 'New item' }],
          })
        }
      >
        + Adherence item
      </button>

    </Section>

    <Section num={props.nums[1]} title="Pre-registration">
      <p className="hint">
        Predictions are locked before day 1 data exists and cannot be edited
        afterwards — by any path. To change them later you abandon this
        protocol and start a new one.
      </p>
      {p.metrics.map((m) => (
        <div key={m.id} className="draft-item">
          <div className="label-row">
            <span className="field-code">{m.code}</span>
            <span className="name">{m.name}</span>
          </div>
          <Seg
            grow
            label={`Prediction for ${m.name}`}
            options={['improves', 'no change', 'worsens']}
            value={predictions[m.id] ?? null}
            onChange={(v) =>
              setPredictions({ ...predictions, [m.id]: v as Prediction })
            }
          />
        </div>
      ))}
      <label className="draft-block">
        <span className="microlabel">ES — Effect size that counts as real</span>
        <textarea
          className="textinput"
          rows={2}
          value={effectSize}
          placeholder="e.g. a sustained shift of 1.5 points or more in the final two weeks"
          onChange={(e) => setEffectSize(e.target.value)}
        />
      </label>
      <label className="draft-block">
        <span className="microlabel">FA — Falsifier</span>
        <textarea
          className="textinput"
          rows={2}
          value={falsifier}
          placeholder="e.g. if drive and pleasure improve less than 1 point, the hypothesis is dropped"
          onChange={(e) => setFalsifier(e.target.value)}
        />
      </label>

      {!confirmLock ? (
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!lockable}
          onClick={() => setConfirmLock(true)}
        >
          Lock pre-registration
        </button>
      ) : (
        <div className="confirm-box">
          <p>
            Locking is permanent. The predictions, effect size and falsifier
            above are hashed; the fingerprint follows this protocol to the
            end. There is no edit path.
          </p>
          <div className="row-gap">
            <button type="button" className="btn btn-primary" onClick={lock}>
              Confirm lock
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setConfirmLock(false)}
            >
              Back
            </button>
          </div>
        </div>
      )}
      {!lockable && (
        <p className="hint">
          To lock: name the variable, predict every metric, state the effect
          size and the falsifier.
        </p>
      )}
    </Section>
    </>
  );
}

/* ------------------------------------------------------------------ */

function LockedDetail(props: {
  num: string;
  protocol: Protocol;
  onSave: (p: Protocol) => Promise<void>;
  say: (m: string) => void;
}) {
  const { protocol: p } = props;
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const predictions = p.prereg?.predictions ?? {};

  return (
    <Section num={props.num} title="Protocol record">
      {p.banner && <p className="notice">{p.banner}</p>}
      <table className="datatable">
        <tbody>
          <tr>
            <td>VARIABLE</td>
            <td>{p.variable}</td>
          </tr>
          <tr>
            <td>PERIOD</td>
            <td>
              {p.startDate} + {p.durationDays}D
            </td>
          </tr>
          <tr>
            <td>STATUS</td>
            <td>{p.status.toUpperCase()}</td>
          </tr>
          {p.prereg && (
            <>
              <tr>
                <td>LOCKED</td>
                <td>
                  {p.prereg.committedAt.slice(0, 10)} [{p.prereg.fingerprint}]
                </td>
              </tr>
              {p.metrics.map((m) => (
                <tr key={m.id}>
                  <td>{m.code} PREDICTED</td>
                  <td>{predictions[m.id] ?? '—'}</td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
      {p.prereg && (
        <>
          <p className="microlabel" style={{ marginTop: 12 }}>
            ES — effect size
          </p>
          <blockquote className="verdict-quote">
            {p.prereg.effectSize}
          </blockquote>
          <p className="microlabel" style={{ marginTop: 8 }}>
            FA — falsifier
          </p>
          <blockquote className="verdict-quote">{p.prereg.falsifier}</blockquote>
        </>
      )}

      {p.status === 'active' &&
        (!confirmAbandon ? (
          <button
            type="button"
            className="btn btn-danger"
            style={{ marginTop: 14 }}
            onClick={() => setConfirmAbandon(true)}
          >
            Abandon protocol
          </button>
        ) : (
          <div className="confirm-box">
            <p>
              Abandoning ends the trial now. The record and its data stay in
              the archive permanently. Start a new protocol for new
              predictions.
            </p>
            <div className="row-gap">
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  await props.onSave({ ...p, status: 'abandoned' });
                  setConfirmAbandon(false);
                  props.say('Protocol abandoned and archived.');
                }}
              >
                Confirm abandon
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmAbandon(false)}
              >
                Back
              </button>
            </div>
          </div>
        ))}
    </Section>
  );
}
