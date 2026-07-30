import type { Protocol } from '../types';
import { todayStr } from '../lib/dates';

// Protocols are data. This is the only file in src/ that may name a
// specific substance or behaviour.

export type Template = {
  id: string;
  title: string;
  summary: string;
  banner?: string; // fixed notice shown wherever this protocol appears
  make: () => Protocol;
};

let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

const M = (
  code: string,
  name: string,
  hint: string,
  color: string
) => ({
  id: uid('m'),
  code,
  name,
  hint,
  min: 1,
  max: 10,
  higherIsBetter: true as const,
  color,
});

export const TEMPLATES: Template[] = [
  {
    id: 'cannabis-washout',
    title: 'Cannabis washout',
    summary:
      '42 days. Morning energy, pleasure response, drive, evenness, sleep quality.',
    make: () => ({
      id: uid('p'),
      name: 'Cannabis washout',
      variable: 'daily cannabis',
      startDate: todayStr(),
      durationDays: 42,
      status: 'draft',
      metrics: [
        M('M1', 'Morning energy', '1 = leaden on waking · 10 = up without negotiation', '#24406B'),
        M('M2', 'Pleasure response', '1 = nothing lands · 10 = ordinary things register', '#4A6B3C'),
        M('M3', 'Drive / initiation', '1 = cannot start anything · 10 = start without friction', '#8A6D1F'),
        M('M4', 'Evenness', '1 = volatile all day · 10 = steady under provocation', '#5B4A6B'),
        M('M5', 'Sleep quality', '1 = broken, unrefreshing · 10 = woke restored', '#A8321E'),
      ],
      exposures: [
        {
          id: uid('x'),
          label: 'Cannabis',
          kind: 'boolean',
          isProtocolVariable: true,
        },
        {
          id: uid('x'),
          label: 'Nicotine',
          kind: 'enum',
          options: ['none', 'light', 'heavy'],
        },
        { id: uid('x'), label: 'Alcohol', kind: 'boolean' },
      ],
      adherence: [
        { id: uid('a'), label: 'Daylight within 20 min of waking' },
        { id: uid('a'), label: 'Stimulant taken at alarm' },
        { id: uid('a'), label: 'Exercise' },
      ],
      trackSleep: true,
      prereg: null,
    }),
  },
  {
    id: 'alcohol-reduction',
    title: 'Alcohol reduction',
    summary: '28 days. Same metric set as the washout protocol.',
    make: () => ({
      id: uid('p'),
      name: 'Alcohol reduction',
      variable: 'alcohol',
      startDate: todayStr(),
      durationDays: 28,
      status: 'draft',
      metrics: [
        M('M1', 'Morning energy', '1 = leaden on waking · 10 = up without negotiation', '#24406B'),
        M('M2', 'Pleasure response', '1 = nothing lands · 10 = ordinary things register', '#4A6B3C'),
        M('M3', 'Drive / initiation', '1 = cannot start anything · 10 = start without friction', '#8A6D1F'),
        M('M4', 'Evenness', '1 = volatile all day · 10 = steady under provocation', '#5B4A6B'),
        M('M5', 'Sleep quality', '1 = broken, unrefreshing · 10 = woke restored', '#A8321E'),
      ],
      exposures: [
        {
          id: uid('x'),
          label: 'Alcohol',
          kind: 'boolean',
          isProtocolVariable: true,
        },
      ],
      adherence: [
        { id: uid('a'), label: 'Daylight within 20 min of waking' },
        { id: uid('a'), label: 'Exercise' },
      ],
      trackSleep: true,
      prereg: null,
    }),
  },
  {
    id: 'phone-video',
    title: 'Phone and short-form video',
    summary: '21 days. Sustained attention, evening calm, sleep quality, drive.',
    make: () => ({
      id: uid('p'),
      name: 'Phone and short-form video',
      variable: 'short-form video',
      startDate: todayStr(),
      durationDays: 21,
      status: 'draft',
      metrics: [
        M('M1', 'Sustained attention', '1 = cannot hold a page · 10 = long unbroken stretches', '#24406B'),
        M('M2', 'Evening calm', '1 = wired, restless · 10 = settled by 21:00', '#4A6B3C'),
        M('M3', 'Sleep quality', '1 = broken, unrefreshing · 10 = woke restored', '#A8321E'),
        M('M4', 'Drive / initiation', '1 = cannot start anything · 10 = start without friction', '#8A6D1F'),
      ],
      exposures: [
        {
          id: uid('x'),
          label: 'Short-form video sessions',
          kind: 'count',
          isProtocolVariable: true,
        },
        { id: uid('x'), label: 'Phone in bedroom', kind: 'boolean' },
      ],
      adherence: [],
      trackSleep: true,
      prereg: null,
    }),
  },
  {
    id: 'medication-change',
    title: 'Medication change',
    summary:
      '56 days — antidepressant changes take that long to read. Dose recorded in mg.',
    banner:
      'Changes to prescribed medication belong with the prescriber. This protocol records the outcome; it does not guide the decision.',
    make: () => ({
      id: uid('p'),
      name: 'Medication change',
      variable: 'medication dose',
      startDate: todayStr(),
      durationDays: 56,
      status: 'draft',
      metrics: [
        M('M1', 'Pleasure response', '1 = nothing lands · 10 = ordinary things register', '#4A6B3C'),
        M('M2', 'Drive / initiation', '1 = cannot start anything · 10 = start without friction', '#8A6D1F'),
        M('M3', 'Evenness', '1 = volatile all day · 10 = steady under provocation', '#5B4A6B'),
        M('M4', 'Anxiety-free', '1 = constant background alarm · 10 = quiet all day', '#24406B'),
        M('M5', 'Sleep quality', '1 = broken, unrefreshing · 10 = woke restored', '#A8321E'),
      ],
      exposures: [
        {
          id: uid('x'),
          label: 'Dose',
          kind: 'count',
          unit: 'mg',
          isProtocolVariable: true,
        },
      ],
      adherence: [],
      trackSleep: true,
      banner:
        'Changes to prescribed medication belong with the prescriber. This protocol records the outcome; it does not guide the decision.',
      prereg: null,
    }),
  },
];

/** Empty protocol for building from scratch. */
export function blankProtocol(): Protocol {
  return {
    id: uid('p'),
    name: 'Untitled protocol',
    variable: '',
    startDate: todayStr(),
    durationDays: 28,
    status: 'draft',
    metrics: [
      M('M1', 'Metric 1', '1 = worst · 10 = best', '#24406B'),
    ],
    exposures: [
      {
        id: uid('x'),
        label: 'Protocol variable',
        kind: 'boolean',
        isProtocolVariable: true,
      },
    ],
    adherence: [],
    trackSleep: true,
    prereg: null,
  };
}

export const METRIC_COLORS = [
  '#24406B',
  '#4A6B3C',
  '#8A6D1F',
  '#5B4A6B',
  '#A8321E',
  '#1B1F1A',
];

// Metric names that run the wrong way. All metrics must be higher-is-better;
// creation UI uses this to prompt an inversion (e.g. irritability → evenness).
const NEGATIVE_METRIC_WORDS =
  /\b(irritab|anxiet|anxious|pain|stress|fatigue|anger|angry|depress|craving|insomnia|worry|sad|low|brain ?fog|nausea|restless)/i;

export function looksInverted(name: string): boolean {
  // "anxiety-free", "pain-free" etc. are already the positive pole
  if (/free|without|absence|-less|\bno\b/i.test(name)) return false;
  return NEGATIVE_METRIC_WORDS.test(name);
}
