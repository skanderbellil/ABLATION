import type { DayEntry, ExportBundle, Protocol } from '../types';

export interface Store {
  getProtocols(): Promise<Protocol[]>;
  saveProtocol(p: Protocol): Promise<void>;
  getEntries(protocolId: string): Promise<DayEntry[]>;
  saveEntry(e: DayEntry): Promise<void>;
  exportAll(): Promise<string>; // JSON
  importAll(json: string): Promise<void>;
}

const NS = 'ablation:v1:';
const K_PROTOCOLS = NS + 'protocols';
const K_ACTIVE = NS + 'activeProtocol';
const kEntries = (pid: string) => NS + 'entries:' + pid;

// UI preference, not trial data — kept here so localStorage access
// stays out of components.
export function getActiveProtocolId(): string | null {
  try {
    return localStorage.getItem(K_ACTIVE);
  } catch {
    return null;
  }
}

export function setActiveProtocolId(id: string): void {
  try {
    localStorage.setItem(K_ACTIVE, id);
  } catch {
    // preference only; losing it is harmless
  }
}

/**
 * localStorage-backed store with a full in-memory mirror. Every write goes to
 * memory first, then attempts to persist; Safari private mode throws on
 * setItem and that must never blank the app. `onPersistError` fires when a
 * write could not be persisted so the UI can show a warning bar.
 */
export class LocalStore implements Store {
  private cache = new Map<string, unknown>();
  onPersistError: ((failed: boolean) => void) | null = null;
  persistFailed = false;

  private read<T>(key: string, fallback: T): T {
    if (this.cache.has(key)) return this.cache.get(key) as T;
    try {
      const raw = localStorage.getItem(key);
      const val = raw === null ? fallback : (JSON.parse(raw) as T);
      this.cache.set(key, val);
      return val;
    } catch {
      this.cache.set(key, fallback);
      return fallback;
    }
  }

  private write(key: string, value: unknown): void {
    this.cache.set(key, value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
      if (this.persistFailed) {
        this.persistFailed = false;
        this.onPersistError?.(false);
      }
    } catch {
      if (!this.persistFailed) {
        this.persistFailed = true;
        this.onPersistError?.(true);
      }
    }
  }

  async getProtocols(): Promise<Protocol[]> {
    return this.read<Protocol[]>(K_PROTOCOLS, []);
  }

  async saveProtocol(p: Protocol): Promise<void> {
    const all = await this.getProtocols();
    const i = all.findIndex((x) => x.id === p.id);
    const existing = i >= 0 ? all[i] : null;
    // Immutability of the pre-registration is enforced at the storage
    // boundary, not just in the UI: once locked, the stored block wins.
    const next: Protocol =
      existing?.prereg != null ? { ...p, prereg: existing.prereg } : p;
    const list = i >= 0 ? all.map((x) => (x.id === p.id ? next : x)) : [...all, next];
    this.write(K_PROTOCOLS, list);
  }

  async getEntries(protocolId: string): Promise<DayEntry[]> {
    return this.read<DayEntry[]>(kEntries(protocolId), []);
  }

  async saveEntry(e: DayEntry): Promise<void> {
    const all = await this.getEntries(e.protocolId);
    const i = all.findIndex((x) => x.date === e.date);
    const list = i >= 0 ? all.map((x) => (x.date === e.date ? e : x)) : [...all, e];
    list.sort((a, b) => (a.date < b.date ? -1 : 1));
    this.write(kEntries(e.protocolId), list);
  }

  async exportAll(): Promise<string> {
    const protocols = await this.getProtocols();
    const entries: Record<string, DayEntry[]> = {};
    for (const p of protocols) entries[p.id] = await this.getEntries(p.id);
    const bundle: ExportBundle = {
      app: 'ablation',
      version: 1,
      exportedAt: new Date().toISOString(),
      protocols,
      entries,
    };
    return JSON.stringify(bundle, null, 2);
  }

  async importAll(json: string): Promise<void> {
    const bundle = JSON.parse(json) as ExportBundle;
    if (bundle.app !== 'ablation' || bundle.version !== 1) {
      throw new Error('Not an ABLATION v1 export.');
    }
    if (!Array.isArray(bundle.protocols)) {
      throw new Error('Export is missing the protocols array.');
    }
    this.write(K_PROTOCOLS, bundle.protocols);
    for (const p of bundle.protocols) {
      this.write(kEntries(p.id), bundle.entries?.[p.id] ?? []);
    }
  }
}
