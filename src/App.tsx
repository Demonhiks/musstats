import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dataset, Period, Tab } from './types';
import { computeStats, filterPlays } from './lib/stats';
import { mergePlays, parseFiles } from './lib/parse';
import { loadDataset, saveDataset } from './lib/storage';
import { createDemoDataset } from './lib/demo';
import { formatNumber, plural } from './lib/format';
import { OverviewView } from './components/OverviewView';
import { TopsView } from './components/TopsView';
import { ActivityView } from './components/ActivityView';
import { YearView } from './components/YearView';
import { ImportView } from './components/ImportView';
import { Sheet } from './components/ui';
import { IconActivity, IconGear, IconOverview, IconPlus, IconTops, IconYear } from './components/icons';

const TAB_TITLES: Record<Tab, string> = {
  overview: 'Обзор',
  tops: 'Топы',
  activity: 'Активность',
  year: 'Итоги года',
};

const PERIODS: { value: Period; label: string; caption: string }[] = [
  { value: '7d', label: '7 дней', caption: 'за неделю' },
  { value: '30d', label: '30 дней', caption: 'за месяц' },
  { value: '90d', label: '90 дней', caption: 'за 3 месяца' },
  { value: '365d', label: 'Год', caption: 'за год' },
  { value: 'all', label: 'Всё', caption: 'за всё время' },
];

const TABS: { value: Tab; label: string; Icon: (props: { className?: string }) => JSX.Element }[] = [
  { value: 'overview', label: 'Обзор', Icon: IconOverview },
  { value: 'tops', label: 'Топы', Icon: IconTops },
  { value: 'activity', label: 'Активность', Icon: IconActivity },
  { value: 'year', label: 'Итоги', Icon: IconYear },
];

