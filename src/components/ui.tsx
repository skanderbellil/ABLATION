import type { ReactNode } from 'react';

export function Section(props: {
  num: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <div className="section-head">
        <span className="section-num" aria-hidden="true">
          {props.num}
        </span>
        <h2 className="section-title">{props.title}</h2>
      </div>
      {props.children}
    </section>
  );
}

/** Segmented control: real buttons with aria-pressed. */
export function Seg(props: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (v: string) => void;
  grow?: boolean; // fill the row width — easier to tap
}) {
  return (
    <div
      className={props.grow ? 'seg seg-grow' : 'seg'}
      role="group"
      aria-label={props.label}
    >
      {props.options.map((opt) => (
        <button
          key={opt}
          type="button"
          className="segbtn"
          aria-pressed={props.value === opt}
          aria-label={`${props.label}: ${opt}`}
          onClick={() => props.onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function Tick(props: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="tick"
      aria-pressed={props.checked}
      onClick={() => props.onChange(!props.checked)}
    >
      <span className="tickbox" aria-hidden="true">
        {props.checked ? '✕' : ''}
      </span>
      <span>{props.label}</span>
    </button>
  );
}

export function Stepper(props: {
  label: string;
  value: number | null;
  unit?: string;
  step?: number;
  onChange: (v: number) => void;
}) {
  const step = props.step ?? 1;
  const v = props.value;
  return (
    <div className="stepper" role="group" aria-label={props.label}>
      <button
        type="button"
        aria-label={`${props.label}: decrease`}
        onClick={() => props.onChange(Math.max(0, (v ?? 0) - step))}
      >
        −
      </button>
      <span className="stepval" aria-live="polite">
        {v === null ? '—' : v}
        {props.unit && v !== null ? ` ${props.unit}` : ''}
      </span>
      <button
        type="button"
        aria-label={`${props.label}: increase`}
        onClick={() => props.onChange((v ?? 0) + step)}
      >
        +
      </button>
    </div>
  );
}

/** Row of tappable numbered boxes — not a slider. */
export function ScoreRow(props: {
  label: string;
  min: number;
  max: number;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const boxes = [];
  for (let n = props.min; n <= props.max; n++) boxes.push(n);
  return (
    <div className="scorerow" role="group" aria-label={props.label}>
      {boxes.map((n) => (
        <button
          key={n}
          type="button"
          className="scorebox"
          aria-pressed={props.value === n}
          aria-label={`${props.label}: ${n}`}
          onClick={() => props.onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
