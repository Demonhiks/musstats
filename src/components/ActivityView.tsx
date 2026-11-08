import type { Stats } from '../types';
import { Card, CardHead, Empty } from './ui';
import { Bars, Heatmap } from './charts';
import { formatHour, formatNumber, plural } from '../lib/format';
import { weekdayName } from '../lib/stats';

const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => (hour % 3 === 0 ? String(hour).padStart(2, '0') : ''));
const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function ActivityView({ stats }: { stats: Stats }) {
  if (stats.plays === 0) {
    return <Empty icon="🗓" title="Календарь пуст" text="За этот период прослушиваний нет." />;
  }

  const night = stats.byHour.slice(0, 6).reduce((sum, value) => sum + value, 0);
  const evening = stats.byHour.slice(18, 24).reduce((sum, value) => sum + value, 0);
  const nightShare = Math.round((night / stats.plays) * 100);

  return (
    <div className="stack">
      <Card>
        <CardHead action={<span className="muted small">{formatNumber(stats.plays)} всего</span>}>
          Календарь активности
        </CardHead>
        <Heatmap days={stats.byDay} />
        <div className="legend">
          <span>меньше</span>
          <span className="legend__cell" style={{ background: '#1B1B24' }} />
          <span className="legend__cell" style={{ background: '#3D3313' }} />
          <span className="legend__cell" style={{ background: '#6C5A12' }} />
          <span className="legend__cell" style={{ background: '#B08C1B' }} />
          <span className="legend__cell" style={{ background: '#FFD84D' }} />
          <span>больше</span>
        </div>
      </Card>

      <Card>
        <CardHead action={<span className="muted small">пик {formatHour(stats.busiestHour)}</span>}>
          По часам
        </CardHead>
        <Bars
          values={stats.byHour}
          labels={HOUR_LABELS}
          highlight={stats.busiestHour}
          formatValue={(value) => `${formatNumber(value)} прослушиваний`}
        />
        <p className="note">
          Ночью, с 00:00 до 06:00, — {nightShare}% всех прослушиваний
          {nightShare > 25 ? ', полуночник 🦉' : nightShare < 8 ? ', жаворонок ☀️' : ''}. Вечером (18:00–00:00) —{' '}
          {formatNumber(evening)}.
        </p>
      </Card>

      <Card>
        <CardHead action={<span className="muted small">{weekdayName(stats.busiestWeekday)} — топ</span>}>
          По дням недели
        </CardHead>
        <Bars values={stats.byWeekday} labels={WEEKDAY_LABELS} highlight={stats.busiestWeekday} />
      </Card>

      <div className="grid-2">
        <Card className="fact">
          <span className="fact__label">Серия сейчас</span>
          <span className="fact__value">
            {stats.currentStreak}
            <span className="fact__unit"> {plural(stats.currentStreak, 'день', 'дня', 'дней')}</span>
          </span>
          <span className="fact__hint">дней подряд с музыкой</span>
        </Card>
        <Card className="fact">
          <span className="fact__label">Рекорд</span>
          <span className="fact__value">
            {stats.streak}
            <span className="fact__unit"> {plural(stats.streak, 'день', 'дня', 'дней')}</span>
          </span>
          <span className="fact__hint">самая длинная серия</span>
        </Card>
      </div>
    </div>
  );
}
