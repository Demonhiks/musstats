import { useMemo, useRef, useState } from 'react';
import type { Period, Play } from '../types';
import { availableYears, computeStats, filterPlays, weekdayName } from '../lib/stats';
import { Card, Empty } from './ui';
import { formatDuration, formatHoursShort, formatNumber, formatShortDate, monthFull, plural } from '../lib/format';
import { renderYearCard, shareYearCard, type YearCardInput } from '../lib/yearCard';

interface YearData {
  stats: ReturnType<typeof computeStats>;
  months: number[];
  input: YearCardInput;
}

export function YearView({ plays }: { plays: Play[] }) {
  const years = useMemo(() => availableYears(plays), [plays]);
  const [pickedYear, setPickedYear] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeYear = pickedYear ?? years[0] ?? new Date().getFullYear();

  const data = useMemo<YearData>(() => {
    const yearPlays = filterPlays(plays, `y${activeYear}` as Period);
    const stats = computeStats(yearPlays);
    const months = new Array(12).fill(0) as number[];
    for (const play of yearPlays) months[new Date(play.ts).getMonth()] += 1;

    const input: YearCardInput = {
      year: activeYear,
      plays: stats.plays,
      durationMs: stats.durationMs,
      artists: stats.artists,
      tracks: stats.tracks,
      topArtists: stats.topArtists.slice(0, 5).map((artist) => ({ name: artist.name, plays: artist.plays })),
      topTrack: stats.topTracks[0]
        ? { title: stats.topTracks[0].title, artist: stats.topTracks[0].artist, plays: stats.topTracks[0].plays }
        : undefined,
      busiestDay: stats.busiestDay
        ? { label: formatShortDate(stats.busiestDay.ts), plays: stats.busiestDay.plays }
        : undefined,
      months,
    };
    return { stats, months, input };
  }, [plays, activeYear]);

  const hours = formatHoursShort(data.stats.durationMs);
  const maxMonth = Math.max(1, ...data.months);

  const handleShare = async () => {
    setBusy(true);
    setStatus('');
    try {
      const canvas = canvasRef.current ?? document.createElement('canvas');
      renderYearCard(canvas, data.input);
      const result = await shareYearCard(canvas, `musstats-${activeYear}.png`);
      setStatus(
        result === 'shared'
          ? 'Готово — картинка ушла в «Поделиться»'
          : result === 'downloaded'
            ? 'Картинка сохранена в «Файлы» / «Загрузки»'
            : '',
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не получилось собрать картинку');
    } finally {
      setBusy(false);
    }
  };

  if (years.length === 0) {
    return <Empty icon="🏆" title="Нет итогов" text="Загрузи историю прослушиваний, и здесь появится карточка года." />;
  }

  if (data.stats.plays === 0) {
    return (
      <div className="stack">
        <YearChips years={years} active={activeYear} onPick={setPickedYear} />
        <Empty icon="🗓" title={`За ${activeYear} год пусто`} text="Выбери другой год или загрузи более свежие данные." />
      </div>
    );
  }

  return (
    <div className="stack">
      <YearChips years={years} active={activeYear} onPick={setPickedYear} />

      <Card className="yearcard">
        <div className="yearcard__top">
          <span className="yearcard__brand">ИТОГИ ГОДА</span>
          <span className="yearcard__year">{activeYear}</span>
        </div>

        <div className="yearcard__hours">
          {hours.value}
          <span>{hours.unit}</span>
          <em>музыки за год</em>
        </div>

        <div className="yearcard__metrics">
          <div>
            <b>{formatNumber(data.stats.plays)}</b>
            <span>прослушиваний</span>
          </div>
          <div>
            <b>{formatNumber(data.stats.artists)}</b>
            <span>артистов</span>
          </div>
          <div>
            <b>{formatNumber(data.stats.tracks)}</b>
            <span>треков</span>
          </div>
        </div>

        <div className="yearcard__section">Топ-артисты</div>
        <ol className="yearcard__list">
          {data.stats.topArtists.slice(0, 5).map((artist, index) => (
            <li key={artist.name}>
              <span className="yearcard__rank">{index + 1}</span>
              <span className="yearcard__name">{artist.name}</span>
              <span className="yearcard__plays">{formatNumber(artist.plays)}</span>
            </li>
          ))}
        </ol>

        <div className="yearcard__months" aria-hidden="true">
          {data.months.map((value, index) => (
            <div className="yearcard__month" key={index}>
              <span className="yearcard__track">
                <i
                  style={{ height: `${Math.max(6, (value / maxMonth) * 100)}%` }}
                  className={value === maxMonth ? 'is-max' : ''}
                />
              </span>
              <span className="yearcard__mname">{monthFull(index).slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {data.stats.busiestDay ? (
          <p className="yearcard__foot">
            Самый громкий день — {formatShortDate(data.stats.busiestDay.ts)}: {formatNumber(data.stats.busiestDay.plays)}{' '}
            {plural(data.stats.busiestDay.plays, 'прослушивание', 'прослушивания', 'прослушиваний')}
          </p>
        ) : null}
      </Card>

      <button type="button" className="primary-btn" onClick={handleShare} disabled={busy}>
        {busy ? 'Собираю картинку…' : 'Поделиться карточкой'}
      </button>
      {status ? <p className="note note--center">{status}</p> : null}

      <Card>
        <div className="yearcard__section yearcard__section--plain">Детали {activeYear}</div>
        <ul className="details">
          <li>
            <span>Всего прослушано</span>
            <b>{formatDuration(data.stats.durationMs)}</b>
          </li>
          <li>
            <span>Топ-трек года</span>
            <b>{data.stats.topTracks[0] ? `${data.stats.topTracks[0].title} — ${data.stats.topTracks[0].artist}` : '—'}</b>
          </li>
          <li>
            <span>Топ-альбом</span>
            <b>{data.stats.topAlbums[0] ? data.stats.topAlbums[0].album : '—'}</b>
          </li>
          <li>
            <span>Самый активный день недели</span>
            <b>{weekdayName(data.stats.busiestWeekday)}</b>
          </li>
          <li>
            <span>Первый прослушанный день</span>
            <b>{formatShortDate(data.stats.firstTs)}</b>
          </li>
        </ul>
      </Card>

      <canvas ref={canvasRef} className="hidden-canvas" aria-hidden="true" />
    </div>
  );
}

function YearChips({
  years,
  active,
  onPick,
}: {
  years: number[];
  active: number;
  onPick: (year: number) => void;
}) {
  return (
    <div className="chips" role="tablist" aria-label="Год">
      {years.map((year) => (
        <button
          key={year}
          type="button"
          role="tab"
          aria-selected={year === active}
          className={`chip ${year === active ? 'is-active' : ''}`}
          onClick={() => onPick(year)}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
