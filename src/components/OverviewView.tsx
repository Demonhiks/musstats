import type { Stats } from '../types';
import { Card, CardHead, Empty, Progress, Stat } from './ui';
import { AreaChart, bucket } from './charts';
import {
  formatDate,
  formatDuration,
  formatHour,
  formatHoursShort,
  formatNumber,
  plural,
  relativeDay,
} from '../lib/format';
import { weekdayName } from '../lib/stats';

export function OverviewView({ stats, label }: { stats: Stats; label: string }) {
  if (stats.plays === 0) {
    return (
      <Empty
        icon="🎧"
        title="Здесь пока тихо"
        text="За выбранный период нет прослушиваний. Попробуй другой период — или загрузи историю посвежее."
      />
    );
  }

  const hours = formatHoursShort(stats.durationMs);
  const series = bucket(stats.byDay.map((day) => day.plays), 45);
  const periodDays = Math.max(1, Math.round((stats.lastTs - stats.firstTs) / 86_400_000) + 1);
  const granularity = periodDays > 120 ? 'по неделям' : 'по дням';

  return (
    <div className="stack">
      <Card className="hero">
        <span className="hero__eyebrow">{label}</span>
        <div className="hero__value">
          {hours.value}
          <span className="hero__unit">{hours.unit}</span>
        </div>
        <p className="hero__caption">
          {formatDuration(stats.durationMs)} музыки · {formatNumber(stats.plays)}{' '}
          {plural(stats.plays, 'прослушивание', 'прослушивания', 'прослушиваний')}
        </p>
        <div className="hero__grid">
          <Stat label="артистов" value={formatNumber(stats.artists)} />
          <Stat label="треков" value={formatNumber(stats.tracks)} />
          <Stat label="альбомов" value={formatNumber(stats.albums)} />
        </div>
      </Card>

      <Card>
        <CardHead action={<span className="muted small">{granularity}</span>}>Динамика</CardHead>
        <AreaChart values={series} label="График прослушиваний" />
        <div className="chart-foot">
          <span>{relativeDay(stats.firstTs)}</span>
          <span>в среднем {formatNumber(stats.perActiveDay)} в день</span>
          <span>{relativeDay(stats.lastTs)}</span>
        </div>
      </Card>

      <Card>
        <CardHead>Топ-артисты</CardHead>
        <ol className="rank">
          {stats.topArtists.slice(0, 5).map((artist, index) => (
            <li className="rank__row" key={artist.name}>
              <span className="rank__index">{index + 1}</span>
              <div className="rank__body">
                <div className="rank__line">
                  <span className="rank__title" title={artist.name}>
                    {artist.name}
                  </span>
                  <span className="rank__value">{formatNumber(artist.plays)}</span>
                </div>
                <Progress value={artist.plays} max={stats.topArtists[0]?.plays ?? 1} />
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid-2">
        <Card className="fact">
          <span className="fact__label">Пиковый день</span>
          <span className="fact__value">{stats.busiestDay ? formatNumber(stats.busiestDay.plays) : '—'}</span>
          <span className="fact__hint">
            {stats.busiestDay ? formatDate(stats.busiestDay.ts) : 'нет данных'}
          </span>
        </Card>
        <Card className="fact">
          <span className="fact__label">Любимое время</span>
          <span className="fact__value">{formatHour(stats.busiestHour)}</span>
          <span className="fact__hint">чаще всего {weekdayName(stats.busiestWeekday).toLowerCase()}</span>
        </Card>
        <Card className="fact">
          <span className="fact__label">Серия сейчас</span>
          <span className="fact__value">
            {stats.currentStreak}
            <span className="fact__unit"> {plural(stats.currentStreak, 'день', 'дня', 'дней')}</span>
          </span>
          <span className="fact__hint">подряд с музыкой</span>
        </Card>
        <Card className="fact">
          <span className="fact__label">Рекорд серии</span>
          <span className="fact__value">
            {stats.streak}
            <span className="fact__unit"> {plural(stats.streak, 'день', 'дня', 'дней')}</span>
          </span>
          <span className="fact__hint">самая длинная</span>
        </Card>
      </div>
    </div>
  );
}
