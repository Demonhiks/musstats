import { useState } from 'react';
import type { Stats } from '../types';
import { Card, Empty, Progress, Segmented } from './ui';
import { formatNumber, percent, plural } from '../lib/format';

type TopKind = 'artists' | 'tracks' | 'albums';

const OPTIONS = [
  { value: 'artists' as TopKind, label: 'Артисты' },
  { value: 'tracks' as TopKind, label: 'Треки' },
  { value: 'albums' as TopKind, label: 'Альбомы' },
];

export function TopsView({ stats }: { stats: Stats }) {
  const [kind, setKind] = useState<TopKind>('artists');

  if (stats.plays === 0) {
    return (
      <Empty icon="📈" title="Нет данных за период" text="Выбери другой период в шапке, чтобы увидеть топы." />
    );
  }

  const rows =
    kind === 'artists'
      ? stats.topArtists.slice(0, 30).map((item) => ({
          key: item.name,
          title: item.name,
          subtitle: `${formatNumber(item.plays)} ${plural(item.plays, 'прослушивание', 'прослушивания', 'прослушиваний')}`,
          plays: item.plays,
          share: item.share,
        }))
      : kind === 'tracks'
        ? stats.topTracks.slice(0, 30).map((item) => ({
            key: item.key,
            title: item.title,
            subtitle: item.artist,
            plays: item.plays,
            share: item.plays / stats.plays,
          }))
        : stats.topAlbums.slice(0, 30).map((item) => ({
            key: item.key,
            title: item.album,
            subtitle: item.artist,
            plays: item.plays,
            share: item.plays / stats.plays,
          }));

  const max = rows[0]?.plays ?? 1;

  return (
    <div className="stack">
      <Segmented options={OPTIONS} value={kind} onChange={setKind} label="Что показывать" />

      <Card className="flush">
        <ol className="rank rank--large">
          {rows.map((row, index) => (
            <li className="rank__row" key={row.key}>
              <span className={`rank__index ${index < 3 ? 'rank__index--top' : ''}`}>{index + 1}</span>
              <div className="rank__body">
                <div className="rank__line">
                  <span className="rank__title" title={row.title}>
                    {row.title}
                  </span>
                  <span className="rank__value">{formatNumber(row.plays)}</span>
                </div>
                <div className="rank__meta">
                  <span className="rank__subtitle" title={row.subtitle}>
                    {row.subtitle}
                  </span>
                  <span className="rank__share">{percent(row.share)}</span>
                </div>
                <Progress value={row.plays} max={max} tone={kind === 'artists' ? 'accent' : 'violet'} />
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
