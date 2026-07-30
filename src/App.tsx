import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DayEntry, Protocol } from './types';
import {
  getActiveProtocolId,
  LocalStore,
  setActiveProtocolId,
} from './store/store';
import { addDays, todayStr } from './lib/dates';
import { Masthead } from './components/Masthead';
import { Today } from './screens/Today';
import { Trends } from './screens/Trends';
import { Verdict } from './screens/Verdict';
import { Protocols } from './screens/Protocols';

type View = 'today' | 'trends' | 'verdict' | 'protocols';

const store = new LocalStore();

export default function App() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [view, setView] = useState<View>('today');
  const [loaded, setLoaded] = useState(false);
  const [persistFailed, setPersistFailed] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    store.onPersistError = setPersistFailed;
    (async () => {
      let list = await store.getProtocols();
      // Trials whose window has passed are complete — flip lazily on load.
      const today = todayStr();
      for (const p of list) {
        if (
          p.status === 'active' &&
          today >= addDays(p.startDate, p.durationDays)
        ) {
          await store.saveProtocol({ ...p, status: 'complete' });
        }
      }
      list = await store.getProtocols();
      setProtocols(list);
      const remembered = getActiveProtocolId();
      const pick =
        list.find((p) => p.id === remembered) ??
        list.find((p) => p.status === 'active') ??
        list[0] ??
        null;
      setActiveId(pick?.id ?? null);
      if (!pick) setView('protocols');
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!activeId) {
      setEntries([]);
      return;
    }
    store.getEntries(activeId).then(setEntries);
  }, [activeId]);

  const active = useMemo(
    () => protocols.find((p) => p.id === activeId) ?? null,
    [protocols, activeId]
  );

  const saveProtocol = useCallback(async (p: Protocol) => {
    await store.saveProtocol(p);
    setProtocols(await store.getProtocols());
  }, []);

  const selectProtocol = useCallback((id: string) => {
    setActiveId(id);
    setActiveProtocolId(id);
  }, []);

  const saveEntry = useCallback(
    (e: DayEntry) => {
      store.saveEntry(e);
      setEntries((prev) => {
        const i = prev.findIndex((x) => x.date === e.date);
        const next =
          i >= 0 ? prev.map((x) => (x.date === e.date ? e : x)) : [...prev, e];
        return next.sort((a, b) => (a.date < b.date ? -1 : 1));
      });
      setLastSavedAt(
        new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    },
    []
  );

  const importAll = useCallback(async (json: string) => {
    await store.importAll(json);
    const list = await store.getProtocols();
    setProtocols(list);
    const pick = list.find((p) => p.status === 'active') ?? list[0] ?? null;
    setActiveId(pick?.id ?? null);
    if (pick) {
      setActiveProtocolId(pick.id);
      setEntries(await store.getEntries(pick.id));
    } else {
      setEntries([]);
    }
  }, []);

  if (!loaded) return null;

  const needProtocol = (
    <p className="empty">
      No protocol selected. Open PROTOCOL and start one from a template.
    </p>
  );

  return (
    <>
      <Masthead protocol={active} />
      {persistFailed && (
        <div className="warnbar" role="alert">
          STORAGE UNAVAILABLE. Entries are held in memory and will be lost
          when this tab closes. Leave private browsing or free up space, then
          reload.
        </div>
      )}

      <main>
        {view === 'today' &&
          (active ? (
            <Today
              key={active.id}
              protocol={active}
              entries={entries}
              onSave={saveEntry}
              lastSavedAt={lastSavedAt}
              persistFailed={persistFailed}
            />
          ) : (
            needProtocol
          ))}
        {view === 'trends' &&
          (active ? (
            <Trends protocol={active} entries={entries} />
          ) : (
            needProtocol
          ))}
        {view === 'verdict' &&
          (active ? (
            <Verdict protocol={active} entries={entries} />
          ) : (
            needProtocol
          ))}
        {view === 'protocols' && (
          <Protocols
            protocols={protocols}
            activeId={activeId}
            onSelect={selectProtocol}
            onSaveProtocol={saveProtocol}
            getEntries={(pid) => store.getEntries(pid)}
            exportAll={() => store.exportAll()}
            importAll={importAll}
          />
        )}
      </main>

      <nav className="nav" aria-label="Screens">
        <div className="nav-inner">
          {(
            [
              ['today', 'Today'],
              ['trends', 'Trends'],
              ['verdict', 'Verdict'],
              ['protocols', 'Protocol'],
            ] as [View, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              className="navbtn"
              aria-current={view === v}
              onClick={() => setView(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