export default function App() {
  // ?demo=1 — режим витрины: демо-история считается сразу, в памяти, без записи в хранилище.
  const [demoMode] = useState(
    () => new URLSearchParams(window.location.search).get('demo') === '1',
  );
  const [dataset, setDataset] = useState<Dataset | null>(() => (demoMode ? createDemoDataset() : null));
  const [ready, setReady] = useState(demoMode);
  const [tab, setTab] = useState<Tab>(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    const known: Tab[] = ['overview', 'tops', 'activity', 'year'];
    return requested && known.includes(requested as Tab) ? (requested as Tab) : 'overview';
  });
  const [period, setPeriod] = useState<Period>('30d');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode) return;
    let alive = true;

    loadDataset()
      .then((loaded) => {
        if (!alive) return;
        setDataset(loaded);
        if (loaded && loaded.plays.length > 0) {
          const monthAgo = Date.now() - 30 * 86_400_000;
          const recent = loaded.plays.filter((play) => play.ts >= monthAgo).length;
          setPeriod(recent > 0 ? '30d' : 'all');
        }
        setReady(true);
      })
      .catch(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [demoMode]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(timer);
  }, [toast]);

  const persist = useCallback(
    async (next: Dataset | null) => {
      setDataset(next);
      if (demoMode) return;
      try {
        await saveDataset(next);
      } catch (error) {
        setToast(error instanceof Error ? error.message : 'Не удалось сохранить данные');
      }
    },
    [demoMode],
  );

  const filtered = useMemo(() => {
    if (!dataset) return [];
    if (period === 'all') return dataset.plays;
    return filterPlays(dataset.plays, period);
  }, [dataset, period]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);

  const periodCaption = PERIODS.find((item) => item.value === period)?.caption ?? '';

  const handleFiles = useCallback(
    async (files: File[]) => {
      setBusy(true);
      setImportMessage(null);
      try {
        const result = await parseFiles(files);
        if (result.plays.length === 0) {
          setImportMessage(
            result.notes[0] ??
              'Не нашёл прослушиваний. Нужен файл, где есть и дата, и название трека: ZIP из Яндекс ID, JSON или CSV.',
          );
          return;
        }

        const merged = dataset ? mergePlays(dataset.plays, result.plays) : result.plays;
        const added = merged.length - (dataset?.plays.length ?? 0);

        await persist({
          version: 1,
          updatedAt: Date.now(),
          source: result.format,
          plays: merged,
        });

        setImportOpen(false);
        setImportMessage(null);
        setToast(
          added > 0
            ? `Добавлено ${formatNumber(added)} ${plural(added, 'прослушивание', 'прослушивания', 'прослушиваний')}`
            : 'Все эти прослушивания уже были в базе',
        );
        const monthAgo = Date.now() - 30 * 86_400_000;
        setPeriod(merged.some((play) => play.ts >= monthAgo) ? '30d' : 'all');
      } catch (error) {
        setImportMessage(error instanceof Error ? error.message : 'Что-то пошло не так при разборе файла');
      } finally {
        setBusy(false);
      }
    },
    [dataset, persist],
  );

  const handleDemo = useCallback(async () => {
    setBusy(true);
    try {
      const demo = createDemoDataset();
      await persist(demo);
      setPeriod('30d');
      setImportOpen(false);
      setImportMessage(null);
      setToast('Загружены демо-данные — можно всё потыкать');
    } finally {
      setBusy(false);
    }
  }, [persist]);

  const handleClear = useCallback(async () => {
    if (!window.confirm('Удалить всю загруженную историю с этого устройства?')) return;
    await persist(null);
    setSettingsOpen(false);
    setTab('overview');
    setToast('Данные удалены');
  }, [persist]);

  const handleExport = useCallback(() => {
    if (!dataset) return;
    const payload = JSON.stringify(
      {
        version: dataset.version,
        updatedAt: dataset.updatedAt,
        source: dataset.source,
        plays: dataset.plays,
      },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'musstats-backup.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setToast('Копия сохранена в загрузки');
  }, [dataset]);

  if (!ready) {
    return (
      <div className="splash">
        <div className="splash__logo">
          <span>♫</span>
        </div>
        <span className="splash__text">MusStats</span>
      </div>
    );
  }

  const isEmpty = !dataset || dataset.plays.length === 0;

  return (
    <>
      <div className="app">
        <header className="topbar">
          <div className="topbar__inner">
            <div className="topbar__titles">
              <span className="topbar__brand">MusStats</span>
              <h1 className="topbar__title">{isEmpty ? 'Своя статистика' : TAB_TITLES[tab]}</h1>
            </div>
            <div className="topbar__actions">
              {!isEmpty ? (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => {
                    setImportMessage(null);
                    setImportOpen(true);
                  }}
                  aria-label="Добавить данные"
                >
                  <IconPlus />
                </button>
              ) : null}
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSettingsOpen(true)}
                aria-label="Настройки"
              >
                <IconGear />
              </button>
            </div>
          </div>
          {!isEmpty && tab !== 'year' ? (
            <div className="periods" role="tablist" aria-label="Период">
              {PERIODS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={item.value === period}
                  className={`chip ${item.value === period ? 'is-active' : ''}`}
                  onClick={() => setPeriod(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        <main className="content">
          {isEmpty ? (
            <div className="stack">
              <section className="intro">
                <h2>Вся твоя музыка — в цифрах</h2>
                <p>
                  Часы прослушивания, топ-артисты, календарь активности и карточка «итоги года», которой можно похвастаться.
                  Всё считается локально: файлы никуда не уходят.
                </p>
              </section>
              <ImportView
                onFiles={handleFiles}
                onDemo={handleDemo}
                busy={busy}
                message={importMessage}
              />
            </div>
          ) : (
            <>
              {tab === 'overview' ? <OverviewView stats={stats} label={periodCaption} /> : null}
              {tab === 'tops' ? <TopsView stats={stats} /> : null}
              {tab === 'activity' ? <ActivityView stats={stats} /> : null}
              {tab === 'year' ? <YearView plays={dataset.plays} /> : null}
            </>
          )}
        </main>

        {!isEmpty ? (
          <nav className="tabbar" aria-label="Разделы">
            {TABS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                className={`tabbar__item ${tab === value ? 'is-active' : ''}`}
                onClick={() => setTab(value)}
                aria-current={tab === value ? 'page' : undefined}
              >
                <Icon className="tabbar__icon" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        ) : null}
      </div>

      <Sheet open={importOpen} title="Добавить историю" onClose={() => setImportOpen(false)}>
        <ImportView onFiles={handleFiles} onDemo={handleDemo} busy={busy} message={importMessage} compact />
      </Sheet>

      <Sheet open={settingsOpen} title="Настройки" onClose={() => setSettingsOpen(false)}>
        <div className="settings">
          <div className="settings__row">
            <span>История</span>
            <b>
              {dataset
                ? `${formatNumber(dataset.plays.length)} ${plural(dataset.plays.length, 'запись', 'записи', 'записей')}`
                : 'пусто'}
            </b>
          </div>
          {dataset ? (
            <div className="settings__row">
              <span>Формат</span>
              <b>{dataset.source || '—'}</b>
            </div>
          ) : null}

          <button type="button" className="settings__btn" onClick={handleExport} disabled={!dataset}>
            Скачать копию (JSON)
          </button>
          <button
            type="button"
            className="settings__btn"
            onClick={() => {
              setSettingsOpen(false);
              setImportMessage(null);
              setImportOpen(true);
            }}
          >
            Добавить файлы
          </button>
          <button type="button" className="settings__btn" onClick={handleDemo} disabled={busy}>
            Перезалить демо-данные
          </button>
          <button type="button" className="settings__btn settings__btn--danger" onClick={handleClear} disabled={!dataset}>
            Удалить все данные
          </button>

          <p className="settings__about">
            MusStats 1.0 — приложение считает статистику прямо на устройстве. Данные не отправляются на серверы, история
            хранится в IndexedDB браузера. Чтобы приложение открывалось как обычное, добавь его на домашний экран iPhone:
            «Поделиться» → «На экран „Домой“».
          </p>
        </div>
      </Sheet>

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
