import type { DayEntry } from '../types';

export function emptyEntry(protocolId: string, date: string): DayEntry {
  return {
    protocolId,
    date,
    scores: {},
    exposures: {},
    adherence: {},
    loggedAt: new Date().toISOString(),
  };
}
