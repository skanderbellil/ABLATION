export type ScaleMetric = {
  id: string;
  code: string; // "M1" — short label used in charts, tables and exports
  name: string;
  hint: string; // anchors for both ends of the scale
  min: number; // default 1
  max: number; // default 10
  higherIsBetter: true; // enforced at creation — mixed directions are rejected
  color: string;
};

export type Exposure = {
  id: string;
  label: string;
  kind: 'boolean' | 'enum' | 'count';
  options?: string[]; // for enum; the first option means "none"
  unit?: string; // for count, e.g. "mg"
  isProtocolVariable?: boolean; // the thing being ablated
};

export type AdherenceItem = { id: string; label: string };

export type Prediction = 'improves' | 'no change' | 'worsens';

export type Prereg = {
  predictions: Record<string, Prediction>; // keyed by metric id
  effectSize: string; // free text: what magnitude counts as real
  falsifier: string; // free text: what result drops the hypothesis
  committedAt: string; // ISO
  fingerprint: string; // first 8 hex chars of SHA-256 over the canonical block
};

export type ProtocolStatus = 'draft' | 'active' | 'complete' | 'abandoned';

export type Protocol = {
  id: string;
  name: string;
  variable: string; // the single thing being removed or changed
  startDate: string; // YYYY-MM-DD, day 1
  durationDays: number;
  status: ProtocolStatus;
  metrics: ScaleMetric[];
  exposures: Exposure[];
  adherence: AdherenceItem[];
  trackSleep: boolean;
  banner?: string; // fixed notice shown wherever this protocol appears
  prereg: Prereg | null; // null until locked; immutable after
};

export type DayEntry = {
  protocolId: string;
  date: string; // YYYY-MM-DD — the day being scored
  scores: Record<string, number>; // keyed by metric id
  exposures: Record<string, boolean | string | number>; // keyed by exposure id
  adherence: Record<string, boolean>; // keyed by adherence item id
  sleep?: { bed: string; wake: string }; // "HH:MM"
  note?: string;
  loggedAt: string; // ISO — when the entry was first written; gap to date = recall lag
};

export type ExportBundle = {
  app: 'ablation';
  version: 1;
  exportedAt: string;
  protocols: Protocol[];
  entries: Record<string, DayEntry[]>; // keyed by protocol id
};
